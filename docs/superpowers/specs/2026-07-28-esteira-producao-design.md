# Design — Esteira de Produção (um por vez)

> **Status:** aprovado no brainstorming de 28/07/2026, seção a seção.
> **Escopo v1:** copy + landing page publicada. Criativo e subida de campanha ficam
> para specs próprios.
> **Motor:** Claude Code (skills `copy` e `landing-page-vendas`).
> **Superfície de decisão:** o painel Next.js, que já funciona.

---

## 1. O problema

O painel tem as telas e o banco tem as tabelas, mas a produção de uma campanha é
copia-e-cola: o Fernando conversa com o Claude Code numa janela e cola o resultado
noutra. Não existe caminho entre "aprovei este anúncio na mineração" e "a copy está
gravada na campanha certa".

O modo de operação real é **um por vez**: minerar, escolher um anúncio, produzir ele
inteiro, subir, e só então pegar o próximo. Nada em lote. O design tem que respeitar
isso — uma esteira que produz dez copies de uma vez seria a ferramenta errada.

### O que já existe e não será reconstruído

| Peça | Estado |
|---|---|
| `/mineracao` com "Aprovar Anúncio para Produção" | funciona; cria `campanhas_producao` |
| `/revisor` — aprovar/rejeitar copy | **funciona de verdade** (grava `revisor_ok`, `status`, `data_aprovacao`, `notas_revisao`) |
| `/design` — aprovar e publicar LP | **funciona**; chama `POST /api/deploy` e grava `url_recurso` |
| `/producao` — Kanban | funciona; só renderiza `status_geral` como texto |
| Skills `copy` e `landing-page-vendas` | instaladas globalmente, testadas |

---

## 2. Verificações feitas antes do design (não são suposições)

Estas foram conferidas contra o código e o banco em 28/07. O `CLAUDE.md` estava
**errado** em dois pontos, e por isso vale registrar o que é fato:

1. **O `/revisor` NÃO filtra por `revisor_ok`.** A fila é
   `status in ('aguardando_revisao_ia','revisado_ia') and data_aprovacao is null`
   (`src/app/revisor/page.tsx:57-61`). O `CLAUDE.md` afirmava `revisor_ok = true`.
2. **O fluxo de aprovação do `/revisor` e o deploy do `/design` já funcionam.** O
   `CLAUDE.md` os descrevia como "lógica parcial" e "deploy ausente".
3. **Aprovar uma copy insere automaticamente a linha de `workflow_design`**
   (`revisor/page.tsx:148-157`), com `tipo_design='Landing Page'`. É esse insert que
   sinaliza "falta a LP".
4. **Rejeitar uma copy dispara `POST /api/copywriting/generate`** hoje
   (`revisor/page.tsx:198`) — regeneração automática pelo Zen.
5. **`workflow_design` não tem coluna `status`.** O `/design` lista tudo e deriva o
   rótulo de `url_recurso` / `data_aprovacao`.
6. **Convenções gravadas:** `tipo_copy = 'Página de Vendas'`,
   `tipo_design = 'Landing Page'`.
7. **`.claude/` não está no `.gitignore`** — uma skill em `.claude/skills/` viaja com
   o repositório. É o mecanismo de empacotamento para replicar o posto de trabalho.
8. **Estado do banco:** 33 anúncios minerados, 1 campanha, 1 copy aprovada, 1 design
   publicado, 0 vídeos.

---

## 3. Decisões tomadas

### D1 — Aprovar na mineração só marca; não dispara IA
`campanhas_producao.status_geral = 'aguardando_producao'` e para. Sem rascunho
automático. Evita gerar conteúdo que será descartado e mantém o "um por vez".

### D2 — A aprovação acontece no painel, não na conversa
O Claude Code produz e grava como pendente; o Fernando aprova em `/revisor` e
`/design`. As telas continuam sendo a superfície de decisão — inclusive porque é o
que o amigo/cliente vai usar.

### D3 — O handoff é uma skill versionada no repo
`.claude/skills/producao/`. Não é conhecimento improvisado por sessão: é arquivo,
versionado, replicável.

### D4 — Escopo v1 = copy + LP publicada
Criativo (estático e vídeo) e subida de campanha no Meta ficam fora. A fatia escolhida
fecha um ciclo útil sozinha e usa duas skills já testadas.

### D5 — Dois motores convivem, com procedência explícita
Os botões de "gerar" do painel continuam, mas **só disparam quando a linha está
vazia** — nunca sobrescrevem. Coluna `origem` registra quem escreveu.
**A trava é o conteúdo estar vazio, não a `origem`**: assim ela funciona mesmo se
alguém esquecer de preencher a procedência.

### D6 — O gatilho automático de regeneração na rejeição SAI
Rejeitar passa a apenas marcar `status='rejeitado'` + gravar `notas_revisao`. O
Fernando decide quando regenerar e com qual motor. Sem isso, D2 e D5 se contradizem:
uma rejeição chamaria o Zen sem passar pelo motor escolhido.

### D7 — O estado do pipeline é DERIVADO, numa view SQL
Nada de coluna `etapa`. A view calcula a partir dos dados que já existem, então não há
como dessincronizar. A regra fica em SQL (versionada, legível, reutilizável pelo
painel) em vez de escondida na skill.

### D8 — Retrabalho é linha nova, nunca sobrescrita
Copy rejeitada permanece; a nova versão é um `INSERT`. Mantém histórico e respeita o
comentário que já existe no `/revisor`.

---

## 4. Arquitetura

### O invariante

> **O Claude Code escreve conteúdo. O Fernando escreve aprovação. Nunca cruzam.**

| Ator | Escreve | Nunca escreve |
|---|---|---|
| Painel (Fernando) | `revisor_ok`, `status`, `data_aprovacao`, `notas_revisao`, `url_recurso` | conteúdo de qualidade |
| Claude Code | `conteudo_texto`, `meta_ads_copy`, `codigo_html`, `origem` | `data_aprovacao`, `revisor_ok`, `status='aprovado'` |
| Supabase | — | fonte única de verdade |

### Unidades e responsabilidades

| Unidade | Responsabilidade | Depende de |
|---|---|---|
| `vw_fila_producao` (view) | Calcular em que etapa cada campanha está e de quem é a vez | `campanhas_producao`, `workflow_copywriting`, `workflow_design`, `ads_minerados` |
| `.claude/skills/producao/SKILL.md` | Comandos, esteira por etapa e guardas | a view; skills `copy` e `landing-page-vendas`; MCP Supabase |
| `/mineracao` (alteração) | Gravar `status_geral='aguardando_producao'` | — |
| `/revisor` (alteração) | Rejeitar sem disparar regeneração | — |

A view é a única peça que carrega regra de negócio. A skill é casca fina: consulta,
despacha para a skill certa, grava. Se a regra do funil mudar, muda em um lugar.

---

## 5. Schema

### 5.1 Migration — procedência (aditiva, nullable)

```sql
alter table workflow_copywriting add column origem text;
alter table workflow_design      add column origem text;
```

Valores: `'claude-code'`, `'zen'`. Nulo = legado.

### 5.2 Migration — a view

```sql
create or replace view vw_fila_producao as
with copy_atual as (
  select distinct on (campanha_id) *
  from workflow_copywriting
  order by campanha_id, data_criacao desc
),
design_atual as (
  select distinct on (campanha_id) *
  from workflow_design
  order by campanha_id, data_criacao desc
)
select
  c.id            as campanha_id,
  c.nome_projeto,
  c.status_geral,
  a.id            as ad_minerado_id,
  a.page_name,
  a.ad_title,
  cp.id           as copy_id,
  d.id            as design_id,
  case
    when d.url_recurso is not null                            then 'no_ar'
    when d.codigo_html is not null and d.data_aprovacao is null
                                                              then 'aguardando_voce_lp'
    when d.id is not null and d.codigo_html is null           then 'falta_lp'
    when cp.status = 'rejeitado'                              then 'copy_rejeitada'
    when cp.id is not null and cp.data_aprovacao is null      then 'aguardando_voce_copy'
    when cp.id is null                                        then 'falta_copy'
    else 'indefinido'
  end as etapa,
  case when cp.status = 'rejeitado' then cp.notas_revisao end as feedback,
  greatest(c.data_criacao, cp.data_criacao, d.data_criacao)   as atualizado_em
from campanhas_producao c
left join ads_minerados a  on a.id = c.ad_minerado_id
left join copy_atual   cp  on cp.campanha_id = c.id
left join design_atual d   on d.campanha_id  = c.id;
```

**A ordem do `CASE` é a regra de negócio** e desce do fim do funil para o começo: se a
LP está no ar nada mais importa; se existe linha de design, a copy já foi aprovada.
`distinct on` garante que só a versão mais recente conta.

### 5.3 Donos de cada etapa

| `etapa` | Dono | Significado |
|---|---|---|
| `falta_copy` | Claude Code | aprovada na mineração, nada produzido |
| `aguardando_voce_copy` | Fernando | copy na fila do `/revisor` |
| `copy_rejeitada` | Claude Code | reprovada; `feedback` traz as notas |
| `falta_lp` | Claude Code | copy aprovada, linha de design vazia |
| `aguardando_voce_lp` | Fernando | HTML pronto, esperando `/design` |
| `no_ar` | — | ciclo fechado |
| `indefinido` | Fernando | anomalia; não produzir |

### 5.4 `status_geral` vs. `etapa` — não confundir

Existem duas coisas parecidas, e elas **podem discordar sem que isso seja bug**:

| | `campanhas_producao.status_geral` | `vw_fila_producao.etapa` |
|---|---|---|
| Para quê | rótulo do Kanban `/producao` | verdade operacional da esteira |
| Quem escreve | `/mineracao` e `/revisor` | ninguém — é calculado |
| Valores | `Planejamento`, `aguardando_producao`, `Aprovado` | os 7 da tabela acima |

Exemplo legítimo de discordância: depois que a copy é aprovada, `status_geral` vira
`'Aprovado'` enquanto `etapa` é `'falta_lp'` — a copy foi aprovada, mas a campanha não
terminou. **A esteira lê `etapa` e ignora `status_geral`.** A view expõe `status_geral`
só para exibição.

Consequência: **não usar `status_geral` em nenhuma condição do `CASE`.** Ele é texto
livre escrito por duas telas diferentes e não é confiável como máquina de estado.

---

## 6. Fluxo de dados

```
/mineracao "Aprovar"
   └─ campanhas_producao (status_geral='aguardando_producao')

/producao                → lê vw_fila_producao, agrupa por dono
/producao <campanha>     → executa a PRÓXIMA etapa pendente, uma só

  falta_copy | copy_rejeitada
     ├─ lê ads_minerados (page_name, ad_title, ad_copy, link_url, image_url)
     ├─ (se copy_rejeitada) injeta `feedback` como contexto
     ├─ roda a skill `copy`
     └─ INSERT workflow_copywriting
          tipo_copy='Página de Vendas', conteudo_texto, meta_ads_copy,
          status='aguardando_revisao_ia', revisor_ok=false,
          data_aprovacao=null, origem='claude-code'

/revisor
   ├─ APROVAR  → status='aprovado', revisor_ok=true, data_aprovacao=now
   │             + INSERT workflow_design (codigo_html null)
   │             + campanhas_producao.status_geral='Aprovado'
   └─ REJEITAR → status='rejeitado', notas_revisao=<feedback>   [sem fetch]

  falta_lp
     ├─ lê a copy aprovada + o anúncio
     ├─ roda a skill `landing-page-vendas`
     └─ UPDATE workflow_design (a linha já existe)
          codigo_html, origem='claude-code'

/design APROVAR → POST /api/deploy → url_recurso → "No Ar"
```

### Guardas da skill (regras duras no SKILL.md)

1. Nunca escrever `data_aprovacao`, `revisor_ok` ou `status='aprovado'`.
2. Nunca deletar linha de `workflow_*`. Retrabalho é `INSERT`.
3. Nunca produzir em campanha `aguardando_voce_*` sem ordem explícita.
4. `/producao` sem argumento e com mais de uma campanha acionável → perguntar qual.
5. **Uma etapa por invocação.** Não emendar copy→LP: entre as duas existe a aprovação
   humana. É esta guarda que faz o "nada em lote" valer na prática.

Escrita via MCP do Supabase (`execute_sql`, service role). As rotas de IA do app não
participam da esteira.

---

## 7. Tratamento de erro

| Situação | Comportamento |
|---|---|
| `etapa='indefinido'` | Mostrar como anomalia em `/producao`; **não produzir** |
| `ad_minerado_id` nulo | Falhar com mensagem clara; sem produto não há copy |
| Duas campanhas para o mesmo `ad_minerado_id` | Avisar na fila; não bloquear |
| `INSERT`/`UPDATE` falha | **Despejar o conteúdo produzido na conversa antes de desistir.** Nunca perder trabalho por erro de rede |
| Saída da skill não separa página vs. anúncio | Fazer a separação e **mostrar antes de gravar** |

---

## 8. Verificação

Não há suíte de testes no projeto (`package.json` sem `test`). Validação é SQL + tela.

**A view é a parte arriscada e a mais testável** — SQL puro, provável com fixtures.

1. **Baseline:** a campanha existente (copy aprovada, LP publicada) tem que devolver
   `no_ar`. Se não devolver, o `CASE` está errado.
2. **Uma fixture por etapa:** inserir linhas cobrindo `falta_copy`,
   `aguardando_voce_copy`, `copy_rejeitada`, `falta_lp`, `aguardando_voce_lp` e
   conferir o `etapa` de cada. Rodar em transação com `rollback` para não sujar o banco.
3. **Critério de aceite — um ciclo real ponta a ponta:** aprovar um dos 33 anúncios →
   `/producao` mostra `falta_copy` → produzir → conferir no `/revisor` → aprovar →
   fila vira `falta_lp` → produzir → conferir no `/design` → publicar → fila vira
   `no_ar`.

Enquanto o passo 3 não fechar, isto não é "validado" no sentido do `NOTES.md`.

### Rollback

```sql
drop view vw_fila_producao;
alter table workflow_copywriting drop column origem;
alter table workflow_design      drop column origem;
```
Mais: reintroduzir o `fetch` removido do `/revisor` e apagar `.claude/skills/producao/`.
Nenhuma migration destrói dado existente.

---

## 9. Ordem de implementação

1. Migration `origem` nas duas tabelas
2. Migration `vw_fila_producao` + validação com fixtures (passos 1 e 2 da seção 8)
3. `/mineracao`: gravar `status_geral='aguardando_producao'`
4. `/revisor`: remover o `fetch` de regeneração na rejeição
5. Painel: travar os botões de gerar para só dispararem com conteúdo vazio; gravar
   `origem='zen'`
6. `.claude/skills/producao/SKILL.md` — comandos, esteira e guardas
7. Ciclo real ponta a ponta (critério de aceite)
8. `NOTES.md` + segundo cérebro

---

## 10. Fora de escopo (registrado para não se perder)

- **Criativo estático** (HTML/CSS → screenshot Playwright → Storage). Não existe tabela
  adequada hoje; `workflow_video` é para vídeo.
- **Criativo em vídeo** — exige serviço externo pago (Higgsfield ou similar).
- **Subir campanha no Meta** (skill `trafego`, Graph API). Ação irreversível que gasta
  dinheiro; exige confirmação explícita e spec próprio.
- **Rejeição de LP no `/design`** — hoje a tela só aprova.
- **Sujeira conhecida:** `aprovarCopy` grava o *título da copy* em
  `workflow_design.notas_revisao` (`revisor/page.tsx:153`). Enquanto não houver rejeição
  de LP não incomoda, mas vira bug no dia que houver.
- **`callOptimizationPlan`** em `src/lib/anthropic.ts` é código morto (nenhum chamador).
