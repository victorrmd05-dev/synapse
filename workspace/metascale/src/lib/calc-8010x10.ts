import { EscalaStatus } from '@/types';

export function calculateMetrics(metrics: {
  cliques_link: number;
  landing_page_views: number;
  checkouts_iniciados: number;
  compras: number;
  roas: number;
}) {
  const { cliques_link, landing_page_views, checkouts_iniciados, compras, roas } = metrics;

  const connect_rate = cliques_link > 0 ? landing_page_views / cliques_link : 0;
  const conversao_lp = landing_page_views > 0 ? checkouts_iniciados / landing_page_views : 0;
  const conversao_checkout = checkouts_iniciados > 0 ? compras / checkouts_iniciados : 0;
  const conversao_global = landing_page_views > 0 ? compras / landing_page_views : 0;

  let escala_status: EscalaStatus = 'otimizar';

  if (
    connect_rate >= 0.8 &&
    conversao_lp >= 0.1 &&
    conversao_checkout >= 0.1 &&
    roas >= 2.0
  ) {
    escala_status = 'escalavel';
  } else if (
    connect_rate < 0.5 ||
    conversao_lp < 0.05 ||
    conversao_checkout < 0.05 ||
    roas < 1.0
  ) {
    escala_status = 'nao_escalar';
  }

  return {
    connect_rate,
    conversao_lp,
    conversao_checkout,
    conversao_global,
    escala_status,
  };
}

export function simulateScale(params: {
  orcamento: number;
  cpc_base: number;
  ctr_sim: number;
  connect_rate_sim: number;
  conversao_lp_sim: number;
  conversao_checkout_sim: number;
  ticket_medio: number;
  margem_produto: number;
}) {
  const {
    orcamento,
    cpc_base,
    connect_rate_sim,
    conversao_lp_sim,
    conversao_checkout_sim,
    ticket_medio,
    margem_produto,
  } = params;

  const cliques_est = Math.round(orcamento / (cpc_base || 1.85));
  const visitas_lp_est = Math.round(cliques_est * connect_rate_sim);
  const checkouts_est = Math.round(visitas_lp_est * conversao_lp_sim);
  const vendas_est = Math.round(checkouts_est * conversao_checkout_sim);
  
  const faturamento_est = vendas_est * ticket_medio;
  const roas_est = orcamento > 0 ? faturamento_est / orcamento : 0;
  const cpa_est = vendas_est > 0 ? orcamento / vendas_est : 0;
  
  const lucro_est = faturamento_est * margem_produto - orcamento;
  const margem_lucro_est = faturamento_est > 0 ? (lucro_est / faturamento_est) * 100 : 0;
  const conversao_global_sim = visitas_lp_est > 0 ? vendas_est / visitas_lp_est : 0;

  return {
    cliques_est,
    visitas_lp_est,
    checkouts_est,
    vendas_est,
    faturamento_est,
    roas_est,
    cpa_est,
    lucro_est,
    margem_lucro_est,
    conversao_global_sim
  };
}
