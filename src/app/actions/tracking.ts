'use server';

// Server actions do agente Tracking. Tudo que toca o TOKEN da Conversions API
// vive aqui (server, service_role) — o token NUNCA é devolvido ao browser.
// A UI só recebe campos seguros (sem capi_token) via getTrackingPixels().

import { supabaseServer } from '@/lib/supabase-server';

export interface TrackingPixelSafe {
  id: string;
  nome: string;
  pixel_id: string;
  test_event_code: string | null;
  dominio_permitido: string | null;
  ativo: boolean;
  padrao: boolean;
  tem_token: boolean; // só sinaliza se há token, sem expor o valor
  data_criacao: string;
}

// Lista os pixels SEM o token (seguro pro browser).
export async function getTrackingPixels(): Promise<TrackingPixelSafe[]> {
  const { data, error } = await supabaseServer
    .from('tracking_config')
    .select('id, nome, pixel_id, capi_token, test_event_code, dominio_permitido, ativo, padrao, data_criacao')
    .order('padrao', { ascending: false })
    .order('data_criacao', { ascending: true });

  if (error) {
    console.error('[getTrackingPixels]', error);
    return [];
  }
  return (data ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    pixel_id: p.pixel_id,
    test_event_code: p.test_event_code,
    dominio_permitido: p.dominio_permitido,
    ativo: p.ativo,
    padrao: p.padrao,
    tem_token: !!p.capi_token,
    data_criacao: p.data_criacao,
  }));
}

export interface SalvarPixelInput {
  id?: string;
  nome: string;
  pixel_id: string;
  capi_token?: string; // só atualiza se vier preenchido
  test_event_code?: string;
  dominio_permitido?: string;
  padrao?: boolean;
}

export async function salvarTrackingPixel(input: SalvarPixelInput) {
  if (!input.nome?.trim() || !input.pixel_id?.trim()) {
    throw new Error('Nome e Pixel ID são obrigatórios.');
  }

  // Se este vira o padrão, tira o padrão dos outros.
  if (input.padrao) {
    await supabaseServer.from('tracking_config').update({ padrao: false }).neq('id', input.id || '');
  }

  const row: Record<string, unknown> = {
    nome: input.nome.trim(),
    pixel_id: input.pixel_id.trim(),
    test_event_code: input.test_event_code?.trim() || null,
    dominio_permitido: input.dominio_permitido?.trim() || null,
    padrao: !!input.padrao,
    data_atualizacao: new Date().toISOString(),
  };
  // Só grava o token quando o usuário digita um novo (não apaga ao editar sem mexer).
  if (input.capi_token && input.capi_token.trim()) {
    row.capi_token = input.capi_token.trim();
  }

  if (input.id) {
    const { error } = await supabaseServer.from('tracking_config').update(row).eq('id', input.id);
    if (error) throw new Error('Falha ao atualizar pixel: ' + error.message);
  } else {
    const { error } = await supabaseServer.from('tracking_config').insert(row);
    if (error) throw new Error('Falha ao criar pixel: ' + error.message);
  }
  return { ok: true };
}

export async function setPixelAtivo(id: string, ativo: boolean) {
  const { error } = await supabaseServer
    .from('tracking_config')
    .update({ ativo, data_atualizacao: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error('Falha ao alterar status: ' + error.message);
  return { ok: true };
}

export async function excluirTrackingPixel(id: string) {
  const { error } = await supabaseServer.from('tracking_config').delete().eq('id', id);
  if (error) throw new Error('Falha ao excluir pixel: ' + error.message);
  return { ok: true };
}
