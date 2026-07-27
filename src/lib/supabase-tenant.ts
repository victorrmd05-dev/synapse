// src/lib/supabase-tenant.ts
//
// PORTA ÚNICA para os dados de tenant (ads_minerados, autopsias, workflow_*).
// Hoje o app é de uso pessoal e existe UM Supabase: esta função devolve o
// client service_role de sempre. Ela existe para que, no dia em que cada
// cliente trouxer o próprio banco (BYOK), a troca aconteça NESTE arquivo em
// vez de nas dezenas de rotas que hoje importam supabaseServer direto.
//
// Regra: código NOVO de dados usa getTenantClient(). Código de CONTROLE
// (config do app, agentes_config, assinatura no futuro) continua em
// supabaseServer — a fronteira é documentada pelo nome que se chama.

import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseServer } from './supabase-server';

/** Contexto do tenant. Hoje vazio; ganha userId/credenciais no BYOK. */
export interface TenantCtx {
  userId?: string;
}

export function getTenantClient(_ctx?: TenantCtx): SupabaseClient {
  return supabaseServer;
}
