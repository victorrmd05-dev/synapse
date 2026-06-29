const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID; // Deve ser preenchido no .env.local
const GRAPH = 'https://graph.facebook.com/v19.0';

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
  datePreset: string = 'maximum'
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
    `?level=campaign&fields=${fields}&date_preset=${datePreset}&limit=500` +
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
