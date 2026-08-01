# Design — Geração de vídeo: WaveSpeed + Remotion

> Data: 2026-07-31 · Status: **desenho aprovado, nada implementado**
> Escopo deste spec: **P1 + P2**. P3 e P4 ganham specs próprios.

---

## 1. Por que isto existe

O `/video-maker` é a última casca grande do painel: 346 linhas que leem
`workflow_video` com Realtime e **não têm nenhum caminho de geração**. Não existe
rota de API de vídeo, e não há uma linha sequer de Higgsfield no `src/` — a
integração que o `CLAUDE.md` descreve nunca foi escrita.

O Fernando pôs crédito na WaveSpeed para validar o processo. A ideia é fechar a
esteira: **mineração → autópsia → copy → (imagens, vídeos) → design → tráfego**.

### A divisão de trabalho entre os dois motores

| | WaveSpeed | Remotion |
|---|---|---|
| O que faz | gera o clipe cru | compõe em cima dele |
| Onde roda | servidor deles | CPU local |
| Custo | **pago, pré-pago, sem camada grátis** | grátis |
| Velocidade | minutos, assíncrono | ~12× o tempo real de vídeo |
| Precisa de worker local? | **não** (só para consultar/baixar) | sim |

São naturezas opostas, e é isso que decide a arquitetura. O caro e remoto se faz
**uma vez**; o barato e local se **repete à vontade**. Variação é trabalho do
Remotion, nunca do WaveSpeed.

---

## 2. A decomposição

Isto não cabe num spec só. Ordem acordada:

| | Peça | Depende de | Estado |
|---|---|---|---|
| **P0** | Modelo do agente `autopsia` | — | **decidido: fica como está**, não mexer |
| **P1** | `prompts_videos` no copywriting | P0 | **este spec** |
| **P2** | Geração no WaveSpeed | P1 *(só no fluxo)* | **este spec** |
| **P3** | Variações no Remotion (legenda + narração) | P2 | spec próprio |
| **P4** | Remotion Studio embutido no dashboard | P3 | spec próprio |

⚠️ **A dependência P1 → P2 é de fluxo, não de construção.** No produto, o prompt
vem antes do clipe. Na ordem de build (seção 7) o gerador vem primeiro, porque ele
é testável sozinho com um prompt digitado à mão — e prompt gerado por IA sem um
gerador para consumi-lo não dá para validar. Construir na ordem do produto
atrasaria a única parte que precisa de chamada real e crédito para provar que
funciona.

### Fora de escopo deste spec

- Renderização no Remotion (P3) — a fila `video_jobs` já nasce com `tipo='compor'`
  previsto, mas **nada consome esse tipo ainda**.
- Narração ElevenLabs (P3).
- Remotion Studio embutido (P4). Ressalva registrada: o Studio é um servidor de
  desenvolvimento, sobe na **porta 3000 — a mesma do `next dev`**, só existe
  enquanto o processo roda, e é local. É conveniência de desenvolvimento, não
  funcionalidade de produto.
- Higgsfield. Não vai ser integrada; a WaveSpeed ocupa esse lugar.

---

## 3. Arquitetura

**Abordagem escolhida: a rota submete, o worker só consulta e baixa.**

```
[clique confirmado na tela]
   └─▶ POST /api/video/gerar
         1. valida entrada e estima custo
         2. SUBMETE ao WaveSpeed        ← única chamada que cobra, uma vez só
         3. INSERT video_jobs (tipo=gerar, status=processando,
                               wavespeed_task_id=<id da resposta>)
         4. responde na hora com o task_id

[worker]  só faz o que é idempotente e grátis:
   GET /predictions/{task_id}/result
     ├─ created|processing → não faz nada, tenta de novo depois
     ├─ completed          → BAIXA o mp4 → Storage → url_saida, status=concluido
     │                        └─ e cria o job tipo='compor' (P3)
     └─ failed|timeout|cancelled → status=erro, grava a mensagem
```

### Por que não a fila única com o worker fazendo tudo

Foi a primeira opção considerada e tem um furo que a mata: o `pegar_job()` do
worker da autópsia **incrementa `tentativas` e reprocessa job travado**. Se o
worker fosse quem submete, um retry **submeteria de novo e cobraria duas vezes**.

**Retry automático e cobrança não podem morar no mesmo lugar.**

### Por que não webhook

A WaveSpeed suporta webhook com verificação de assinatura, e o projeto tem
precedente (a Edge Function `track-capi`). Mas exige Edge Function nova e
**não funciona no `localhost`** — perderia-se o loop de desenvolvimento
justamente na feature que mais precisa de teste manual. Fica como possibilidade
futura, não como pendência.

---

## 4. Schema

Três migrations, convenção `YYYYMMDDHHMMSS_descricao.sql`.

### 4.1 Resgatar a coluna órfã

```sql
alter table workflow_copywriting add column if not exists prompts_imagens text;
```

**Isto não é parte da feature — é dívida.** A coluna `prompts_imagens` existe no
banco de produção e é usada pelo código (`copywriting/generate/route.ts:241`,
`/copywriting`, `/revisor`), mas **não existe em nenhuma migration**. Foi criada
direto no banco. Quem clonar o repo hoje não consegue reconstruir o schema.
Corrigir agora, enquanto se mexe na tabela vizinha.

### 4.2 A coluna nova

```sql
alter table workflow_copywriting add column if not exists prompts_videos text;
```

`text`, não `jsonb` — espelha a irmã. O conteúdo é o mesmo tipo de coisa: prompts
escritos em markdown, lidos por humano antes de virar chamada.

### 4.3 A fila

```sql
create table if not exists video_jobs (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid references campanhas_producao(id) on delete cascade,
  tipo text not null,                        -- gerar | compor
  status text not null default 'pendente',   -- pendente|processando|concluido|erro

  -- só para tipo='gerar' (WaveSpeed)
  wavespeed_task_id text,
  modelo text,
  prompt text,
  image_url text,                            -- presente = image-to-video
  duracao_s int,
  custo_estimado_usd numeric(10,4),

  -- resultado
  url_saida text,                            -- caminho no STORAGE, nunca a URL da WaveSpeed
  tentativas int not null default 0,
  erro text,
  criado_em timestamptz default now(),
  iniciado_em timestamptz,
  concluido_em timestamptz,

  constraint gerar_exige_task_id
    check (tipo <> 'gerar' or wavespeed_task_id is not null)
);

create index if not exists idx_video_jobs_fila on video_jobs (status, criado_em);
create index if not exists idx_video_jobs_campanha on video_jobs (campanha_id);
```

**A `check` é a trava de custo, e é a decisão central deste spec.** Uma linha
`gerar` não consegue existir sem que a tarefa já tenha sido submetida. Não sobra
nada para o worker "iniciar" — e iniciar, aqui, significa cobrar. O duplo-gasto
vira **estruturalmente impossível** em vez de proibido por convenção.

Pelo mesmo motivo, um job `gerar` nasce em **`processando`**, nunca em `pendente`:
um job `pendente` seria um convite para um worker futuro tentar começá-lo.

⚠️ **O `default 'pendente'` da coluna vale para `compor`, não para `gerar`.** Os
dois tipos têm ciclos de vida opostos e dividem a mesma tabela:

| tipo | nasce em | quem move | por quê |
|---|---|---|---|
| `gerar` | `processando` (a rota **escreve explícito**) | worker, só consultando | já foi submetido e pago |
| `compor` | `pendente` (usa o default) | worker, pegando da fila | ainda não começou, e começar é grátis |

O default serve o caso comum (`compor`). A rota de geração **nunca pode confiar no
default** — tem que escrever `status: 'processando'` na mão. Está escrito aqui
porque é o tipo de detalhe que se perde na implementação e reabre exatamente o
buraco que a `check` fecha.

RLS com policy pública e Realtime, seguindo exatamente o `autopsia_jobs`
(`20260727120100_create_autopsia.sql`).

---

## 5. P1 — prompts de vídeo no copywriting

### O que já existe e não precisa ser construído

- O copywriting **já lê o dossiê da autópsia**: `copywriting/generate/route.ts:136-145`
  carrega `autopsias.dossie_json` pelo `campanha.autopsia_id` e injeta como
  `blocoDossie` no prompt. **Os prompts de vídeo herdam esse contexto de graça.**
- O padrão de `prompts_imagens` está pronto e validado: marcar
  `[IMAGEM N · arquivo.png — descrição]` no corpo da copy, escrever o prompt de
  cada uma no campo, com paleta em hex e exclusões, de 3 a 5, com checklist.

### O que muda

1. **`api/copywriting/generate/route.ts`** — o contrato JSON ganha um campo:
   `{ meta_ads_copy, pagina_vendas, prompts_imagens, prompts_videos }`
2. **`agentes/copywriting/SKILL.md`** — seção nova, espelhando a das imagens.
3. **Aba "Prompts de Vídeo"** em `/copywriting` e `/revisor`, ao lado da de imagem.

### O que um prompt de vídeo precisa e o de imagem não

| Item | Regra |
|---|---|
| Duração | 5–10s (a WaveSpeed faz 1–20s; anúncio raramente passa de 10) |
| Movimento | é o ponto todo do vídeo — câmera, ação, ritmo |
| Origem | se referenciar `[IMAGEM N]`, vira image-to-video da imagem já gerada |
| **Texto na tela** | **proibido no prompt** |

A proibição de texto é regra, não preferência: **modelo de vídeo escreve texto
embolado**, e a legenda vem do Remotion queimada depois (P3). Pedir texto à
WaveSpeed gasta dinheiro para produzir um defeito que o passo seguinte teria que
cobrir.

Quantidade: **3 prompts**, mesma faixa das imagens. A tela deixa escolher quais
gerar — 1, 2 ou 3.

---

## 6. P2 — geração no WaveSpeed

### API (confirmada na documentação)

| | |
|---|---|
| Base | `https://api.wavespeed.ai/api/v3` |
| Auth | `Authorization: Bearer $WAVESPEED_API_KEY` |
| Submeter | `POST /{owner}/{modelo}/{versao}` → `data.id`, `data.urls.get` |
| Consultar | `GET /predictions/{id}/result` → `status`, `outputs[]` |
| Status | `created` · `processing` · `completed` · `failed` · `cancelled` · `timeout` |

### Variáveis de ambiente

Já adicionadas ao `.env.local.example`:

```
WAVESPEED_API_KEY=      # a chave só funciona depois de um top-up
WAVESPEED_MODEL=        # caminho `owner/nome/versao` do modelo padrão
```

### Peças a construir

| Peça | Responsabilidade |
|---|---|
| `src/lib/wavespeed/client.ts` | submeter e consultar. Nada mais. |
| `src/lib/wavespeed/precos.ts` | tabela de preços mantida à mão + `estimarCusto()` |
| `POST /api/video/gerar` | valida, estima, **submete**, grava a linha, responde |
| `GET /api/video/jobs?campanha_id=` | lista com status |
| worker | consulta, baixa para o Storage, encadeia o `compor` |
| tela no `/video-maker` | lista prompts, escolhe quais, mostra custo, confirma, acompanha |

### A trava de custo na tela

Antes de submeter, a tela mostra **modelo, duração, resolução e custo estimado em
US$**, e exige confirmação. Foi a trava escolhida pelo Fernando.

Ficaram **de fora por decisão dele**, e ficam registradas aqui caso o gasto
surpreenda: teto de gasto diário no servidor, e a regra de "nunca gerar em lote".
O registro de gasto por geração **entrou de graça** — `custo_estimado_usd` e
`modelo` moram na linha que precisa existir de qualquer forma para guardar o
`task_id`.

---

## 7. Ordem das tarefas

**A primeira tarefa é de verificação e não é negociável.**

1. **Confirmar com chamada real**: um caminho de modelo válido
   (`owner/nome/versao`) e o custo de um clipe curto. A documentação lista os
   nomes comerciais (WAN 2.5/2.6/2.7, Kling 3.0, Veo 3.1, Seedance, Hailuo, Vidu)
   mas **não expõe as rotas da API nem preço por modelo**. Construir antes disso
   seria construir sobre palpite.
2. Migrations (as três da seção 4).
3. `lib/wavespeed/client.ts` + `precos.ts`.
4. `POST /api/video/gerar` — com a estimativa e a submissão.
5. Worker: consultar → baixar → Storage.
6. P1 completo (rota do copywriting + SKILL + abas).
7. Tela no `/video-maker`.

Passos 2–5 podem ser validados com prompt digitado à mão, antes do P1 existir.

---

## 8. As armadilhas

1. **A URL de saída da WaveSpeed expira.** Mesma lição que a autópsia já pagou com
   o CDN do Facebook, que motivou a ordem da fila lá ("baixa todos primeiro").
   `url_saida` guarda o **caminho no Storage**, nunca a URL deles.
2. **O worker nunca submete.** Consulta e baixa. Garantido pela `check` do banco,
   não só por disciplina de código.
3. **`custo_estimado_usd` é estimativa.** A tabela de preços é mantida à mão
   porque a documentação não expõe preço por modelo. **Isso vai escrito na tela** —
   número que parece exato vira promessa. A fatura da WaveSpeed é a verdade.
4. **Nada dispara sozinho.** Sem loop, sem fallback, sem retry de submissão. É a
   política de custo do `CLAUDE.md`, e a WaveSpeed é a primeira coisa do projeto
   que queima crédito pré-pago a cada clique.

---

## 9. O que foi verificado × o que é suposição

| Afirmação | Como sei |
|---|---|
| `/video-maker` não tem geração | li o arquivo; não há rota de API de vídeo nem Higgsfield no `src/` |
| copywriting já lê o dossiê | `copywriting/generate/route.ts:136-145` |
| `prompts_imagens` não tem migration | busca em `*.sql` não retorna nada |
| `video_jobs` não existe | só aparece no `NOTES.md` e no `PLANO-REMOTION-VARIACOES.md` |
| botão "Autopsiar" já existe | `mineracao/page.tsx:621`, `autopsia/page.tsx:116` |
| endpoints e status da WaveSpeed | documentação oficial |
| **caminhos dos modelos** | **NÃO confirmado** — tarefa 1 |
| **preço por clipe** | **NÃO confirmado** — tarefa 1 |
| Remotion Studio na porta 3000 | padrão do Remotion; **confirmar ao chegar no P4** |

---

## 10. Decisões tomadas com o Fernando

- WaveSpeed é **matéria-prima para o Remotion**, não anúncio pronto.
- Aceita **as duas entradas**: `image_url` opcional decide entre image-to-video e
  text-to-video.
- Trava de custo: **confirmação com custo estimado na tela**. Teto no servidor e
  proibição de lote foram considerados e recusados.
- Agente `autopsia`: **não mexer no modelo**. Está gerando.
- O painel faz o repetível; o julgamento continua vindo pelo chat — o que é
  exatamente o que o `CLAUDE.md` já declara ("as rotas do painel geram rascunho").
