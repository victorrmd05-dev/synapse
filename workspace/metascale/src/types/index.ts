export type Role = 'admin' | 'viewer';

export interface Profile {
  id: string;
  nome: string;
  role: Role;
  criado_em: string;
}

export interface MetaAdAccount {
  id: string;
  user_id: string;
  account_id: string;
  account_name: string;
  access_token: string;
  token_expires_at?: string;
  ativo: boolean;
  criado_em: string;
}

export interface Campaign {
  id: string;
  ad_account_id: string;
  meta_campaign_id: string;
  nome: string;
  status: string;
  objetivo: string;
  ativo: boolean;
  criado_em: string;
  metrics?: CampaignMetrics; // Ultima métrica associada
}

export type EscalaStatus = 'escalavel' | 'otimizar' | 'nao_escalar';

export interface CampaignMetrics {
  id: string;
  campaign_id: string;
  data: string;
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
  cpa: number;
  connect_rate: number;
  conversao_lp: number;
  conversao_checkout: number;
  conversao_global: number;
  escala_status: EscalaStatus;
  criado_em: string;
}

export interface Recommendation {
  texto: string;
  prioridade: 'alta' | 'media' | 'baixa';
}

export interface AIDiagnostic {
  id: string;
  campaign_id: string;
  metrics_id: string;
  data: string;
  gargalo: string;
  diagnostico: string;
  recomendacoes: Recommendation[];
  prioridade: string;
  criado_em: string;
}

export interface ScaleSimulation {
  id: string;
  campaign_id?: string;
  user_id: string;
  orcamento: number;
  ctr_sim: number;
  connect_rate_sim: number;
  conversao_lp_sim: number;
  conversao_checkout_sim: number;
  ticket_medio: number;
  margem_produto: number;
  cliques_est: number;
  visitas_lp_est: number;
  checkouts_est: number;
  vendas_est: number;
  faturamento_est: number;
  cpa_est: number;
  roas_est: number;
  lucro_est: number;
  margem_lucro_est: number;
  criado_em: string;
}
