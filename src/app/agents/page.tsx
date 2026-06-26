"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bot, Save, FileText, Loader2, Cpu, AlertCircle, FolderSync, Plus, ExternalLink,
} from 'lucide-react';
import {
  getAgentesConfig,
  syncAgentsFromFolder,
  saveAgentMarkdown,
  setAgenteAtivo,
} from '../actions/syncAgents';
import type { AgenteConfigRow } from '../actions/agentTypes';

// Ordem dos arquivos = ordem em que entram no system prompt (ver buildSystemPrompt).
const ARQUIVOS = [
  { field: 'soul_md', label: 'SOUL.md', desc: 'Personalidade e valores' },
  { field: 'agents_md', label: 'AGENTS.md', desc: 'Papel e fluxo de trabalho' },
  { field: 'tools_md', label: 'TOOLS.md', desc: 'Ferramentas disponíveis' },
  { field: 'skill_md', label: 'SKILL.md', desc: 'Skill especializada' },
  { field: 'heartbeat_md', label: 'HEARTBEAT.md', desc: 'Gatilhos autônomos' },
] as const;

type Field = (typeof ARQUIVOS)[number]['field'];

// Obrigatórios para todo agente — sempre visíveis, não podem ser removidos.
// Os demais (SOUL, TOOLS, HEARTBEAT) são opcionais e adicionados sob demanda no "+".
const OBRIGATORIOS: Field[] = ['agents_md', 'skill_md'];

// Ordem fixa de exibição dos agentes (hierarquia/fluxo do pipeline), não alfabética.
const ORDEM_AGENTES = [
  'alavanca-ceo', 'cto', 'minerador', 'copywriting',
  'revisor', 'designer-webmaster', 'video-maker', 'gestor-meta-ads',
];
function ordenarAgentes(lista: AgenteConfigRow[]): AgenteConfigRow[] {
  const idx = (slug: string) => {
    const i = ORDEM_AGENTES.indexOf(slug);
    return i === -1 ? ORDEM_AGENTES.length : i; // desconhecidos vão pro fim
  };
  return [...lista].sort((a, b) => idx(a.slug) - idx(b.slug));
}

// Página do dashboard que cada agente "opera". CEO e CTO não têm página própria
// (CEO = aprovações do usuário; CTO = infra/suporte técnico aos outros).
const PAGINA_DO_AGENTE: Record<string, { href: string; label: string }> = {
  minerador: { href: '/mineracao', label: 'Mineração' },
  copywriting: { href: '/copywriting', label: 'Copywriting' },
  revisor: { href: '/revisor', label: 'Revisor' },
  'designer-webmaster': { href: '/design', label: 'Design/Webmaster' },
  'video-maker': { href: '/video-maker', label: 'Video Maker' },
  'gestor-meta-ads': { href: '/meta-ads/dashboard', label: 'Gestor Meta Ads' },
};

export default function AgentsConfigPage() {
  const [agents, setAgents] = useState<AgenteConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<Field>('agents_md');
  const [draft, setDraft] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [addedFields, setAddedFields] = useState<Field[]>([]);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const agent = agents.find((a) => a.slug === selectedSlug) || null;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    carregar();
  }, []);

  async function carregar(manterSelecao = false) {
    setLoading(true);
    const data = ordenarAgentes(await getAgentesConfig());
    setAgents(data);
    setLoading(false);
    if (!manterSelecao && data.length > 0 && !selectedSlug) {
      selecionarAgente(data[0]);
    }
  }

  function selecionarAgente(a: AgenteConfigRow) {
    if (dirty && !window.confirm('Você tem alterações não salvas. Descartar?')) return;
    setSelectedSlug(a.slug);
    setSelectedField('agents_md');
    setDraft(a.agents_md || '');
    setAddedFields([]);
    setAddMenuOpen(false);
    setDirty(false);
  }

  function selecionarCampo(field: Field) {
    if (dirty && !window.confirm('Você tem alterações não salvas. Descartar?')) return;
    setSelectedField(field);
    setDraft((agent ? agent[field] : '') || '');
    setAddMenuOpen(false);
    setDirty(false);
  }

  // Arquivos exibidos como abas: obrigatórios + os que têm conteúdo + os adicionados na sessão.
  function arquivosVisiveis(a: AgenteConfigRow) {
    return ARQUIVOS.filter(
      (f) => OBRIGATORIOS.includes(f.field) || a[f.field] || addedFields.includes(f.field)
    );
  }

  // Opcionais que ainda não existem nesse agente — candidatos do menu "+".
  function arquivosAdicionaveis(a: AgenteConfigRow) {
    return ARQUIVOS.filter(
      (f) => !OBRIGATORIOS.includes(f.field) && !a[f.field] && !addedFields.includes(f.field)
    );
  }

  function adicionarArquivo(field: Field) {
    setAddedFields((prev) => (prev.includes(field) ? prev : [...prev, field]));
    setSelectedField(field);
    setDraft('');
    setAddMenuOpen(false);
    setDirty(false);
  }

  async function salvar() {
    if (!agent) return;
    setSaving(true);
    try {
      await saveAgentMarkdown(agent.slug, selectedField, draft);
      setAgents((prev) =>
        prev.map((a) => (a.slug === agent.slug ? { ...a, [selectedField]: draft } : a))
      );
      setDirty(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function sincronizar() {
    if (syncing) return;
    setSyncing(true);
    setSyncMsg(null);
    try {
      const r = await syncAgentsFromFolder();
      const temErro = r.resultados.some((x) => x.status === 'erro');
      setSyncMsg({ tipo: temErro ? 'erro' : 'ok', texto: r.resumo });
      await carregar(true);
      // Recarrega o conteúdo do campo atual após o sync
      if (selectedSlug) {
        const atual = (await getAgentesConfig()).find((a) => a.slug === selectedSlug);
        if (atual) setDraft(atual[selectedField] || '');
        setDirty(false);
      }
    } catch (e) {
      setSyncMsg({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Falha na sincronização.' });
    } finally {
      setSyncing(false);
    }
  }

  async function alternarAtivo(a: AgenteConfigRow, e: React.MouseEvent) {
    e.stopPropagation();
    const novo = !a.ativo;
    setAgents((prev) => prev.map((x) => (x.slug === a.slug ? { ...x, ativo: novo } : x)));
    try {
      await setAgenteAtivo(a.slug, novo);
    } catch {
      setAgents((prev) => prev.map((x) => (x.slug === a.slug ? { ...x, ativo: a.ativo } : x)));
      alert('Falha ao alterar status.');
    }
  }

  return (
    <div className="relative min-h-full pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-surface-elevated pb-5 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1 flex items-center gap-3">
            <Bot className="text-primary" size={28} /> Agents Config
          </h1>
          <p className="text-secondary text-sm max-w-2xl">
            O cérebro de cada agente — exatamente o que a IA recebe como system prompt. Lido e
            editável aqui, sincronizado com a pasta <code className="text-primary">agentes/</code> e o banco.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={sincronizar}
            disabled={syncing}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50 whitespace-nowrap"
          >
            {syncing
              ? <><Loader2 size={16} className="animate-spin" /> Sincronizando…</>
              : <><FolderSync size={16} /> Sincronizar da pasta agentes/</>}
          </button>
          {syncMsg && (
            <span className={`text-xs ${syncMsg.tipo === 'ok' ? 'text-status-green' : 'text-status-red'}`}>
              {syncMsg.texto}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-secondary"><Loader2 size={16} className="animate-spin" /> Carregando agentes…</div>
      ) : agents.length === 0 ? (
        <div className="text-center text-secondary py-20">
          <AlertCircle size={40} className="mx-auto mb-4 opacity-30" />
          Nenhum agente em <code className="text-primary">agentes_config</code>. Clique em
          “Sincronizar da pasta agentes/” para popular.
        </div>
      ) : (
        <div className="grid grid-cols-[260px_1fr] gap-6">
          {/* Lista de agentes */}
          <div className="space-y-1.5">
            {agents.map((a) => (
              <button
                key={a.slug}
                onClick={() => selecionarAgente(a)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                  selectedSlug === a.slug
                    ? 'bg-primary/10 border-primary/30 text-white'
                    : 'bg-surface border-surface-elevated text-secondary hover:text-white hover:border-primary/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm truncate">{a.nome}</span>
                  <span
                    onClick={(e) => alternarAtivo(a, e)}
                    title={a.ativo ? 'Ativo — clique p/ desativar' : 'Inativo — clique p/ ativar'}
                    className={`w-2.5 h-2.5 rounded-full shrink-0 cursor-pointer ${a.ativo ? 'bg-status-green' : 'bg-status-red/60'}`}
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-secondary">
                  <Cpu size={11} /> {a.modelo}
                </div>
              </button>
            ))}
          </div>

          {/* Editor do agente selecionado */}
          {agent && (
            <div className="bg-surface border border-surface-elevated rounded-xl overflow-hidden flex flex-col min-h-[60vh]">
              {/* Cabeçalho do agente + link pra página vinculada no dashboard */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-surface-elevated bg-[#0f0f16]">
                <div className="min-w-0">
                  <h3 className="text-white font-bold text-sm truncate">{agent.nome}</h3>
                  <span className="text-[11px] text-secondary">
                    {agent.modelo} · máx {agent.max_tokens} tokens
                  </span>
                </div>
                {PAGINA_DO_AGENTE[agent.slug] ? (
                  <Link
                    href={PAGINA_DO_AGENTE[agent.slug].href}
                    className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline whitespace-nowrap shrink-0"
                  >
                    <ExternalLink size={13} /> Abrir {PAGINA_DO_AGENTE[agent.slug].label}
                  </Link>
                ) : (
                  <span className="text-[11px] text-secondary italic shrink-0">sem página no dashboard</span>
                )}
              </div>

              {/* Tabs de arquivos. O scroll horizontal fica num div interno pra não
                  recortar o menu suspenso do "+" (overflow-x-auto cria clipping vertical). */}
              <div className="flex items-center gap-1 px-3 pt-3 border-b border-surface-elevated">
                <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar flex-1">
                  {arquivosVisiveis(agent).map((f) => {
                    const obrigatorio = OBRIGATORIOS.includes(f.field);
                    const temConteudo = !!agent[f.field];
                    return (
                      <button
                        key={f.field}
                        onClick={() => selecionarCampo(f.field)}
                        title={f.desc}
                        className={`px-3 py-2 rounded-t-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                          selectedField === f.field
                            ? 'bg-[#13131b] text-white border-b-2 border-primary'
                            : 'text-secondary hover:text-white'
                        }`}
                      >
                        <FileText size={13} className={temConteudo ? 'text-primary' : 'text-secondary/40'} />
                        {f.label}
                        {obrigatorio && <span className="text-[9px] text-primary/70" title="Obrigatório">*</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Botão + para adicionar arquivos opcionais (SOUL/TOOLS/HEARTBEAT) */}
                {arquivosAdicionaveis(agent).length > 0 && (
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setAddMenuOpen((o) => !o)}
                      title="Adicionar arquivo opcional"
                      className={`px-2 py-2 rounded-md transition-colors ${
                        addMenuOpen ? 'text-white bg-surface-elevated' : 'text-secondary hover:text-white'
                      }`}
                    >
                      <Plus size={15} />
                    </button>
                    {addMenuOpen && (
                      <>
                        {/* clique-fora pra fechar */}
                        <div className="fixed inset-0 z-10" onClick={() => setAddMenuOpen(false)} />
                        <div className="absolute z-20 mt-1 right-0 bg-[#13131b] border border-surface-elevated rounded-lg shadow-2xl py-1 min-w-[250px]">
                          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-secondary/70 border-b border-surface-elevated mb-1">
                            Adicionar arquivo opcional
                          </div>
                          {arquivosAdicionaveis(agent).map((f) => (
                            <button
                              key={f.field}
                              onClick={() => adicionarArquivo(f.field)}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-surface-elevated flex items-center gap-2 transition-colors"
                            >
                              <FileText size={13} className="text-primary shrink-0" />
                              <span className="text-white font-semibold">{f.label}</span>
                              <span className="text-secondary ml-auto truncate">{f.desc}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Barra de ação do arquivo */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#0f0f16] border-b border-surface-elevated">
                <span className="text-xs text-secondary">
                  {ARQUIVOS.find((f) => f.field === selectedField)?.desc}
                  {agent.ultimo_sync_em && (
                    <> · último sync {new Date(agent.ultimo_sync_em).toLocaleString('pt-BR')}</>
                  )}
                </span>
                <button
                  onClick={salvar}
                  disabled={saving || !dirty}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-md transition-colors disabled:opacity-40"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {saving ? 'Salvando…' : dirty ? 'Salvar' : 'Salvo'}
                </button>
              </div>

              {/* Editor */}
              <textarea
                value={draft}
                onChange={(e) => { setDraft(e.target.value); setDirty(true); }}
                spellCheck={false}
                placeholder={`Este agente ainda não tem ${ARQUIVOS.find((f) => f.field === selectedField)?.label}. Escreva aqui e salve para criar.`}
                className="flex-1 w-full bg-[#13131b] text-text-primary/90 font-mono text-[13px] leading-relaxed p-4 resize-none focus:outline-none placeholder-secondary/40"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
