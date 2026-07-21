/**
 * Seleção de janela de data — compartilhada entre Dashboard, Campaigns e Detalhe.
 *
 * A Meta atribui a compra ao clique (janela padrão 7d clique / 1d view), então a
 * janela escolhida muda a leitura: Hoje/Ontem servem para pacing e anomalia;
 * 7 dias é a janela de trabalho; 14/30 dias são decisão de escalar/cortar.
 *
 * Presets viram `date_preset` da Graph API; "Personalizado" vira `time_range`.
 */

export type RangePresetId =
  | 'today'
  | 'yesterday'
  | 'last_3d'
  | 'last_7d'
  | 'last_14d'
  | 'last_30d'
  | 'custom';

export interface RangePreset {
  id: RangePresetId;
  label: string;
  /** Legenda curta com a intenção de uso (media buying). */
  hint: string;
}

/** Ordem e rótulos do dropdown (espelha o Gerenciador de Anúncios). */
export const RANGE_PRESETS: RangePreset[] = [
  { id: 'today', label: 'Hoje', hint: 'Pacing e anomalia — ROAS ainda imaturo' },
  { id: 'yesterday', label: 'Ontem', hint: 'Pacing do dia fechado' },
  { id: 'last_3d', label: 'Últimos 3 dias', hint: 'Leitura direcional — ruidoso' },
  { id: 'last_7d', label: 'Últimos 7 dias', hint: 'Janela de trabalho (recomendada)' },
  { id: 'last_14d', label: 'Últimos 14 dias', hint: 'Tendência com volume' },
  { id: 'last_30d', label: 'Últimos 30 dias', hint: 'Decisão de escalar / cortar' },
  { id: 'custom', label: 'Personalizado', hint: 'Escolha as datas De / Até' },
];

/** Seleção corrente. `since`/`until` (YYYY-MM-DD) só quando preset === 'custom'. */
export interface RangeSelection {
  preset: RangePresetId;
  since?: string;
  until?: string;
}

/** Default do cockpit: 7 dias — a janela mais acionável no dia a dia. */
export const DEFAULT_RANGE: RangeSelection = { preset: 'last_7d' };

const STORAGE_KEY = 'synapse.dateRange';

/** True quando a seleção é um período personalizado válido. */
export function isCustomValid(sel: RangeSelection): boolean {
  return sel.preset === 'custom' && Boolean(sel.since && sel.until);
}

/** Converte a seleção em query string para as rotas (`range=` ou `since=&until=`). */
export function rangeToQuery(sel: RangeSelection): string {
  if (isCustomValid(sel)) {
    return `since=${sel.since}&until=${sel.until}`;
  }
  const preset = sel.preset === 'custom' ? 'last_7d' : sel.preset;
  return `range=${preset}`;
}

/** Rótulo humano da seleção (para subtítulos: "dados reais · Últimos 7 dias"). */
export function rangeLabel(sel: RangeSelection): string {
  if (isCustomValid(sel)) {
    return `${formatBR(sel.since!)} – ${formatBR(sel.until!)}`;
  }
  return RANGE_PRESETS.find((p) => p.id === sel.preset)?.label ?? 'Últimos 7 dias';
}

/** DD/MM a partir de YYYY-MM-DD (sem depender de timezone). */
function formatBR(iso: string): string {
  const [, m, d] = iso.split('-');
  return d && m ? `${d}/${m}` : iso;
}

/** Lê a seleção salva no navegador (ou o default). */
export function loadRange(): RangeSelection {
  if (typeof window === 'undefined') return DEFAULT_RANGE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_RANGE;
    const parsed = JSON.parse(raw) as RangeSelection;
    if (parsed && parsed.preset) return parsed;
  } catch {
    /* ignora storage corrompido */
  }
  return DEFAULT_RANGE;
}

/** Persiste a seleção no navegador (lembra a escolha entre páginas). */
export function saveRange(sel: RangeSelection): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sel));
  } catch {
    /* storage indisponível — segue sem persistir */
  }
}

/** YYYY-MM-DD de hoje no fuso local (para limitar o calendário custom). */
export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}
