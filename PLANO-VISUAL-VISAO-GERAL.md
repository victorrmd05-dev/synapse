# 🎨 PLANO VISUAL — Visão Geral (página principal)

> **Status: NÃO IMPLEMENTADO.** Documento de planejamento, escrito em 27/07/2026 a pedido do
> Fernando ("deixa como está por enquanto"). Nada no código foi alterado por causa deste plano.
>
> Decisões já alinhadas com o Fernando antes de escrever: **(1)** todo número tem que ser real,
> com vazio honesto onde não há dado; **(2)** o topo responde "o dinheiro está de pé?";
> **(3)** estrutura em 4 faixas empilhadas.

---

## 1. Por que a página parece "crua" hoje

O problema não é falta de enfeite. É que **mais da metade do que está na tela é ficção**, e o
resto é uma caixa vazia. Diagnóstico linha por linha de `src/app/page.tsx`:

| Elemento na tela | Situação real |
|---|---|
| `Itens na Esteira` — 35 | ✅ **Real.** Soma de 4 `count` no Supabase |
| `ROAS Global (Meta Ads)` — 3.82 · +0.42 | ❌ **Hardcoded no JSX.** O ROAS real é **2.52** |
| `Lucro Líquido` — R$ 158.4k · 18% | ❌ **Hardcoded.** Não existe fonte para isso (ver §5) |
| `Próxima Ação da IA` — "3 novos produtos validados" | ❌ **Hardcoded.** O botão "Analisar Agora" não faz nada |
| Bloco inferior de 400px | ❌ **Caixa vazia** com uma frase de marketing e um link |

Ou seja: 1 dado real, 3 números inventados e um terço da altura da página ocupado por nada.
Qualquer melhoria visual que não resolva isso primeiro só deixa a ficção mais bonita.

---

## 2. Inventário de dados REAIS disponíveis (medido em 27/07/2026)

Esta é a parte que dá trabalho levantar — está aqui para não precisar refazer. Todos os números
abaixo saíram de consulta direta ao banco.

| Tabela | Linhas | Serve para |
|---|---:|---|
| `meta_campaign_metrics` | 53 | **Série temporal de dinheiro** — a única do projeto. Base do gráfico grande |
| `tracking_eventos` | 46 | Eventos CAPI reais (Pixel/FOP) |
| `ads_minerados` | 33 | Topo do funil da esteira |
| `autopsia_jobs` | 24 | Fila do worker (saúde do processamento) |
| `meta_campaigns` | 12 | Nome/status das campanhas (11 com métrica) |
| `agentes_config` | 10 | Os 10 agentes, com modelo e flag `ativo` |
| `autopsia_criativos` | 8 | Acervo de criativos dissecados |
| `meta_ai_diagnostics` | 5 | Auditorias de IA já rodadas |
| `lp_biblioteca` | 3 | Acervo de landing pages (0 marcadas como validadas) |
| `meta_optimization_plans` | 3 | Planos de otimização gerados |
| `campanhas_producao` · `workflow_copywriting` · `workflow_design` · `autopsias` | 1 cada | Etapas da esteira |
| `workflow_video` | 0 | Etapa ainda não usada |

### O dinheiro, em detalhe

```
Janela real:      2026-06-29  →  2026-07-27
Gasto total:      R$ 23.198,62
Receita total:    R$ 58.495,21
Compras:          194
ROAS real:        2,52x        (não 3,82 como a tela diz hoje)
Dias com dado:    11 (de ~29 dias de calendário)
```

Distribuição por dia — **note os buracos e o dia parcial**:

| Dia | Gasto | Receita | Compras | Observação |
|---|---:|---:|---:|---|
| 29/06 | 148,11 | 0,00 | 0 | regime antigo, sem rastreio de compra |
| 11/07 | 148,41 | 0,00 | 0 | idem |
| 14/07 | 148,41 | 0,00 | 0 | idem |
| 17/07 | 148,41 | 0,00 | 0 | idem |
| 18/07 | 4.626,09 | 10.319,41 | 31 | começa a operação de verdade |
| 20/07 | 3.565,30 | 10.035,02 | 31 | *(19/07 não existe)* |
| 21/07 | 3.790,54 | 10.597,18 | 34 | |
| 22/07 | 3.839,55 | 9.919,61 | 35 | |
| 23/07 | 3.683,79 | 9.514,37 | 34 | |
| 24/07 | 3.085,18 | 7.916,86 | 28 | |
| 27/07 | **14,83** | 192,76 | 1 | **dia parcial** *(25 e 26/07 não existem)* |

---

## 3. As três armadilhas do gráfico (e como resolver)

Isto é o que separa um gráfico honesto de um que mente sem querer.

**1. A série não é contígua.** Faltam 19/07, 25/07, 26/07 e todo o intervalo 30/06–10/07. Um
gráfico de linha ligaria os pontos e desenharia uma reta atravessando um buraco de 12 dias —
inventando uma tendência que não existe.
→ **Solução:** barras por dia (não linha) e dias ausentes ficam ausentes. Nunca interpolar.

**2. Hoje é dia parcial.** 27/07 tem R$ 14,83 contra ~R$ 3.500 dos dias cheios. Num gráfico de
"últimos 7 dias", a última barra despenca e a leitura instantânea é "a operação morreu".
→ **Solução:** barra do dia corrente com hachura + rótulo "parcial", e excluída de qualquer
comparação de tendência.

**3. Existem dois regimes misturados.** Os 4 primeiros dias têm receita R$ 0 porque eram
campanhas de tráfego sem rastreio de compra — não porque falharam. Jogados na mesma média,
derrubam o ROAS sem explicar por quê.
→ **Solução:** o KPI de ROAS usa a janela selecionada (default 7 dias, que já exclui esses
dias) e o gráfico marca visualmente onde o rastreio começou.

**4. Bônus de corretude — não use média de ROAS.** O ROAS do período tem que ser
`soma(receita) ÷ soma(gasto)`, **nunca** a média da coluna `roas`. Média de razões distorce
quando os gastos diários são desiguais, e aqui eles variam de R$ 14 a R$ 4.626 (paradoxo de
Simpson). Errar isso dá um número plausível e errado — o pior tipo de bug de dashboard.

---

## 4. O layout proposto — cockpit em 4 faixas

```
┌─ FAIXA 1 · DINHEIRO ──────────────────────── [ 7 dias ▾ ] ─┐
│  GASTO           RECEITA          ROAS         COMPRAS      │
│  R$ 23.198       R$ 58.495        2,52x        194          │
├─────────────────────────────────────────────────────────────┤
│  ██ gasto   ░░ receita   ── ROAS (eixo direito)             │
│  ██░ ██░ ██░ ██░ ██░ ██░   [buraco]   ▨ parcial            │
│  18   20   21   22   23   24    ---      27                 │
└─────────────────────────────────────────────────────────────┘

┌─ FAIXA 2 · ESTEIRA ─────────────┐ ┌─ AÇÕES PENDENTES ──────┐
│  Mineração        33  →         │ │  ✓ Esteira em dia       │
│  Produção          1  →         │ │    nada esperando você  │
│  Copy              1  →         │ │                         │
│  Design            1  →         │ │  (enche sozinho quando  │
│  Vídeo             0            │ │   o trabalho voltar)    │
└─────────────────────────────────┘ └─────────────────────────┘

┌─ FAIXA 3 · SISTEMA ─────────────────────────────────────────┐
│  10 agentes ativos    Worker autópsia: 0 na fila, 0 erro    │
│  Acervo: 3 LPs · 8 criativos · 1 autópsia · 46 eventos      │
└─────────────────────────────────────────────────────────────┘
```

### Faixa 1 · Dinheiro (o herói)
Quatro KPIs de `meta_campaign_metrics` com o seletor de data que **já existe no projeto**
(`src/lib/date-range.ts` + `src/components/ui/DateRangePicker.tsx`), default 7 dias. É a faixa
que justifica a página: é o único dado com série temporal, o que permite um gráfico grande em
vez de mais um card solto.

### Faixa 2 · Esteira + Ações
Funil clicável, cada etapa levando à sua página. Os números reais (33 → 1 → 1 → 1 → 0) mostram
que a esteira está **parada depois da mineração** — isso é informação, não defeito do gráfico.

⚠️ **As ações pendentes hoje somam ZERO** (nada aguardando revisão, fila do worker vazia,
nenhuma autópsia sem dossiê). O painel nasce vazio — de propósito, com estado "Esteira em dia"
funcionando como luz de tudo-certo. Se isso incomodar, a alternativa é só renderizar a faixa
quando houver pendência.

### Faixa 3 · Sistema
Saúde do organismo: agentes ativos com badge de modelo, fila do worker e tamanho do acervo.
Barato de construir (são `count`) e é o que dá sensação de "dashboard grande" sem inventar nada.

---

## 5. O que eu recomendo NÃO fazer

- **Não trazer "Lucro Líquido" de volta.** O Meta entrega gasto e receita, não custo de produto,
  frete ou taxa. Sem isso, qualquer lucro exibido é chute com cara de fato. Se quiser esse
  número de verdade, precisa de uma tabela de custo por produto primeiro — aí ele passa a ser
  calculável e honesto.
- **Não encher a tela com tiles pequenos** só para ocupar espaço. Doze cartões iguais dão
  sensação de painel de controle e nenhuma hierarquia: nada grita mais alto, e a curva do ROAS
  (a informação com mais valor por pixel aqui) desaparece.
- **Não duplicar `/meta-ads/dashboard`.** A home mostra o resumo do dinheiro; o detalhe por
  campanha, quebras e auditoria continuam lá.
- **Não colocar Realtime nesta página.** São ~12 agregações; assinar tudo é complexidade sem
  ganho, porque ninguém fica com a home aberta olhando. Fetch no mount + botão Atualizar basta.

---

## 6. Como implementar, quando for a hora

**Zero dependência nova:** `recharts@^3.8.1` já está no `package.json`, e há dois padrões prontos
para seguir — `src/components/campaigns/TrendChart.tsx` e `FunnelBars.tsx`.

| Arquivo | O que faz |
|---|---|
| `src/app/api/dashboard/overview/route.ts` | **Criar.** Faz TODA a agregação server-side com `getTenantClient()` e devolve um JSON. Motivo: são ~12 contagens (12 round-trips se feito do navegador) e o ROAS correto exige SQL |
| `src/components/dashboard/FaixaDinheiro.tsx` | **Criar.** 4 KPIs + seletor de janela |
| `src/components/dashboard/GraficoDiario.tsx` | **Criar.** Barras gasto/receita + linha ROAS, com buracos e dia parcial tratados |
| `src/components/dashboard/FaixaEsteira.tsx` | **Criar.** Funil clicável + ações pendentes |
| `src/components/dashboard/FaixaSistema.tsx` | **Criar.** Agentes, worker, acervo |
| `src/app/page.tsx` | **Modificar.** Passa a consumir a rota e distribuir para as 4 faixas. Sai o ROAS/Lucro falso e a caixa vazia de 400px. **Mantém o `<MusicButton />` no header** |

Design system obrigatório do projeto (`CLAUDE.md`): `bg-surface`, `border-surface-elevated`,
`text-secondary`, `bg-primary` (#6366f1), `text-status-green/yellow/red`. Sem fundo claro, sem
`border-2`, sem gradiente arco-íris.

### Ordem sugerida (maior ganho visual por esforço)

1. **Faixa 1 + gráfico** — sozinha já resolve a sensação de "cru", porque é o dado com mais
   substância e ocupa o espaço nobre. Também é onde mora a maior parte do risco (as 3 armadilhas)
2. **Faixa 3 · Sistema** — mais barata de todas (são `count`), enche a página e não tem armadilha
3. **Faixa 2 · Esteira + Ações** — deixar por último: é a que nasce mais vazia hoje, e ganha
   valor de verdade quando a esteira voltar a andar

---

## 7. Fora do escopo da home, mas notei enquanto olhava

Duas coisas visuais que aparecem hoje e não têm a ver com o layout da Visão Geral:

- **O título da aba do navegador ainda é `MetaScale | ADS Cockpit v1.0`** (em
  `src/app/layout.tsx`). O projeto foi rebatizado para Alavanca Synapse — isso aparece em toda
  aba aberta e em todo print que você manda para alguém. É correção de uma linha.
- **`/mineracao` cospe 52 erros 403 no console** e mostra miniaturas quebradas: são os anúncios
  antigos cujas URLs do CDN do Facebook expiraram (o problema de ~5 dias já registrado no
  `NOTES.md`). O card tenta a URL morta em vez de cair no placeholder quando não há
  `image_storage_path`. Também é um fix pequeno, e melhora bastante a percepção de acabamento.
