"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Video, CheckCircle2, PlayCircle, Loader2, Check, X, MessageSquare, Plus, RefreshCw, FileText, Sparkles, AlertTriangle, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const DURACAO_MIN_S = 1;
const DURACAO_MAX_S = 10;
const DURACAO_PADRAO_S = 5;
// Dado real (achados 31/07/2026): um clipe de 4s levou 135,8s até `completed`.
const AVISO_WORKER_PARADO_MS = 10 * 60_000;

// Separa os 3 prompts que o Copywriting escreve em `prompts_videos`.
//
// O formato vem da SKILL do agente: "mesmo espírito de prompts_imagens", ou seja
// cada prompt entre `<<<` e `>>>`, com um título fora do bloco. Antes esta tela
// jogava o markdown inteiro num <pre> e mandava o Fernando copiar o trecho à mão —
// o prompt é justamente o que decide o que a geração PAGA vai produzir, então
// copiar errado custa dinheiro.
//
// O fallback por heading existe porque o campo é markdown livre: se o agente não
// usar os delimitadores, a tela ainda separa por `##`/`###` em vez de voltar ao
// copia-e-cola. Se nem isso casar, devolve lista vazia e a UI cai no texto cru —
// nunca esconde o conteúdo.
// Sem `export`: em `page.tsx` o Next valida os exports permitidos e um export
// extra vira "invalid export field" no build.
function separarPromptsDeVideo(markdown: string): { titulo: string; texto: string }[] {
  if (!markdown || !markdown.trim()) return [];

  const blocos: { titulo: string; texto: string }[] = [];

  // 1. Preferido: blocos entre <<< e >>>. O título é a última linha não-vazia
  //    antes do bloco (normalmente um heading markdown).
  const re = /<<<([\s\S]*?)>>>/g;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = re.exec(markdown)) !== null) {
    const texto = m[1].trim();
    if (!texto) continue;
    idx += 1;
    const antes = markdown.slice(0, m.index).split('\n').filter((l) => l.trim());
    const bruto = antes[antes.length - 1] ?? '';
    const titulo = bruto.replace(/^#+\s*/, '').replace(/[*_`]/g, '').trim() || `Vídeo ${idx}`;
    blocos.push({ titulo, texto });
  }
  if (blocos.length > 0) return blocos;

  // 2. Fallback: seções por heading.
  const partes = markdown.split(/^#{2,3}\s+/m).slice(1);
  partes.forEach((parte, i) => {
    const linhas = parte.split('\n');
    const titulo = (linhas.shift() ?? '').replace(/[*_`]/g, '').trim() || `Vídeo ${i + 1}`;
    const texto = linhas.join('\n').trim();
    if (texto.length >= 10) blocos.push({ titulo, texto });
  });

  return blocos;
}

// Nome da oferta para a tela. O join com `campanhas_producao` pode vir como
// objeto ou array dependendo da inferência do supabase-js, e pode não vir —
// nesse caso cai no id curto, nunca em "undefined".
function nomeDaOferta(oferta: any): string {
  if (!oferta) return '—';
  const c = oferta.campanhas_producao;
  const nome = Array.isArray(c) ? c[0]?.nome_projeto : c?.nome_projeto;
  return nome || `Copy ${String(oferta.id).substring(0, 8)}`;
}

// Espelho no cliente do preço medido em `src/lib/wavespeed/precos.ts`
// (US$ 0,10/s no openai/sora-2, medido por diferença de saldo em 01/08/2026).
//
// É duplicação consciente: `precos.ts` é lido pelo route handler no servidor, e
// esta tela precisa mostrar o valor ANTES de enviar, na confirmação. O texto
// diz "estimado" porque a fatura é a verdade.
const USD_POR_SEGUNDO_CLIENTE = 0.1;
function estimarCustoUsdCliente(duracaoS: number): string {
  return `~US$ ${(USD_POR_SEGUNDO_CLIENTE * duracaoS).toFixed(2)} (estimado)`;
}

export default function VideoMakerPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [activeVideo, setActiveVideo] = useState<any>(null);

  // --- Geração via WaveSpeed (video_jobs) ---
  const [jobs, setJobs] = useState<any[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [copyPrompts, setCopyPrompts] = useState<any[]>([]);
  const [copySelecionadaId, setCopySelecionadaId] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [duracaoS, setDuracaoS] = useState(DURACAO_PADRAO_S);
  const [gerando, setGerando] = useState(false);
  const [mensagemEnvio, setMensagemEnvio] = useState<{ tipo: 'erro' | 'aviso' | 'sucesso'; texto: string } | null>(null);

  useEffect(() => {
    fetchVideos();

    const channel = supabase.channel('video_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_video' }, (payload) => {
        fetchVideos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    fetchJobs();
    fetchCopyPrompts();

    const channel = supabase.channel('video_jobs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'video_jobs' }, () => {
        fetchJobs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchVideos() {
    const { data, error } = await supabase
      .from('workflow_video')
      .select('*')
      .order('data_criacao', { ascending: false });

    if (!error && data) {
      setVideos(data);
      if (data.length > 0 && !activeVideo) {
        setActiveVideo(data[0]);
      }
    }
  }

  async function fetchJobs() {
    try {
      const res = await fetch('/api/video/jobs');
      const json = await res.json();
      setJobs(json.jobs ?? []);
    } catch (err) {
      console.error('[video-maker] falha ao buscar video_jobs:', err);
    }
  }

  // Fonte dos prompts de vídeo escritos pelo agente Copywriting
  // (workflow_copywriting.prompts_videos, texto markdown — Task 6).
  // `separarPromptsDeVideo` quebra o markdown nos 3 prompts para dar um clique
  // por prompt, com fallback para o texto cru quando o formato não casa.
  async function fetchCopyPrompts() {
    // Traz o nome do projeto junto: esta tela é um passo da ESTEIRA, então o
    // que identifica a linha é a oferta ("Método do Corredor"), não o UUID da
    // copy. `campanhas_producao` é o pai de `workflow_copywriting`.
    const { data, error } = await supabase
      .from('workflow_copywriting')
      .select('id, campanha_id, prompts_videos, data_criacao, campanhas_producao(nome_projeto, status_geral)')
      .not('prompts_videos', 'is', null)
      .order('data_criacao', { ascending: false })
      .limit(20);

    if (!error && data) {
      setCopyPrompts(data.filter((item) => (item.prompts_videos || '').trim().length > 0));
    }
  }

  // A BIBLIOTECA TEM DUAS FONTES, E ANTES SÓ MOSTRAVA UMA.
  //
  // `workflow_video` é a tabela da esteira antiga e está VAZIA — nada no sistema
  // escreve nela hoje. Os vídeos gerados na WaveSpeed vão para `video_jobs`, que
  // só era renderizada DENTRO do modal. Resultado: gerava o vídeo, ele concluía,
  // e a tela principal continuava dizendo "Selecione um vídeo" para sempre.
  //
  // Aqui os jobs são normalizados no shape que a lista e o player já esperam
  // (`url_video_download`), então nenhum dos dois precisou mudar.
  const biblioteca = useMemo(() => {
    const deJobs = jobs.map((j) => ({
      ...j,
      _origem: 'wavespeed' as const,
      title: `Vídeo WaveSpeed #${String(j.id).substring(0, 4)}`,
      subtitle: j.prompt || 'Sem prompt',
      url_video_download: j.url_saida || null,
      duration: j.duracao_s ? `0:${String(j.duracao_s).padStart(2, '0')}` : null,
      // `erro` colide com o status textual da esteira; normaliza para o mesmo
      // vocabulário que getStatusColor/getStatusIcon já conhecem.
      status:
        j.status === 'concluido'
          ? 'Concluído'
          : j.status === 'erro'
            ? 'Erro'
            : j.status === 'processando'
              ? 'Processando'
              : j.status,
    }));

    const daEsteira = videos.map((v) => ({ ...v, _origem: 'esteira' as const }));

    return [...deJobs, ...daEsteira];
  }, [jobs, videos]);

  // Seleciona o primeiro item assim que a biblioteca tem conteúdo, para a tela
  // não abrir em "Selecione um vídeo" quando já existe vídeo pronto.
  useEffect(() => {
    if (!activeVideo && biblioteca.length > 0) setActiveVideo(biblioteca[0]);
  }, [biblioteca, activeVideo]);

  function abrirModal() {
    setMensagemEnvio(null);
    setModalAberto(true);
  }

  function fecharModal() {
    if (gerando) return; // não deixa fechar no meio de um envio já em voo
    setModalAberto(false);
  }

  async function gerarVideo() {
    const promptTrim = prompt.trim();
    if (promptTrim.length < 10) {
      setMensagemEnvio({ tipo: 'erro', texto: 'O prompt precisa ter ao menos 10 caracteres.' });
      return;
    }

    const temImagem = imageUrl.trim().length > 0;
    const ok = window.confirm(
      `Gerar 1 vídeo de ${duracaoS}s (${temImagem ? 'image-to-video' : 'text-to-video'})?\n\n` +
      `O custo estimado só aparece DEPOIS do envio (a tabela de preços pode não ` +
      `cobrir o modelo configurado — nesse caso a tela vai mostrar "custo desconhecido").\n\n` +
      `💸 Isto consome crédito pré-pago da WaveSpeed e não tem como desfazer.`
    );
    if (!ok) return;

    setGerando(true);
    setMensagemEnvio(null);
    try {
      const copySelecionada = copyPrompts.find((c) => c.id === copySelecionadaId);
      const res = await fetch('/api/video/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campanha_id: copySelecionada?.campanha_id ?? null,
          prompt: promptTrim,
          image_url: temImagem ? imageUrl.trim() : undefined,
          duracao_s: duracaoS,
        }),
      });

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      if (res.status === 200) {
        const custoTexto = json?.custo_estimado_usd != null
          ? `custo estimado: US$ ${Number(json.custo_estimado_usd).toFixed(4)}`
          : 'custo desconhecido — modelo fora da tabela de preços (não é grátis, só não medido ainda)';
        setMensagemEnvio({
          tipo: 'sucesso',
          texto: `Vídeo enviado (job ${json.job_id}). ${custoTexto}. Acompanhe o status abaixo — um clipe de 4s levou 135,8s no teste real, não é instantâneo.`,
        });
        setPrompt('');
        setImageUrl('');
        await fetchJobs();
        return;
      }

      if (res.status === 409) {
        setMensagemEnvio({
          tipo: 'aviso',
          texto: `Já existe uma submissão idêntica (mesmo prompt + modelo) em andamento nos últimos 60s ` +
            `— nada foi enviado de novo, para não cobrar duas vezes. Job em andamento: ${json?.job_id ?? '—'}. Aguarde e confira a fila abaixo.`,
        });
        return;
      }

      if (res.status === 503) {
        setMensagemEnvio({
          tipo: 'aviso',
          texto: `Não foi possível checar duplicidade antes de enviar (falha na consulta) — nada foi enviado ` +
            `nem cobrado. Pode tentar novamente. Detalhe: ${json?.detalhe ?? json?.error ?? 'sem detalhe'}`,
        });
        return;
      }

      if (res.status === 400) {
        setMensagemEnvio({ tipo: 'erro', texto: json?.error ?? 'Requisição recusada (400).' });
        return;
      }

      // 500 e qualquer outro código: falha após possível cobrança.
      const avisoTaskOrfa = json?.task_id
        ? ` ATENÇÃO: a WaveSpeed já pode ter cobrado (task ${json.task_id}) mesmo o registro não tendo sido salvo — anote esse ID.`
        : '';
      setMensagemEnvio({
        tipo: 'erro',
        texto: `Falhou (${res.status}): ${json?.error ?? 'erro desconhecido'}.${avisoTaskOrfa}`,
      });
    } catch (err) {
      setMensagemEnvio({ tipo: 'erro', texto: `Falha de rede ao enviar: ${(err as Error)?.message ?? err}` });
    } finally {
      setGerando(false);
    }
  }

  // ── A ESTEIRA ────────────────────────────────────────────────────────────
  // A oferta selecionada na coluna 1. Tudo nas colunas 2 e 3 deriva dela.
  const ofertaAtiva = copyPrompts.find((c) => c.id === copySelecionadaId) ?? copyPrompts[0] ?? null;

  // Os 3 prompts da oferta ativa, já casados com o job que os gerou (quando
  // existe). O casamento é por TEXTO do prompt, porque é o que `video_jobs`
  // guarda — não há coluna de "índice do prompt". Normaliza espaço em branco
  // para o texto editado à mão no campo não deixar de casar por um \r\n.
  const normalizar = (s: string) => (s || '').replace(/\s+/g, ' ').trim();

  const promptsDaOferta = useMemo(() => {
    if (!ofertaAtiva) return [];
    const separados = separarPromptsDeVideo(ofertaAtiva.prompts_videos || '');
    return separados.map((p, i) => {
      const jobsDoPrompt = jobs
        .filter((j) => normalizar(j.prompt) === normalizar(p.texto))
        .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
      return { ...p, indice: i + 1, jobs: jobsDoPrompt, job: jobsDoPrompt[0] ?? null };
    });
  }, [ofertaAtiva, jobs]);

  // Duração pedida pelo próprio prompt ("7 segundos", "6s"). O agente escreve a
  // duração no texto; ignorar isso e mandar sempre 5s produziria um clipe
  // diferente do que a copy pediu — e cada geração é dinheiro.
  function duracaoDoPrompt(texto: string): number {
    const m = texto.match(/(\d{1,2})\s*(?:segundos|segundo|s\b)/i);
    const n = m ? parseInt(m[1], 10) : NaN;
    if (!Number.isFinite(n)) return DURACAO_PADRAO_S;
    return Math.min(Math.max(n, DURACAO_MIN_S), DURACAO_MAX_S);
  }

  // Gera direto do card do prompt — sem passar pelo modal de prompt livre.
  async function gerarDoPrompt(p: { titulo: string; texto: string; indice: number }) {
    const duracao = duracaoDoPrompt(p.texto);
    const custo = estimarCustoUsdCliente(duracao);
    const ok = window.confirm(
      `Gerar o VÍDEO ${p.indice} de "${nomeDaOferta(ofertaAtiva)}"?\n\n` +
        `Duração: ${duracao}s (lida do próprio prompt)\n` +
        `Custo estimado: ${custo}\n\n` +
        `💸 Consome crédito pré-pago da WaveSpeed e não tem como desfazer.`
    );
    if (!ok) return;

    setGerando(true);
    setMensagemEnvio(null);
    try {
      const res = await fetch('/api/video/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campanha_id: ofertaAtiva?.campanha_id ?? null,
          prompt: p.texto,
          duracao_s: duracao,
        }),
      });
      const json = await res.json().catch(() => null);

      if (res.status === 200) {
        setMensagemEnvio({
          tipo: 'sucesso',
          texto: `VÍDEO ${p.indice} enviado (job ${json.job_id}). Um clipe de 4s levou 135,8s no teste real — o card atualiza sozinho.`,
        });
        await fetchJobs();
        return;
      }
      if (res.status === 409) {
        setMensagemEnvio({
          tipo: 'aviso',
          texto: `Esse mesmo prompt já foi enviado nos últimos 60s — nada foi cobrado de novo. Job: ${json?.job_id ?? '—'}.`,
        });
        return;
      }
      const avisoOrfa = json?.task_id
        ? ` ATENÇÃO: a WaveSpeed pode já ter cobrado (task ${json.task_id}) — anote esse ID.`
        : '';
      setMensagemEnvio({
        tipo: 'erro',
        texto: `Falhou (${res.status}): ${json?.error ?? 'erro desconhecido'}.${avisoOrfa}`,
      });
    } catch (err) {
      setMensagemEnvio({ tipo: 'erro', texto: `Falha de rede: ${(err as Error)?.message ?? err}` });
    } finally {
      setGerando(false);
    }
  }

  const workerParado = jobs.some((j) => {
    if (j.status !== 'processando') return false;
    const referencia = j.iniciado_em || j.criado_em;
    return referencia && Date.now() - new Date(referencia).getTime() > AVISO_WORKER_PARADO_MS;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Renderizando': return 'bg-status-yellow/20 text-status-yellow border-status-yellow/30';
      case 'Aguardando Aprovação': return 'bg-primary/20 text-primary border-primary/30';
      case 'Aprovado': return 'bg-status-green/20 text-status-green border-status-green/30';
      case 'Ajuste Necessário': return 'bg-status-red/20 text-status-red border-status-red/30';
      default: return 'bg-surface-elevated text-secondary border-surface-elevated';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Renderizando': return <Loader2 size={12} className="animate-spin" />;
      case 'Aguardando Aprovação': return <PlayCircle size={12} />;
      case 'Aprovado': return <CheckCircle2 size={12} />;
      case 'Ajuste Necessário': return <RefreshCw size={12} />;
      default: return null;
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col animate-in fade-in duration-500 overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-elevated shrink-0">
        <div className="relative w-full max-w-lg">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-secondary" size={16} />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-surface-elevated rounded-lg bg-[#13131b] text-text-primary placeholder-secondary focus:outline-none focus:border-primary text-sm transition-colors"
            placeholder="Pesquisar ativos de vídeo..."
          />
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={abrirModal}
            className="px-3 py-1.5 bg-primary hover:bg-primary-hover rounded-full flex items-center gap-2 text-white text-xs font-medium transition-colors shadow-[0_0_10px_rgba(99,102,241,0.3)]"
          >
            <Sparkles size={14} /> Gerar Vídeo (WaveSpeed)
          </button>
          <div className="px-3 py-1.5 bg-surface border border-surface-elevated rounded-full flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-status-green animate-pulse"></span>
            <span className="text-xs font-medium text-secondary">Render Farm: Idle</span>
          </div>
        </div>
      </div>

      {workerParado && (
        <div className="bg-surface border border-status-yellow/30 rounded-lg p-3 mb-4 flex items-start gap-2 shrink-0">
          <AlertTriangle size={16} className="text-status-yellow shrink-0 mt-0.5" />
          <p className="text-sm text-status-yellow">
            Há vídeo esperando processamento na WaveSpeed há mais de 10 minutos. O worker está rodando?{' '}
            <code className="ml-1 text-xs bg-surface-elevated px-1.5 py-0.5 rounded">npm run video:worker</code>
          </p>
        </div>
      )}

      {/* Main Content Grid (3 Columns) */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        
        {/* Column 1: Ofertas na esteira */}
        <div className="w-[300px] flex flex-col shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-white mb-1">Video Maker</h1>
              <p className="text-secondary text-[10px]">Ofertas na esteira</p>
            </div>
            <button
              onClick={abrirModal}
              title="Prompt livre (fora da esteira)"
              className="w-8 h-8 flex items-center justify-center bg-primary hover:bg-primary-hover rounded-lg text-white transition-colors shadow-[0_0_10px_rgba(99,102,241,0.3)]">
              <Plus size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
            {copyPrompts.length === 0 && (
              <div className="border border-dashed border-surface-elevated rounded-xl p-4 text-center">
                <Video size={20} className="mx-auto text-secondary mb-2" />
                <p className="text-xs text-secondary">
                  Nenhuma oferta com prompts de vídeo ainda. Gere a copy em{' '}
                  <span className="text-white">Produção</span> para os prompts chegarem aqui.
                </p>
              </div>
            )}

            {copyPrompts.map((oferta) => {
              const nPrompts = separarPromptsDeVideo(oferta.prompts_videos || '').length;
              const nProntos = jobs.filter(
                (j) => j.campanha_id === oferta.campanha_id && j.status === 'concluido'
              ).length;
              const ativa = ofertaAtiva?.id === oferta.id;
              return (
                <button
                  key={oferta.id}
                  onClick={() => { setCopySelecionadaId(oferta.id); setActiveVideo(null); }}
                  className={`w-full text-left bg-surface border rounded-xl p-3 transition-all ${
                    ativa
                      ? 'border-primary shadow-[0_0_20px_rgba(99,102,241,0.15)] ring-1 ring-primary/50'
                      : 'border-surface-elevated hover:border-surface-elevated/80 opacity-80 hover:opacity-100'
                  }`}
                >
                  <h3 className="text-white font-bold text-sm truncate mb-1">{nomeDaOferta(oferta)}</h3>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">
                      {nPrompts} {nPrompts === 1 ? 'PROMPT' : 'PROMPTS'}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold ${
                        nProntos > 0
                          ? 'bg-status-green/20 text-status-green'
                          : 'bg-surface-elevated text-secondary'
                      }`}
                    >
                      {nProntos} PRONTO{nProntos === 1 ? '' : 'S'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>


        {/* Column 2: Prompts da oferta — o passo da esteira */}
        <div className="flex-1 flex flex-col bg-surface border border-surface-elevated rounded-xl overflow-hidden">
          {ofertaAtiva ? (
            <>
              <div className="px-6 py-4 border-b border-surface-elevated shrink-0">
                <h2 className="text-white font-bold">{nomeDaOferta(ofertaAtiva)}</h2>
                <p className="text-[10px] text-secondary mt-0.5">
                  Prompts de vídeo escritos pelo agente Copywriting. Gere um por vez — cada geração custa crédito.
                </p>
              </div>

              {mensagemEnvio && (
                <div
                  className={`mx-6 mt-4 rounded-lg p-3 text-xs border shrink-0 ${
                    mensagemEnvio.tipo === 'erro'
                      ? 'bg-status-red/10 border-status-red/30 text-status-red'
                      : mensagemEnvio.tipo === 'aviso'
                        ? 'bg-status-yellow/10 border-status-yellow/30 text-status-yellow'
                        : 'bg-status-green/10 border-status-green/30 text-status-green'
                  }`}
                >
                  {mensagemEnvio.texto}
                </div>
              )}

              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-[#0F0F13] space-y-4">
                {promptsDaOferta.length === 0 && (
                  <p className="text-xs text-status-yellow">
                    Não consegui separar os prompts deste texto. Use o botão + para gerar com prompt livre.
                  </p>
                )}

                {promptsDaOferta.map((p) => {
                  const j = p.job;
                  const duracao = duracaoDoPrompt(p.texto);
                  const emAndamento = j && (j.status === 'processando' || j.status === 'pendente');
                  const pronto = j && j.status === 'concluido';
                  const falhou = j && j.status === 'erro';

                  return (
                    <div
                      key={p.indice}
                      className={`bg-surface border rounded-lg overflow-hidden ${
                        activeVideo?.id === j?.id ? 'border-primary' : 'border-surface-elevated'
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 bg-primary/20 text-primary rounded text-[10px] font-bold uppercase tracking-wider shrink-0">
                            Vídeo {p.indice}
                          </span>
                          <span className="text-xs text-white font-medium truncate">{p.titulo}</span>
                          <span className="ml-auto text-[10px] text-secondary shrink-0">{duracao}s</span>
                        </div>

                        <p className="text-xs text-secondary leading-relaxed whitespace-pre-wrap mb-3">
                          {p.texto}
                        </p>

                        <div className="flex items-center gap-2 flex-wrap">
                          {pronto && (
                            <>
                              <span className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-status-green/20 text-status-green">
                                <CheckCircle2 size={11} /> PRONTO
                              </span>
                              <button
                                onClick={() => setActiveVideo({ ...j, url_video_download: j.url_saida })}
                                className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface-elevated text-white hover:bg-surface-elevated/70 transition-colors flex items-center gap-1.5"
                              >
                                <PlayCircle size={12} /> Ver no player
                              </button>
                            </>
                          )}

                          {emAndamento && (
                            <span className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold bg-status-yellow/20 text-status-yellow">
                              <Loader2 size={11} className="animate-spin" /> GERANDO — ~2min
                            </span>
                          )}

                          {falhou && (
                            <span
                              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-status-red/20 text-status-red"
                              title={j.erro || ''}
                            >
                              <AlertTriangle size={11} /> FALHOU
                            </span>
                          )}

                          {!emAndamento && (
                            <button
                              onClick={() => gerarDoPrompt(p)}
                              disabled={gerando}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-primary hover:bg-primary-hover text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                            >
                              <Sparkles size={12} />
                              {pronto ? 'Gerar de novo' : 'Gerar vídeo'}
                              <span className="font-normal opacity-80">
                                · {estimarCustoUsdCliente(duracao)}
                              </span>
                            </button>
                          )}

                          {p.jobs.length > 1 && (
                            <span className="text-[10px] text-secondary">
                              {p.jobs.length} gerações
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-secondary">
              <FileText size={48} className="mb-4 opacity-20" />
              <p className="text-sm">Selecione uma oferta para ver os prompts de vídeo.</p>
            </div>
          )}
        </div>

        {/* Column 3: Video Player / Preview */}
        <div className="w-[340px] shrink-0 flex flex-col gap-4 overflow-hidden">
          {activeVideo ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between shrink-0">
                <h2 className="text-white font-bold text-sm">Visualização</h2>
                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border ${getStatusColor(activeVideo.status || (activeVideo.revisor_ok ? 'Aprovado' : 'Aguardando Aprovação'))}`}>
                  {getStatusIcon(activeVideo.status || (activeVideo.revisor_ok ? 'Aprovado' : 'Aguardando Aprovação'))}
                  <span>{activeVideo.status || (activeVideo.revisor_ok ? 'Aprovado' : 'Aguardando')}</span>
                </div>
              </div>

              {/* Video Player (Constrained to a mobile-like aspect or contained) */}
              <div className="w-full flex-1 bg-black rounded-xl border border-surface-elevated relative overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center justify-center">
                {(activeVideo.url_video_download || activeVideo.thumbnail_url?.includes('.mp4') || activeVideo.video_url) ? (
                  <video 
                    src={activeVideo.url_video_download || activeVideo.video_url || activeVideo.thumbnail_url} 
                    controls 
                    className="w-full h-full max-h-[600px] object-contain outline-none"
                  />
                ) : (
                  <div className="w-full h-full relative group cursor-pointer flex flex-col items-center justify-center max-h-[600px]">
                    <img src={activeVideo.thumbnail_url} alt="Video cover" className="absolute inset-0 w-full h-full object-contain opacity-40" />
                    <div className="relative z-10 w-16 h-16 bg-primary/90 text-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.5)] group-hover:scale-110 transition-transform">
                      <PlayCircle size={36} />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="p-4 border border-surface-elevated bg-surface rounded-xl space-y-2 shrink-0">
                <button className="w-full bg-status-green/20 hover:bg-status-green/30 text-status-green border border-status-green/30 py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-colors">
                  <CheckCircle2 size={14} /> Aprovar Vídeo Final
                </button>
                <button className="w-full border border-surface-elevated hover:bg-surface-elevated text-white py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-medium transition-colors">
                  <MessageSquare size={14} /> Solicitar Ajuste
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-surface border border-surface-elevated rounded-xl text-secondary">
              <Video size={48} className="mb-4 opacity-20" />
              <p className="text-xs text-center px-4">Selecione um vídeo para visualizar o player.</p>
            </div>
          )}
        </div>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-surface border border-surface-elevated rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-elevated shrink-0">
              <h2 className="text-white font-bold text-sm flex items-center gap-2">
                <Sparkles size={16} className="text-primary" /> Gerar Vídeo (WaveSpeed)
              </h2>
              <button
                onClick={fecharModal}
                disabled={gerando}
                className="text-secondary hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
              <div className="bg-surface-elevated/30 border border-surface-elevated rounded-lg p-3 flex items-start gap-2">
                <DollarSign size={14} className="text-status-yellow shrink-0 mt-0.5" />
                <p className="text-xs text-secondary">
                  Cada geração consome crédito pré-pago da WaveSpeed e <strong className="text-white">não pode ser desfeita</strong>.
                  O custo estimado só aparece depois de enviar — quando o modelo configurado não está na
                  tabela de preços, a tela mostra <strong className="text-white">&quot;custo desconhecido&quot;</strong>, nunca US$ 0,00.
                  Um clipe de 4s levou <strong className="text-white">135,8s</strong> no teste real — não é instantâneo.
                </p>
              </div>

              {copyPrompts.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1.5">
                    Prompts de vídeo do Copywriting (referência, opcional)
                  </label>
                  <select
                    value={copySelecionadaId}
                    onChange={(e) => setCopySelecionadaId(e.target.value)}
                    className="w-full bg-[#13131b] border border-surface-elevated rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                  >
                    <option value="">— nenhuma (prompt livre) —</option>
                    {copyPrompts.map((c) => (
                      <option key={c.id} value={c.id}>
                        Campanha {c.campanha_id ? c.campanha_id.substring(0, 8) : c.id.substring(0, 8)}
                      </option>
                    ))}
                  </select>
                  {copySelecionadaId && (() => {
                    const md = copyPrompts.find((c) => c.id === copySelecionadaId)?.prompts_videos || '';
                    const separados = separarPromptsDeVideo(md);

                    // Sem delimitador reconhecido, mostra o texto cru em vez de
                    // esconder o conteudo — o markdown e livre e o parser pode
                    // nao casar com um formato novo.
                    if (separados.length === 0) {
                      return (
                        <>
                          <pre className="mt-2 max-h-40 overflow-y-auto custom-scrollbar bg-[#0F0F13] border border-surface-elevated rounded-lg p-3 text-[11px] text-secondary whitespace-pre-wrap">
                            {md}
                          </pre>
                          <p className="text-[10px] text-status-yellow mt-1">
                            Não consegui separar os prompts deste texto — copie o trecho desejado para o campo abaixo.
                          </p>
                        </>
                      );
                    }

                    return (
                      <div className="mt-2 space-y-2">
                        {separados.map((p, i) => {
                          const escolhido = prompt.trim() === p.texto.trim();
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setPrompt(p.texto)}
                              className={`w-full text-left rounded-lg p-3 border transition-colors ${
                                escolhido
                                  ? 'border-primary bg-primary/10'
                                  : 'border-surface-elevated bg-[#0F0F13] hover:bg-surface-elevated'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-semibold text-primary shrink-0">
                                  VÍDEO {i + 1}
                                </span>
                                <span className="text-[11px] text-white truncate">{p.titulo}</span>
                                {escolhido && (
                                  <Check className="w-3 h-3 text-status-green ml-auto shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-secondary line-clamp-3 whitespace-pre-wrap">
                                {p.texto}
                              </p>
                            </button>
                          );
                        })}
                        <p className="text-[10px] text-secondary">
                          Clique num prompt para usá-lo. Dá para editar no campo abaixo antes de gerar.
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Prompt (mín. 10 caracteres)</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  placeholder="Descreva a cena, movimento de câmera e ação. Sem texto na tela — a legenda vem depois no Remotion."
                  className="w-full bg-[#13131b] border border-surface-elevated rounded-lg px-3 py-2 text-sm text-white placeholder-secondary focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">
                  URL de imagem de origem (opcional — ativa image-to-video)
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://... (deixe vazio para text-to-video)"
                  className="w-full bg-[#13131b] border border-surface-elevated rounded-lg px-3 py-2 text-sm text-white placeholder-secondary focus:outline-none focus:border-primary"
                />
                <p className="text-[10px] text-secondary mt-1">
                  Se preenchido, exige o modelo de image-to-video configurado no servidor (WAVESPEED_MODEL_I2V) — sem ele a rota recusa antes de cobrar.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Duração</label>
                <select
                  value={duracaoS}
                  onChange={(e) => setDuracaoS(Number(e.target.value))}
                  className="w-full bg-[#13131b] border border-surface-elevated rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                >
                  {Array.from({ length: DURACAO_MAX_S - DURACAO_MIN_S + 1 }, (_, i) => DURACAO_MIN_S + i).map((s) => (
                    <option key={s} value={s}>{s}s</option>
                  ))}
                </select>
              </div>

              {mensagemEnvio && (
                <div className={`rounded-lg p-3 text-xs border ${
                  mensagemEnvio.tipo === 'sucesso' ? 'bg-status-green/10 border-status-green/30 text-status-green'
                  : mensagemEnvio.tipo === 'aviso' ? 'bg-status-yellow/10 border-status-yellow/30 text-status-yellow'
                  : 'bg-status-red/10 border-status-red/30 text-status-red'
                }`}>
                  {mensagemEnvio.texto}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-surface-elevated shrink-0 flex justify-end gap-2">
              <button
                onClick={fecharModal}
                disabled={gerando}
                className="px-4 py-2 rounded-lg text-xs font-medium text-secondary hover:text-white border border-surface-elevated disabled:opacity-40"
              >
                Fechar
              </button>
              <button
                onClick={gerarVideo}
                disabled={gerando || prompt.trim().length < 10}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {gerando ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {gerando ? 'Enviando...' : 'Gerar (cobra crédito)'}
              </button>
            </div>

            {jobs.length > 0 && (
              <div className="border-t border-surface-elevated shrink-0 max-h-56 overflow-y-auto custom-scrollbar p-4 space-y-2 bg-[#0F0F13]">
                <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">Fila WaveSpeed (últimos jobs)</p>
                {jobs.map((j) => (
                  <div key={j.id} className="bg-surface border border-surface-elevated rounded-lg p-3">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-xs text-white truncate flex-1">{j.prompt}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded shrink-0 uppercase font-bold ${
                        j.status === 'concluido' ? 'text-status-green'
                        : j.status === 'erro' ? 'text-status-red'
                        : 'text-status-yellow animate-pulse'
                      }`}>
                        {j.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-secondary mt-1.5">
                      {j.modelo ?? '—'} · {j.duracao_s}s ·{' '}
                      {j.custo_estimado_usd != null
                        ? `US$ ${Number(j.custo_estimado_usd).toFixed(4)} (estimado)`
                        : 'custo desconhecido — modelo fora da tabela de preços'}
                    </p>
                    {j.erro && <p className="text-[10px] text-status-red mt-1">{j.erro}</p>}
                    {j.url_saida && (
                      <video src={j.url_saida} controls className="mt-2 rounded max-w-full max-h-40" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
