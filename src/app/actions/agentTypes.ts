// Tipos compartilhados das server actions de agentes. Fica FORA de um arquivo
// 'use server' porque esses só podem exportar funções async.

export interface AgenteConfigRow {
  slug: string;
  nome: string;
  agents_md: string | null;
  soul_md: string | null;
  heartbeat_md: string | null;
  tools_md: string | null;
  skill_md: string | null;
  template_md: string | null;
  modelo: string;
  max_tokens: number;
  ativo: boolean;
  ultimo_sync_em: string | null;
}

export interface SyncResult {
  resumo: string;
  resultados: Array<{ slug: string; status: 'ok' | 'erro'; mensagem?: string }>;
}
