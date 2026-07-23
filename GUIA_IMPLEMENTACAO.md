# 🔧 GUIA DE IMPLEMENTAÇÃO — Synapse Dashboard

## Visão Geral — 3 Melhorias

1. **Histórico de Diagnósticos Salvos** (listar + visualizar)
2. **Visão por Conjunto (Adset) sempre visível** sem precisar rodar análise
3. **Visualizar Criativo do Anúncio** (imagem + texto)

---

## 📁 Arquivos Envolvidos (já existentes)

```
src/
├── app/meta-ads/campanhas/
│   ├── page.tsx                    ← Página principal (editar)
│   └── [id]/page.tsx               ← Página individual (criar?)
├── components/campaigns/
│   ├── DeepAnalysis.tsx            ← Quebra por conjunto/posicionamento (editar)
│   ├── MetaMetricsGrid.tsx         ← Grid de métricas (editar)
│   ├── AIAnalyst.tsx               ← Diagnóstico IA (editar)
│   ├── TrendChart.tsx
│   └── OptimizationPlan.tsx
├── app/api/meta/
│   ├── adset/route.ts              ← Já existe (pausar/ativar) - pode estender
│   ├── analysis/route.ts           ← Já existe (quebras via Meta API)
│   └── sync/route.ts               ← Sync dados da Meta
├── app/api/diagnostics/
│   └── save/route.ts               ← Salva diagnóstico (já existe)
├── lib/
│   ├── supabase.ts                 ← Client anon
│   └── supabase-server.ts          ← Client service_role
└── types/
    └── index.ts                    ← Tipos (olhar estrutura)
```

---

## 1️⃣ HISTÓRICO DE DIAGNÓSTICOS SALVOS

### Tabela Supabase: `meta_ai_diagnostics`
```json
{
  "id": "uuid",
  "meta_campaign_id": "string (Meta ID)",
  "data": "string (data ex: 2026-06-29)",
  "gargalo": "string",
  "diagnostico": "string (texto longo)",
  "recomendacoes": "array de strings",
  "prioridade": "alta|media|baixa",
  "modelo": "string (ex: deepseek-v4-flash-free)",
  "criado_em": "timestamp"
}
```

### Componentes para criar:

**A) Botão "Histórico" no header da página de campanhas**
- Local: `src/app/meta-ads/campanhas/page.tsx` (perto do select de campanhas)
- Abre um modal/overlay listando diagnósticos salvos

**B) Modal `DiagnosticsHistory.tsx`**
- Caminho: `src/components/campaigns/DiagnosticsHistory.tsx`
- Props: `{ diagnostics: AIDiagnostic[]; onClose: () => void }`
- Funcionalidades:
  - Tabela com colunas: Data | Gargalo | Prioridade | Ações
  - Filtro por campanha (ou mostra de todas)
  - Botão "Ver detalhes" que expande o diagnóstico completo
  - Botão "Fechar"

**C) Aba "Diagnósticos" no layout da campanha**
- Adiciona tabs na página: [Métricas] [Diagnósticos] [Conjuntos] [Criativos]
- A tab "Diagnósticos" carrega `meta_ai_diagnostics` filtrado por `meta_campaign_id`

### Sugestão de estado no page.tsx:
```typescript
const [savedDiagnostics, setSavedDiagnostics] = useState<AIDiagnostic[]>([]);
const [showHistory, setShowHistory] = useState(false);

// Fetch saved diagnostics
const fetchDiagnostics = async () => {
  const { data } = await supabase
    .from('meta_ai_diagnostics')
    .select('*')
    .order('criado_em', { ascending: false });
  setSavedDiagnostics(data || []);
};
```

---

## 2️⃣ VISÃO POR CONJUNTO (ADSET) SEMPRE VISÍVEL

### O que já existe
O `DeepAnalysis` já renderiza `<BreakdownTable title="🎯 Por conjunto" rows={analysis.byAdset} />`, mas **só aparece** depois que o usuário clica "Rodar Análise Profunda".

### O que precisa mudar

**A) Adicionar endpoint pra buscar adsets da Meta sem análise profunda**
- Caminho: `src/app/api/meta/adsets/list/route.ts` (novo)
- GET `/api/meta/adsets/list?campaignId=X`
- Chama `getCampaignAdSets(campaignId)` do `@/lib/meta-api`
- Retorna: `{ success: boolean, adsets: Array<{ id, name, status, spend, impressions, roas? }> }`

**B) Adicionar seção "Conjuntos" independente do DeepAnalysis**
- Local: `src/app/meta-ads/campanhas/page.tsx`
- Depois do `<DeepAnalysis>` e antes do `<OptimizationPlan>`, inserir:

```tsx
{/* Conjuntos da Campanha */}
<AdsetsPanel campaignId={selected?.meta_campaign_id} />
```

**C) Componente `AdsetsPanel.tsx`**
- Caminho: `src/components/campaigns/AdsetsPanel.tsx`
- Props: `{ campaignId: string }`
- Funcionalidades:
  - Fetch `/api/meta/adsets/list?campaignId=X` ao montar
  - Tabela: Nome | Status | Gasto | Impressões | ROAS | CPA | Ações
  - Botão de pausar/ativar (reaproveita `POST /api/meta/adset`)
  - Indicador de carregamento

```tsx
// Estrutura sugerida
<div className="bg-[#0F0F13] border border-[#2A2A38] rounded-xl p-6">
  <h3 className="text-[15px] font-bold text-[#F1F1F3] mb-4 flex items-center gap-2">
    <Layers size={16} className="text-[#6366F1]" />
    Conjuntos de Anúncios
  </h3>
  <table className="w-full text-[12px]">
    <thead>...</thead>
    <tbody>...</tbody>
  </table>
</div>
```

---

## 3️⃣ VISUALIZAR CRIATIVO DO ANÚNCIO

### API necessária
- **Endpoint:** `GET /api/meta/creatives?campaignId=X` (novo)
- Caminho: `src/app/api/meta/creatives/route.ts`
- Chama Meta Marketing API: `/{campaign_id}/ads?fields=creative{id,title,body,image_url,thumbnail_url},name,status`
- Retorna: `{ success, creatives: Array<{ id, name, status, creative: { id, title, body, image_url }> }`

**Importante:** A Meta Ads API retorna `asset_feed_spec` ou `object_story_spec` com as imagens.
Pode ser necessário usar `/act_{ad_account_id}/ads` com o campo `creative`.

### Componente `AdCreatives.tsx`
- Caminho: `src/components/campaigns/AdCreatives.tsx`
- Props: `{ campaignId: string, metaAccountId: string }`

```tsx
interface Creative {
  id: string;
  name: string;
  status: string;
  title: string;
  body: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  ctr?: number;
  spend?: number;
}
```

- Funcionalidades:
  - Grid de cards (2-3 colunas) com o criativo
  - Cada card: miniatura da imagem + título + texto
  - Modal expandido ao clicar (imagem grande + corpo completo)
  - Botão "Abrir no Gerenciador" (link direto da Meta)
  - Métricas do anúncio se disponíveis (CTR, gasto)

### Estado no page.tsx:
```typescript
const [creatives, setCreatives] = useState<Creative[]>([]);
const [creativesLoading, setCreativesLoading] = useState(false);

// Fetch quando selecionar campanha
useEffect(() => {
  if (!selected?.meta_campaign_id) return;
  setCreativesLoading(true);
  fetch(`/api/meta/creatives?campaignId=${selected.meta_campaign_id}`)
    .then(r => r.json())
    .then(d => { if (d.success) setCreatives(d.creatives); })
    .finally(() => setCreativesLoading(false));
}, [selected?.meta_campaign_id]);
```

---

## 🔧 Endpoints que Precisam Ser Criados

| Método | Rota | O que faz | Retorna |
|--------|------|-----------|---------|
| GET | `/api/meta/adsets/list?campaignId=X` | Lista conjuntos da campanha | `{ success, adsets[] }` |
| GET | `/api/meta/creatives?campaignId=X` | Busca criativos dos anúncios | `{ success, creatives[] }` |
| GET | `/api/diagnostics/list?campaignId=X` | Lista diagnósticos salvos (já dá pra fazer só com Supabase) | `{ success, diagnostics[] }` |

---

## 🎨 Componentes para Criar

| Componente | Arquivo | Descrição |
|-----------|---------|-----------|
| `AdsetsPanel` | `src/components/campaigns/AdsetsPanel.tsx` | Tabela de conjuntos com ações |
| `AdCreatives` | `src/components/campaigns/AdCreatives.tsx` | Grid de criativos com preview |
| `DiagnosticsHistory` | `src/components/campaigns/DiagnosticsHistory.tsx` | Modal de histórico de diagnósticos |

---

## 🔄 Fluxo de Deploy

```bash
# 1. Você faz as alterações no IDE
# 2. Commit e push pro GitHub (victorrmd05-dev/synapse)

cd /root/synapse
git pull origin main

# 3. Rebuild
npm run build

# 4. Copiar assets pro standalone + restart
cp -r .next/static .next/standalone/.next/
pm2 restart synapse

# 5. Testar
curl -s https://synapse.zedocarro.cloud/meta-ads/campanhas | head -5
```