"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Radar, Play, Loader2, Plus, Save, Trash2, Star, Activity,
  CheckCircle2, XCircle, Zap, Settings2, ExternalLink, ChevronDown, ChevronRight,
} from 'lucide-react';
import {
  getTrackingPixels, salvarTrackingPixel, setPixelAtivo, excluirTrackingPixel,
  type TrackingPixelSafe,
} from '../actions/tracking';

interface DesignRow {
  id: string;
  campanha_id: string | null;
  codigo_html: string | null;
  data_criacao: string;
}
interface TrackingRow {
  id: string;
  design_id: string | null;
  tipo_funil: string | null;
  hierarquia_json: { ordem: number; evento: string; gatilho: string; parametros: string }[] | null;
  status: string | null;
  observacoes: string | null;
  data_atualizacao: string | null;
}
interface CampanhaRow { id: string; nome_projeto: string | null }
interface EventoRow {
  id: string; pixel_id: string | null; event_name: string | null;
  sucesso: boolean | null; page_url: string | null; created_at: string;
}

const CHECKLIST_EMQ = [
  'Hierarquia FOP definida e aprovada',
  'Advanced Matching no init (em, ph, external_id)',
  'event_id único, compartilhado client ↔ CAPI',
  'value + currency em todo evento com valor',
  'Persistência cookie + localStorage (visitorId + lead)',
  'Normalização de PII idêntica client e server',
  'Sem parâmetro-lixo (device_*, event_day, tracked_by)',
  'Pixel NÃO dentro de player de vídeo (Vturb)',
  'Eventos chegam 2× e deduplicados no Events Manager',
  'EMQ por evento ≥ 6.0 (meta 8.0)',
];

export default function TrackingPage() {
  const [designs, setDesigns] = useState<DesignRow[]>([]);
  const [trackings, setTrackings] = useState<TrackingRow[]>([]);
  const [campanhas, setCampanhas] = useState<Record<string, string>>({});
  const [eventos, setEventos] = useState<EventoRow[]>([]);
  const [pixels, setPixels] = useState<TrackingPixelSafe[]>([]);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState<string | null>(null);
  const [painelPixels, setPainelPixels] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);

  useEffect(() => {
    fetchTudo();
    carregarPixels();
    const ch = supabase
      .channel('tracking_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_tracking' }, fetchTudo)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_design' }, fetchTudo)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracking_eventos' }, fetchEventos)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchTudo() {
    const [d, t, c] = await Promise.all([
      supabase.from('workflow_design').select('id, campanha_id, codigo_html, data_criacao').not('codigo_html', 'is', null).order('data_criacao', { ascending: false }),
      supabase.from('workflow_tracking').select('id, design_id, tipo_funil, hierarquia_json, status, observacoes, data_atualizacao'),
      supabase.from('campanhas_producao').select('id, nome_projeto'),
    ]);
    if (d.data) setDesigns(d.data as DesignRow[]);
    if (t.data) setTrackings(t.data as TrackingRow[]);
    if (c.data) {
      const map: Record<string, string> = {};
      (c.data as CampanhaRow[]).forEach((x) => { map[x.id] = x.nome_projeto || 'Sem nome'; });
      setCampanhas(map);
    }
    await fetchEventos();
    setLoading(false);
  }

  async function fetchEventos() {
    const { data } = await supabase
      .from('tracking_eventos')
      .select('id, pixel_id, event_name, sucesso, page_url, created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setEventos(data as EventoRow[]);
  }

  async function carregarPixels() {
    setPixels(await getTrackingPixels());
  }

  function trackingDoDesign(designId: string) {
    return trackings.find((t) => t.design_id === designId) || null;
  }

  async function instalar(design: DesignRow) {
    setErro(null);
    setGerando((p) => new Set(p).add(design.id));
    try {
      const res = await fetch('/api/tracking/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ design_id: design.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.detalhe || 'Falha ao instalar tracking');
      await fetchTudo();
      setExpandido(design.id);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao instalar tracking');
    } finally {
      setGerando((p) => { const n = new Set(p); n.delete(design.id); return n; });
    }
  }

  const temPixel = pixels.some((p) => p.ativo && p.tem_token);

  return (
    <div className="relative min-h-full pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-surface-elevated pb-5 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1 flex items-center gap-3">
            <Radar className="text-primary" size={28} /> Tracking
          </h1>
          <p className="text-secondary text-sm max-w-2xl">
            Instala a camada <span className="text-primary font-semibold">FOP</span> (Pixel + Advanced Matching +
            CAPI deduplicado) nas páginas geradas pelo Designer. Cada evento dispara 2× com o mesmo
            <code className="text-primary"> event_id</code> → o Meta deduplica e o EMQ sobe.
          </p>
        </div>
        <button
          onClick={() => setPainelPixels((v) => !v)}
          className="bg-surface hover:bg-surface-elevated text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors border border-surface-elevated whitespace-nowrap"
        >
          <Settings2 size={16} /> Pixels & Tokens
        </button>
      </div>

      {!temPixel && (
        <div className="mb-6 flex items-start gap-3 bg-status-yellow/10 border border-status-yellow/30 rounded-xl px-4 py-3 text-sm">
          <Zap size={18} className="text-status-yellow shrink-0 mt-0.5" />
          <div className="text-text-primary/90">
            Nenhum Pixel com token da Conversions API ativo. Clique em <b>Pixels &amp; Tokens</b> e
            cadastre seu Pixel ID + token da CAPI — sem isso o disparo server-side (que faz o EMQ subir) não roda.
          </div>
        </div>
      )}

      {painelPixels && <PainelPixels pixels={pixels} onChange={carregarPixels} />}

      {erro && (
        <div className="mb-6 flex items-center gap-2 bg-status-red/10 border border-status-red/30 rounded-xl px-4 py-3 text-sm text-status-red">
          <XCircle size={16} /> {erro}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-secondary"><Loader2 size={16} className="animate-spin" /> Carregando…</div>
      ) : (
        <div className="grid grid-cols-[1fr_320px] gap-6">
          {/* Fila de páginas pra rastrear */}
          <div className="space-y-3">
            {designs.length === 0 ? (
              <div className="text-center text-secondary py-20 bg-surface border border-surface-elevated rounded-xl">
                <Radar size={40} className="mx-auto mb-4 opacity-30" />
                Nenhuma página gerada ainda. Gere uma landing no <span className="text-primary">Designer</span> primeiro.
              </div>
            ) : (
              designs.map((d) => {
                const tk = trackingDoDesign(d.id);
                const isGerando = gerando.has(d.id);
                const aberto = expandido === d.id;
                return (
                  <div key={d.id} className="bg-surface border border-surface-elevated rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3">
                      <button
                        onClick={() => setExpandido(aberto ? null : d.id)}
                        className="flex items-center gap-3 min-w-0 text-left"
                      >
                        {aberto ? <ChevronDown size={16} className="text-secondary shrink-0" /> : <ChevronRight size={16} className="text-secondary shrink-0" />}
                        <div className="min-w-0">
                          <div className="text-white font-semibold text-sm truncate">
                            {(d.campanha_id && campanhas[d.campanha_id]) || 'Página sem campanha'}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {tk?.status === 'instalado' ? (
                              <span className="text-[11px] text-status-green flex items-center gap-1">
                                <CheckCircle2 size={11} /> FOP instalado · Funil {tk.tipo_funil}
                              </span>
                            ) : (
                              <span className="text-[11px] text-secondary">Sem tracking</span>
                            )}
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => instalar(d)}
                        disabled={isGerando}
                        title={tk?.status === 'instalado' ? 'Reinstalar tracking' : 'Instalar tracking FOP'}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 shrink-0"
                      >
                        {isGerando ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                        {isGerando ? 'Instalando…' : tk?.status === 'instalado' ? 'Reinstalar' : 'Instalar FOP'}
                      </button>
                    </div>

                    {aberto && (
                      <div className="border-t border-surface-elevated px-4 py-4 bg-[#0f0f16]">
                        {tk?.observacoes && (
                          <p className="text-xs text-secondary mb-3 italic">Diagnóstico: {tk.observacoes}</p>
                        )}
                        {tk?.hierarquia_json && tk.hierarquia_json.length > 0 ? (
                          <div>
                            <div className="text-[11px] uppercase tracking-wider text-secondary/70 mb-2">Escada de eventos FOP</div>
                            <div className="space-y-1">
                              {tk.hierarquia_json.map((ev) => (
                                <div key={ev.ordem} className="flex items-center gap-3 text-xs">
                                  <span className="w-5 h-5 rounded bg-primary/15 text-primary flex items-center justify-center font-bold shrink-0">{ev.ordem}</span>
                                  <span className="text-white font-semibold w-36 shrink-0">{ev.evento}</span>
                                  <span className="text-secondary truncate">{ev.gatilho}</span>
                                  <span className="text-secondary/60 ml-auto truncate hidden md:block">{ev.parametros}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-secondary">
                            Clique em <b>Instalar FOP</b> para o agente diagnosticar o funil e injetar o tracking nesta página.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Coluna lateral: eventos + checklist */}
          <div className="space-y-6">
            <div className="bg-surface border border-surface-elevated rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity size={16} className="text-primary" />
                <h3 className="text-white font-bold text-sm">Eventos recentes (CAPI)</h3>
              </div>
              {eventos.length === 0 ? (
                <p className="text-xs text-secondary py-4 text-center">Nenhum evento ainda. Eles aparecem quando a página no ar dispara.</p>
              ) : (
                <div className="space-y-1.5 max-h-[320px] overflow-y-auto custom-scrollbar">
                  {eventos.map((e) => (
                    <div key={e.id} className="flex items-center gap-2 text-xs">
                      {e.sucesso ? <CheckCircle2 size={12} className="text-status-green shrink-0" /> : <XCircle size={12} className="text-status-red shrink-0" />}
                      <span className="text-white font-medium">{e.event_name}</span>
                      <span className="text-secondary/60 ml-auto shrink-0">{new Date(e.created_at).toLocaleTimeString('pt-BR')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-surface border border-surface-elevated rounded-xl p-4">
              <h3 className="text-white font-bold text-sm mb-3">Checklist EMQ (FOP)</h3>
              <div className="space-y-1.5">
                {CHECKLIST_EMQ.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-xs text-text-primary/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50 mt-1.5 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Painel de gestão de Pixels + tokens da Conversions API.
// ---------------------------------------------------------------------------
function PainelPixels({ pixels, onChange }: { pixels: TrackingPixelSafe[]; onChange: () => void }) {
  const vazio = { nome: '', pixel_id: '', capi_token: '', test_event_code: '', dominio_permitido: '', padrao: false };
  const [form, setForm] = useState(vazio);
  const [editId, setEditId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function salvar() {
    setSalvando(true); setMsg(null);
    try {
      await salvarTrackingPixel({ id: editId || undefined, ...form });
      setForm(vazio); setEditId(null);
      await onChange();
      setMsg('Pixel salvo.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Falha ao salvar.');
    } finally { setSalvando(false); }
  }

  function editar(p: TrackingPixelSafe) {
    setEditId(p.id);
    setForm({
      nome: p.nome, pixel_id: p.pixel_id, capi_token: '',
      test_event_code: p.test_event_code || '', dominio_permitido: p.dominio_permitido || '', padrao: p.padrao,
    });
  }

  return (
    <div className="mb-6 bg-surface border border-surface-elevated rounded-xl p-5">
      <div className="grid grid-cols-[1fr_1fr] gap-6">
        {/* Lista */}
        <div>
          <h3 className="text-white font-bold text-sm mb-3">Pixels cadastrados</h3>
          {pixels.length === 0 ? (
            <p className="text-xs text-secondary">Nenhum pixel. Cadastre ao lado →</p>
          ) : (
            <div className="space-y-2">
              {pixels.map((p) => (
                <div key={p.id} className="flex items-center gap-2 bg-[#0f0f16] border border-surface-elevated rounded-lg px-3 py-2">
                  {p.padrao && <Star size={13} className="text-status-yellow shrink-0" />}
                  <div className="min-w-0">
                    <div className="text-white text-sm font-semibold truncate">{p.nome}</div>
                    <div className="text-[11px] text-secondary">
                      ID {p.pixel_id} · {p.tem_token ? <span className="text-status-green">token ✓</span> : <span className="text-status-red">sem token</span>}
                      {p.test_event_code && <span className="text-status-yellow"> · teste</span>}
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-2 shrink-0">
                    <span
                      onClick={async () => { await setPixelAtivo(p.id, !p.ativo); onChange(); }}
                      title={p.ativo ? 'Ativo' : 'Inativo'}
                      className={`w-2.5 h-2.5 rounded-full cursor-pointer ${p.ativo ? 'bg-status-green' : 'bg-status-red/60'}`}
                    />
                    <button onClick={() => editar(p)} className="text-secondary hover:text-white text-xs">editar</button>
                    <button
                      onClick={async () => { if (confirm(`Excluir o pixel "${p.nome}"?`)) { await excluirTrackingPixel(p.id); onChange(); } }}
                      className="text-secondary hover:text-status-red"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form */}
        <div>
          <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
            <Plus size={14} className="text-primary" /> {editId ? 'Editar pixel' : 'Novo pixel'}
          </h3>
          <div className="space-y-2.5">
            <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome da oferta (ex: Emagrece Já)" className="w-full bg-[#0f0f16] border border-surface-elevated rounded-lg px-3 py-2 text-sm text-white placeholder-secondary/40 focus:outline-none focus:border-primary/40" />
            <input value={form.pixel_id} onChange={(e) => setForm({ ...form, pixel_id: e.target.value })} placeholder="Pixel ID (ex: 123456789012345)" className="w-full bg-[#0f0f16] border border-surface-elevated rounded-lg px-3 py-2 text-sm text-white placeholder-secondary/40 focus:outline-none focus:border-primary/40" />
            <input value={form.capi_token} onChange={(e) => setForm({ ...form, capi_token: e.target.value })} type="password" placeholder={editId ? 'Token CAPI (deixe vazio p/ manter)' : 'Token da Conversions API'} className="w-full bg-[#0f0f16] border border-surface-elevated rounded-lg px-3 py-2 text-sm text-white placeholder-secondary/40 focus:outline-none focus:border-primary/40" />
            <div className="grid grid-cols-2 gap-2.5">
              <input value={form.test_event_code} onChange={(e) => setForm({ ...form, test_event_code: e.target.value })} placeholder="Test Event Code" className="w-full bg-[#0f0f16] border border-surface-elevated rounded-lg px-3 py-2 text-sm text-white placeholder-secondary/40 focus:outline-none focus:border-primary/40" />
              <input value={form.dominio_permitido} onChange={(e) => setForm({ ...form, dominio_permitido: e.target.value })} placeholder="Domínio (CORS)" className="w-full bg-[#0f0f16] border border-surface-elevated rounded-lg px-3 py-2 text-sm text-white placeholder-secondary/40 focus:outline-none focus:border-primary/40" />
            </div>
            <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer">
              <input type="checkbox" checked={form.padrao} onChange={(e) => setForm({ ...form, padrao: e.target.checked })} className="accent-primary" />
              Pixel padrão (usado quando a campanha não especifica)
            </label>
            <div className="flex items-center gap-2 pt-1">
              <button onClick={salvar} disabled={salvando} className="flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50">
                {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
              </button>
              {editId && <button onClick={() => { setEditId(null); setForm(vazio); }} className="text-xs text-secondary hover:text-white">cancelar</button>}
              {msg && <span className="text-xs text-secondary">{msg}</span>}
            </div>
            <p className="text-[11px] text-secondary/60 flex items-center gap-1 pt-1">
              <ExternalLink size={11} /> O token é guardado só no servidor — nunca vai pro navegador.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
