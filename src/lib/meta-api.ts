import type {
  Campaign,
  CampaignMetrics,
  EscalaStatus,
  CampaignAnalysis,
  BreakdownRow,
  BreakdownStatus,
} from '@/types';

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID; // Deve ser preenchido no .env.local
const GRAPH = 'https://graph.facebook.com/v19.0';

export interface MetaAccountInfo {
  id: string;
  name: string;
  currency: string;
  timezone_name: string;
  account_status: number;
}

/**
 * Janela de data para os insights. Ou um `preset` (date_preset da Graph API,
 * ex.: 'today', 'last_7d', 'last_30d') ou um período custom (`since`/`until`
 * em YYYY-MM-DD → time_range). Se `since`/`until` vierem, têm prioridade.
 */
export interface DateParams {
  preset?: string;
  since?: string;
  until?: string;
}

/** Monta o parâmetro de data da Graph API (date_preset ou time_range). */
function dateQuery(date: DateParams | string | undefined): string {
  // Compat: string simples é tratada como preset.
  if (typeof date === 'string') return `date_preset=${date}`;
  if (date?.since && date?.until) {
    const tr = JSON.stringify({ since: date.since, until: date.until });
    return `time_range=${encodeURIComponent(tr)}`;
  }
  return `date_preset=${date?.preset || 'last_30d'}`;
}

/**
 * Busca os metadados da conta de anúncios (nome, moeda, status).
 */
export async function fetchAccountInfo(): Promise<MetaAccountInfo | null> {
  if (!hasMetaCredentials()) {
    console.error('META_ACCESS_TOKEN ou META_AD_ACCOUNT_ID não configurado');
    return null;
  }

  try {
    const url = `${GRAPH}/${AD_ACCOUNT_ID}?fields=name,account_status,currency,timezone_name&access_token=${META_ACCESS_TOKEN}`;
    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json();

    if (data.error) throw new Error(data.error.message);

    return {
      id: data.id,
      name: data.name,
      currency: data.currency,
      timezone_name: data.timezone_name,
      account_status: data.account_status,
    };
  } catch (error) {
    console.error('Erro ao buscar dados da conta Meta:', error);
    return null;
  }
}

export async function fetchMetaCampaigns() {
  if (!META_ACCESS_TOKEN || !AD_ACCOUNT_ID) {
    console.error('META_ACCESS_TOKEN ou META_AD_ACCOUNT_ID não configurado');
    return [];
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${AD_ACCOUNT_ID}/campaigns?fields=id,name,status,effective_status,objective&access_token=${META_ACCESS_TOKEN}`);
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    return data.data;
  } catch (error) {
    console.error('Erro ao buscar campanhas da Meta:', error);
    return [];
  }
}

/** Linha de insights crua (já normalizada em números) por campanha. */
export interface MetaInsightRow {
  meta_campaign_id: string;
  impressoes: number;
  alcance: number;
  frequencia: number;
  cliques_link: number;
  ctr: number;
  cpc: number;
  cpm: number;
  valor_gasto: number;
  landing_page_views: number;
  checkouts_iniciados: number;
  compras: number;
  valor_conversao: number;
  roas: number;
}

type MetaAction = { action_type: string; value: string };

/**
 * Soma o valor da primeira action_type encontrada na lista de candidatos.
 * A Meta expõe o mesmo evento sob nomes diferentes (ex: 'purchase',
 * 'omni_purchase', 'offsite_conversion.fb_pixel_purchase') dependendo da
 * configuração de tracking — por isso testamos vários e pegamos o primeiro.
 */
function extractAction(actions: MetaAction[] | undefined, candidates: string[]): number {
  if (!actions || !Array.isArray(actions)) return 0;
  for (const type of candidates) {
    const hit = actions.find((a) => a.action_type === type);
    if (hit) return parseFloat(hit.value) || 0;
  }
  return 0;
}

/**
 * Busca insights reais (level=campaign) da conta inteira em uma chamada.
 * Campanhas sem entrega no período simplesmente não aparecem no retorno.
 * date_preset 'maximum' = histórico completo (snapshot de validação).
 */
export async function fetchMetaInsights(
  date: DateParams | string = 'maximum'
): Promise<MetaInsightRow[]> {
  if (!META_ACCESS_TOKEN || !AD_ACCOUNT_ID) {
    console.error('META_ACCESS_TOKEN ou META_AD_ACCOUNT_ID não configurado');
    return [];
  }

  const fields = [
    'campaign_id',
    'impressions',
    'reach',
    'frequency',
    'clicks',
    'inline_link_clicks',
    'ctr',
    'cpc',
    'cpm',
    'spend',
    'actions',
    'action_values',
    'purchase_roas',
  ].join(',');

  const url =
    `https://graph.facebook.com/v19.0/${AD_ACCOUNT_ID}/insights` +
    `?level=campaign&fields=${fields}&${dateQuery(date)}&limit=500` +
    `&access_token=${META_ACCESS_TOKEN}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('[meta-api] erro em /insights:', data.error);
      throw new Error(data.error.message);
    }

    const rows: any[] = data.data || [];

    return rows.map((r): MetaInsightRow => {
      const landing_page_views = extractAction(r.actions, [
        'landing_page_view',
        'omni_landing_page_view',
      ]);
      const checkouts_iniciados = extractAction(r.actions, [
        'omni_initiated_checkout',
        'initiate_checkout',
        'offsite_conversion.fb_pixel_initiate_checkout',
      ]);
      const compras = extractAction(r.actions, [
        'omni_purchase',
        'purchase',
        'offsite_conversion.fb_pixel_purchase',
      ]);
      const valor_conversao = extractAction(r.action_values, [
        'omni_purchase',
        'purchase',
        'offsite_conversion.fb_pixel_purchase',
      ]);
      const roas = extractAction(r.purchase_roas, ['omni_purchase', 'purchase']);
      // inline_link_clicks é o clique no link de fato; clicks inclui todos os cliques
      const cliques_link =
        parseFloat(r.inline_link_clicks) || parseFloat(r.clicks) || 0;

      return {
        meta_campaign_id: r.campaign_id,
        impressoes: parseInt(r.impressions) || 0,
        alcance: parseInt(r.reach) || 0,
        frequencia: parseFloat(r.frequency) || 0,
        cliques_link,
        ctr: parseFloat(r.ctr) || 0,
        cpc: parseFloat(r.cpc) || 0,
        cpm: parseFloat(r.cpm) || 0,
        valor_gasto: parseFloat(r.spend) || 0,
        landing_page_views,
        checkouts_iniciados,
        compras,
        valor_conversao,
        roas,
      };
    });
  } catch (error) {
    console.error('[meta-api] Falha ao buscar insights da Meta:', error);
    return [];
  }
}

// --- Insights → CampaignMetrics (dashboard com janela de data) --------------

/** Deriva o status de escala a partir de ROAS e volume de compras. */
function computeEscalaStatus(roas: number, compras: number): EscalaStatus {
  if (compras >= 1 && roas >= 2) return 'escalavel';
  if (roas >= 1) return 'otimizar';
  return 'nao_escalar';
}

/** Converte um objeto insight bruto da Graph API em CampaignMetrics. */
function mapInsightToMetrics(insight: any, campaignId: string): CampaignMetrics {
  const impressoes = parseInt(insight.impressions, 10) || 0;
  const alcance = parseInt(insight.reach, 10) || 0;
  const frequencia = parseFloat(insight.frequency) || 0;
  const valor_gasto = parseFloat(insight.spend) || 0;
  const cpm = parseFloat(insight.cpm) || 0;

  // Usa o extractAction robusto (tolera variantes omni_/offsite_ de tracking).
  const cliques_link =
    parseFloat(insight.inline_link_clicks) ||
    extractAction(insight.actions, ['link_click']) ||
    parseFloat(insight.clicks) ||
    0;
  const landing_page_views = extractAction(insight.actions, [
    'landing_page_view',
    'omni_landing_page_view',
  ]);
  const checkouts_iniciados = extractAction(insight.actions, [
    'omni_initiated_checkout',
    'initiate_checkout',
    'offsite_conversion.fb_pixel_initiate_checkout',
  ]);
  const compras = extractAction(insight.actions, [
    'omni_purchase',
    'purchase',
    'offsite_conversion.fb_pixel_purchase',
  ]);
  const valor_conversao = extractAction(insight.action_values, [
    'omni_purchase',
    'purchase',
    'offsite_conversion.fb_pixel_purchase',
  ]);

  // CTR e CPC baseados em cliques de link (mais relevantes que all-clicks).
  const ctr = impressoes > 0 ? (cliques_link / impressoes) * 100 : 0;
  const cpc = cliques_link > 0 ? valor_gasto / cliques_link : 0;
  const roas = valor_gasto > 0 ? valor_conversao / valor_gasto : 0;
  const cpa = compras > 0 ? valor_gasto / compras : 0;

  const connect_rate = cliques_link > 0 ? landing_page_views / cliques_link : 0;
  const conversao_lp = landing_page_views > 0 ? checkouts_iniciados / landing_page_views : 0;
  const conversao_checkout = checkouts_iniciados > 0 ? compras / checkouts_iniciados : 0;
  const conversao_global = impressoes > 0 ? compras / impressoes : 0;

  return {
    id: `${campaignId}-${insight.date_stop || 'current'}`,
    campaign_id: campaignId,
    data: insight.date_stop || new Date().toISOString(),
    impressoes,
    alcance,
    frequencia,
    cliques_link,
    ctr,
    cpc,
    cpm,
    valor_gasto,
    landing_page_views,
    checkouts_iniciados,
    compras,
    valor_conversao,
    roas,
    cpa,
    connect_rate,
    conversao_lp,
    conversao_checkout,
    conversao_global,
    escala_status: computeEscalaStatus(roas, compras),
    criado_em: new Date().toISOString(),
  };
}

/**
 * Busca insights de todas as campanhas em uma única chamada e indexa por campaign_id.
 */
async function fetchInsightsByCampaign(date: DateParams): Promise<Record<string, any>> {
  const fields = [
    'campaign_id',
    'campaign_name',
    'impressions',
    'reach',
    'frequency',
    'clicks',
    'inline_link_clicks',
    'ctr',
    'cpc',
    'cpm',
    'spend',
    'actions',
    'action_values',
  ].join(',');

  const url = `${GRAPH}/${AD_ACCOUNT_ID}/insights?level=campaign&${dateQuery(date)}&fields=${fields}&limit=200&access_token=${META_ACCESS_TOKEN}`;
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json();

  if (data.error) throw new Error(data.error.message);

  const byId: Record<string, any> = {};
  for (const insight of data.data || []) {
    byId[insight.campaign_id] = insight;
  }
  return byId;
}

/**
 * Retorna todas as campanhas da conta já enriquecidas com suas métricas reais.
 * Esta é a função consumida pelo dashboard para sincronizar com a Meta.
 */
export async function fetchCampaignsWithMetrics(
  date: DateParams = { preset: 'last_30d' }
): Promise<Campaign[]> {
  if (!hasMetaCredentials()) {
    console.error('Credenciais Meta ausentes no .env.local');
    return [];
  }

  const [campaigns, insightsById] = await Promise.all([
    fetchMetaCampaigns(),
    fetchInsightsByCampaign(date).catch((err) => {
      console.error('Erro ao buscar insights da Meta:', err);
      return {} as Record<string, any>;
    }),
  ]);

  return (campaigns || []).map((c: any): Campaign => {
    const insight = insightsById[c.id];
    return {
      id: c.id,
      ad_account_id: AD_ACCOUNT_ID as string,
      meta_campaign_id: c.id,
      nome: c.name,
      status: c.status,
      objetivo: c.objective,
      ativo: c.status === 'ACTIVE',
      criado_em: new Date().toISOString(),
      metrics: insight ? mapInsightToMetrics(insight, c.id) : undefined,
    };
  });
}

/**
 * Cria uma campanha de teste para validar permissões de escrita
 */
export async function createTestCampaign() {
  if (!META_ACCESS_TOKEN || !AD_ACCOUNT_ID) {
    throw new Error('META_ACCESS_TOKEN ou META_AD_ACCOUNT_ID ausente no .env.local');
  }

  const url = `https://graph.facebook.com/v19.0/${AD_ACCOUNT_ID}/campaigns`;
  
  const params = new URLSearchParams({
    name: 'Teste IA Antigravity - Campanha de Curtidas',
    objective: 'OUTCOME_ENGAGEMENT',
    status: 'PAUSED',
    special_ad_categories: '[]',
    is_adset_budget_sharing_enabled: 'false',
    access_token: META_ACCESS_TOKEN
  });

  try {
    const response = await fetch(`${url}?${params.toString()}`, {
      method: 'POST',
    });

    const data = await response.json();

    if (data.error) {
      return { success: false, error: data.error };
    }

    return { success: true, campaign_id: data.id };
  } catch (error: any) {
    return { success: false, error: { message: error.message } };
  }
}

/**
 * Cria um conjunto de anúncios (AdSet)
 */
export async function createAdSet(campaignId: string, name: string, dailyBudget: number) {
  if (!META_ACCESS_TOKEN || !AD_ACCOUNT_ID) {
    throw new Error('META_ACCESS_TOKEN ou META_AD_ACCOUNT_ID ausente no .env.local');
  }

  const url = `https://graph.facebook.com/v19.0/${AD_ACCOUNT_ID}/adsets`;
  
  // Meta API espera orçamento em centavos (ex: 5.00 -> 500)
  const budgetInCents = Math.round(dailyBudget * 100);

  const params = new URLSearchParams({
    name: name,
    campaign_id: campaignId,
    daily_budget: budgetInCents.toString(),
    billing_event: 'IMPRESSIONS',
    optimization_goal: 'LINK_CLICKS',
    bid_amount: '100', // Bid de R$ 1,00 como exemplo
    targeting: JSON.stringify({
      geo_locations: { countries: ['BR'] },
      publisher_platforms: ['facebook', 'instagram']
    }),
    status: 'PAUSED',
    access_token: META_ACCESS_TOKEN
  });

  try {
    const response = await fetch(`${url}?${params.toString()}`, {
      method: 'POST',
    });

    const data = await response.json();

    if (data.error) {
      return { success: false, error: data.error };
    }

    return { success: true, adset_id: data.id };
  } catch (error: any) {
    return { success: false, error: { message: error.message } };
  }
}

/**
 * Cria um criativo básico (necessário para o anúncio)
 * Nota: Geralmente requer um ID de página e uma imagem/vídeo.
 * Como o usuário quer subir manual, tentaremos criar um rascunho.
 */
export async function createAdCreative(name: string, pageId: string) {
  if (!META_ACCESS_TOKEN || !AD_ACCOUNT_ID) {
    throw new Error('META_ACCESS_TOKEN ou META_AD_ACCOUNT_ID ausente no .env.local');
  }

  const url = `https://graph.facebook.com/v19.0/${AD_ACCOUNT_ID}/adcreatives`;
  
  const params = new URLSearchParams({
    name: name,
    object_story_spec: JSON.stringify({
      page_id: pageId,
      link_data: {
        message: 'Draft Ad - Finalize no Gerenciador',
        link: 'https://facebook.com', // URL placeholder
        name: 'Anúncio MetaScale'
      }
    }),
    access_token: META_ACCESS_TOKEN
  });

  try {
    const response = await fetch(`${url}?${params.toString()}`, {
      method: 'POST',
    });

    const data = await response.json();

    if (data.error) {
      return { success: false, error: data.error };
    }

    return { success: true, creative_id: data.id };
  } catch (error: any) {
    return { success: false, error: { message: error.message } };
  }
}

/**
 * Cria o objeto do anúncio (Ad)
 */
export async function createAd(adsetId: string, creativeId: string, name: string) {
  if (!META_ACCESS_TOKEN || !AD_ACCOUNT_ID) {
    throw new Error('META_ACCESS_TOKEN ou META_AD_ACCOUNT_ID ausente no .env.local');
  }

  const url = `https://graph.facebook.com/v19.0/${AD_ACCOUNT_ID}/ads`;
  
  const params = new URLSearchParams({
    name: name,
    adset_id: adsetId,
    creative: JSON.stringify({ creative_id: creativeId }),
    status: 'PAUSED',
    access_token: META_ACCESS_TOKEN
  });

  try {
    const response = await fetch(`${url}?${params.toString()}`, {
      method: 'POST',
    });

    const data = await response.json();

    if (data.error) {
      return { success: false, error: data.error };
    }

    return { success: true, ad_id: data.id };
  } catch (error: any) {
    return { success: false, error: { message: error.message } };
  }
}

// ===========================================================================
// DUPLICAÇÃO DE CAMPANHA (execução autônoma v1 — "duplicar + ajustar")
// Lê a estrutura da campanha-fonte e recria em PAUSED aplicando ajustes.
// ===========================================================================

async function graphGet(pathAndQuery: string): Promise<any> {
  const sep = pathAndQuery.includes('?') ? '&' : '?';
  const res = await fetch(`${GRAPH}/${pathAndQuery}${sep}access_token=${META_ACCESS_TOKEN}`);
  const data = await res.json();
  if (data.error) throw new Error(`[Graph GET ${pathAndQuery}] ${data.error.message}`);
  return data;
}

async function graphPost(path: string, body: Record<string, string>): Promise<any> {
  const params = new URLSearchParams({ ...body, access_token: META_ACCESS_TOKEN! });
  const res = await fetch(`${GRAPH}/${path}`, { method: 'POST', body: params });
  const data = await res.json();
  if (data.error) {
    const e = data.error;
    const extra = [e.error_user_title, e.error_user_msg].filter(Boolean).join(' — ');
    throw new Error(
      `[Graph POST ${path}] ${e.message}${extra ? ` (${extra})` : ''}` +
        `${e.error_subcode ? ` [subcode ${e.error_subcode}]` : ''}`
    );
  }
  return data;
}

export interface SourceAdSet {
  id: string;
  name: string;
  daily_budget?: string;
  lifetime_budget?: string;
  billing_event?: string;
  optimization_goal?: string;
  bid_strategy?: string;
  bid_amount?: string;
  targeting?: any;
  promoted_object?: any;
  destination_type?: string;
  attribution_spec?: any;
}

/** Lê os conjuntos de anúncios (com config completa) da campanha-fonte. */
export async function getCampaignAdSets(campaignId: string): Promise<SourceAdSet[]> {
  const fields =
    'name,daily_budget,lifetime_budget,billing_event,optimization_goal,bid_strategy,bid_amount,targeting,promoted_object,destination_type,attribution_spec';
  const data = await graphGet(`${campaignId}/adsets?fields=${fields}&limit=50`);
  return (data.data || []) as SourceAdSet[];
}

/** Lê os anúncios de um conjunto (id + creative.id). */
export async function getAdSetAds(adsetId: string): Promise<{ id: string; name: string; creative?: { id: string } }[]> {
  const data = await graphGet(`${adsetId}/ads?fields=name,creative{id}&limit=50`);
  return (data.data || []) as { id: string; name: string; creative?: { id: string } }[];
}

/** Cria uma campanha nova (ABO — orçamento no conjunto). Sempre PAUSED. */
export async function createCampaignV2(name: string, objective: string): Promise<string> {
  const data = await graphPost(`${AD_ACCOUNT_ID}/campaigns`, {
    name,
    objective,
    status: 'PAUSED',
    special_ad_categories: '[]',
    is_adset_budget_sharing_enabled: 'false', // ABO — orçamento no conjunto
  });
  return data.id as string;
}

/** Cria um conjunto de anúncios duplicando a config da fonte (com ajustes). Sempre PAUSED. */
export async function createAdSetV2(params: {
  campaignId: string;
  name: string;
  dailyBudgetCents: number;
  billingEvent?: string;
  optimizationGoal?: string;
  bidStrategy?: string;
  bidAmount?: string;
  targeting: any;
  promotedObject?: any;
  destinationType?: string;
}): Promise<string> {
  const body: Record<string, string> = {
    campaign_id: params.campaignId,
    name: params.name,
    status: 'PAUSED',
    daily_budget: String(params.dailyBudgetCents),
    billing_event: params.billingEvent || 'IMPRESSIONS',
    optimization_goal: params.optimizationGoal || 'LINK_CLICKS',
    // Lance automático: não exige bid_amount (evita subcode 2490487).
    bid_strategy: params.bidStrategy || 'LOWEST_COST_WITHOUT_CAP',
    targeting: JSON.stringify(params.targeting || { geo_locations: { countries: ['BR'] } }),
  };
  if (params.bidStrategy && params.bidAmount) body.bid_amount = params.bidAmount;
  if (params.promotedObject) body.promoted_object = JSON.stringify(params.promotedObject);
  if (params.destinationType) body.destination_type = params.destinationType;
  const data = await graphPost(`${AD_ACCOUNT_ID}/adsets`, body);
  return data.id as string;
}

/** Apaga uma entidade (campanha/conjunto/anúncio) por id. Usado p/ limpar criação parcial. */
export async function deleteEntity(id: string): Promise<void> {
  const res = await fetch(`${GRAPH}/${id}?access_token=${META_ACCESS_TOKEN}`, { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  if (data?.error) throw new Error(`[Graph DELETE ${id}] ${data.error.message}`);
}

/** Cria um anúncio reaproveitando o criativo existente da fonte. Sempre PAUSED. */
export async function createAdV2(adsetId: string, name: string, creativeId: string): Promise<string> {
  const data = await graphPost(`${AD_ACCOUNT_ID}/ads`, {
    name,
    adset_id: adsetId,
    creative: JSON.stringify({ creative_id: creativeId }),
    status: 'PAUSED',
  });
  return data.id as string;
}

// --- Análise Profunda: quebras por conjunto / posicionamento / público ------

const ANALYSIS_FIELDS = 'spend,impressions,clicks,actions,action_values';

/** Classifica uma linha de quebra em escalar / otimizar / pausar. */
function classify(roas: number, compras: number, spend: number): BreakdownStatus {
  if (roas >= 2 && compras >= 1) return 'escalar';
  if (spend >= 50 && roas < 1) return 'pausar';
  return 'otimizar';
}

/** Converte um insight bruto (de qualquer quebra) numa linha padronizada. */
function mapBreakdownRow(insight: any, label: string): BreakdownRow {
  const spend = parseFloat(insight.spend) || 0;
  const impressoes = parseInt(insight.impressions, 10) || 0;
  const compras = extractAction(insight.actions, ['omni_purchase', 'purchase', 'offsite_conversion.fb_pixel_purchase']);
  const faturamento = extractAction(insight.action_values, ['omni_purchase', 'purchase', 'offsite_conversion.fb_pixel_purchase']);
  const lp_views = extractAction(insight.actions, ['landing_page_view', 'omni_landing_page_view']);
  const checkouts = extractAction(insight.actions, ['omni_initiated_checkout', 'initiate_checkout', 'offsite_conversion.fb_pixel_initiate_checkout']);
  const roas = spend > 0 ? faturamento / spend : 0;
  const cpa = compras > 0 ? spend / compras : 0;
  return {
    label,
    spend,
    impressoes,
    compras,
    faturamento,
    roas,
    cpa,
    lp_views,
    checkouts,
    status: classify(roas, compras, spend),
  };
}

async function fetchInsightRows(campaignId: string, query: string): Promise<any[]> {
  const url = `${GRAPH}/${campaignId}/insights?${query}&access_token=${META_ACCESS_TOKEN}`;
  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data || [];
}

/**
 * Puxa as quebras de uma campanha (conjunto, posicionamento, público) e devolve
 * linhas já com ROAS/CPA e classificação, ordenadas por gasto.
 */
export async function fetchCampaignAnalysis(
  campaignId: string,
  date: DateParams | string = { preset: 'last_30d' }
): Promise<CampaignAnalysis> {
  if (!META_ACCESS_TOKEN || !AD_ACCOUNT_ID) {
    throw new Error('Credenciais Meta ausentes no .env.local');
  }

  const dq = dateQuery(date);
  const [adsetRaw, placeRaw, ageRaw] = await Promise.all([
    fetchInsightRows(
      campaignId,
      `level=adset&${dq}&fields=adset_id,adset_name,${ANALYSIS_FIELDS}&limit=300`
    ),
    fetchInsightRows(
      campaignId,
      `${dq}&breakdowns=publisher_platform,platform_position&fields=${ANALYSIS_FIELDS}&limit=300`
    ),
    fetchInsightRows(
      campaignId,
      `${dq}&breakdowns=age,gender&fields=${ANALYSIS_FIELDS}&limit=300`
    ),
  ]);

  const byAdset = adsetRaw
    .map((r) => ({ ...mapBreakdownRow(r, r.adset_name || 'Conjunto'), id: r.adset_id }))
    .sort((a, b) => b.spend - a.spend);
  const byPlacement = placeRaw
    .map((r) => mapBreakdownRow(r, `${r.publisher_platform} / ${r.platform_position}`))
    .sort((a, b) => b.spend - a.spend);
  const byAge = ageRaw
    .map((r) => mapBreakdownRow(r, `${r.age} · ${r.gender}`))
    .sort((a, b) => b.spend - a.spend);

  return { byAdset, byPlacement, byAge };
}

/**
 * Altera o status de um conjunto (ad set) na conta real — PAUSED ou ACTIVE.
 * Requer que o token tenha permissão de escrita (ads_management).
 */
export async function updateAdsetStatus(
  adsetId: string,
  status: 'PAUSED' | 'ACTIVE'
): Promise<{ success: boolean; error?: string }> {
  if (!META_ACCESS_TOKEN) {
    return { success: false, error: 'META_ACCESS_TOKEN ausente no .env.local.' };
  }
  try {
    const params = new URLSearchParams({ status, access_token: META_ACCESS_TOKEN });
    const res = await fetch(`${GRAPH}/${adsetId}?${params.toString()}`, { method: 'POST' });
    const data = await res.json();
    if (data.error) return { success: false, error: data.error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Falha ao atualizar o conjunto.' };
  }
}

/**
 * Verifica se as credenciais da Meta estão presentes no ambiente.
 */
export function hasMetaCredentials(): boolean {
  return Boolean(META_ACCESS_TOKEN && AD_ACCOUNT_ID);
}
