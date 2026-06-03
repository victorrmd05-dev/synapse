const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID; // Deve ser preenchido no .env.local

export async function fetchMetaCampaigns() {
  if (!META_ACCESS_TOKEN || !AD_ACCOUNT_ID) {
    console.error('META_ACCESS_TOKEN ou META_AD_ACCOUNT_ID não configurado');
    return [];
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${AD_ACCOUNT_ID}/campaigns?fields=id,name,status,objective&access_token=${META_ACCESS_TOKEN}`);
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

export async function fetchMetaMetrics() {
  if (!META_ACCESS_TOKEN) {
    console.error('META_ACCESS_TOKEN não configurado no .env.local');
    return null;
  }
  // ... rest of the mock or real implementation
  return {
    impressoes: 15420,
    alcance: 12000,
    frequencia: 1.28,
    cliques_link: 345,
    valor_gasto: 500.25,
    landing_page_views: 310,
    checkouts_iniciados: 45,
    compras: 6,
    valor_conversao: 1200.00
  };
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
