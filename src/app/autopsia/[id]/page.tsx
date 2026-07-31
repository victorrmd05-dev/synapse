"use client";

// Detalhe de uma autópsia: o material coletado e o dossiê.
// Abas em vez de página longa porque as naturezas são diferentes — grade de
// criativos se percorre, transcrição se lê.
//
// O aviso de "worker offline" existe porque a fila é consumida por um script
// na máquina do Fernando: sem ele a tela ficaria em 0% para sempre, sem
// explicação nenhuma.

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { ArrowLeft, Loader2, FileText, Film, Image as ImageIcon, Mic, AlertTriangle, Rocket } from 'lucide-react';

interface Autopsia {
  id: string; page_id: string; page_name: string | null; page_profile_pic_url: string | null;
  status: string; progresso: number; total_anuncios: number; total_criativos: number;
  total_transcritos: number; dossie_md: string | null; dossie_html_url: string | null;
  erro: string | null; criado_em: string;
}
interface Criativo {
  id: string; ad_archive_id: string | null; tipo: string; duracao_s: number | null;
  dias_no_ar: number | null; is_active: boolean | null; ad_copy: string | null;
  ad_title: string | null; cta_text: string | null; link_url: string | null;
  url_origem: string | null; storage_path: string | null; transcricao: string | null;
  frames_paths: string[] | null;
}
interface Job { id: string; tipo: string; status: string; erro: string | null; iniciado_em: string | null; concluido_em: string | null; criado_em: string; }
interface Campanha { id: string; nome_projeto: string; status_geral: string | null; }

type Aba = 'criativos' | 'transcricoes' | 'frames' | 'dossie';

export default function AutopsiaDetalhePage() {
  const params = useParams();
  const id = String(params.id);
  const [autopsia, setAutopsia] = useState<Autopsia | null>(null);
  const [criativos, setCriativos] = useState<Criativo[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [aba, setAba] = useState<Aba>('criativos');
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [produzindo, setProduzindo] = useState(false);
  const [campanha, setCampanha] = useState<Campanha | null>(null);

  async function publicar() {
    setPublicando(true);
    try {
      const res = await fetch('/api/autopsia/publicar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autopsia_id: id }),
      });
      const json = await res.json();
      if (!res.ok) alert(json.error ?? 'Falha ao publicar.');
    } catch (e) {
      alert((e as Error).message);
    }
    setPublicando(false);
  }

  // Manda a autópsia para a esteira de produção.
  //
  // Só CRIA a campanha e para — não dispara IA nenhuma. A copy é escrita depois,
  // com o dossiê e as transcrições como contexto (material muito mais rico que o
  // anúncio minerado avulso que a /mineracao usa). Ver `autopsia_id` na tabela.
  async function produzirCampanha() {
    if (campanha) return;
    setProduzindo(true);
    try {
      // Reaproveita o anúncio minerado da mesma página, quando existir — é ele
      // que carrega link de destino, criativo e copy original.
      const { data: ad } = await supabase
        .from('ads_minerados')
        .select('id')
        .eq('page_id', autopsia!.page_id)
        .order('data_mineracao', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data, error } = await supabase
        .from('campanhas_producao')
        .insert([{
          autopsia_id: id,
          ad_minerado_id: ad?.id ?? null,
          nome_projeto: `Modelagem — ${autopsia!.page_name ?? autopsia!.page_id}`,
          status_geral: 'aguardando_producao',
        }])
        .select('id,nome_projeto,status_geral')
        .single();

      if (error) throw error;
      setCampanha(data as Campanha);
    } catch (e) {
      alert('Falha ao criar a campanha: ' + (e as Error).message);
    }
    setProduzindo(false);
  }

  async function gerarDossie() {
    setGerando(true);
    try {
      const res = await fetch('/api/autopsia/dossie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autopsia_id: id }),
      });
      const json = await res.json();
      if (!res.ok) alert(json.error ?? 'Falha ao gerar o dossiê.');
    } catch (e) {
      alert((e as Error).message);
    }
    setGerando(false);
  }

  const fetchTudo = useCallback(async () => {
    const [a, c, j, camp] = await Promise.all([
      supabase.from('autopsias').select('*').eq('id', id).single(),
      supabase.from('autopsia_criativos').select('*').eq('autopsia_id', id).order('dias_no_ar', { ascending: false }),
      supabase.from('autopsia_jobs').select('id,tipo,status,erro,iniciado_em,concluido_em,criado_em').eq('autopsia_id', id),
      supabase.from('campanhas_producao').select('id,nome_projeto,status_geral').eq('autopsia_id', id).maybeSingle(),
    ]);
    if (a.data) setAutopsia(a.data as Autopsia);
    if (c.data) setCriativos(c.data as Criativo[]);
    if (j.data) setJobs(j.data as Job[]);
    setCampanha((camp.data as Campanha) ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchTudo();
    const channel = supabase
      .channel(`autopsia_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'autopsias' }, fetchTudo)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'autopsia_criativos' }, fetchTudo)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'autopsia_jobs' }, fetchTudo)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, fetchTudo]);

  // Worker parado = ninguém CONCLUIU nem COMEÇOU nada há muito tempo.
  //
  // Antes isso olhava a idade dos jobs pendentes — e dava falso positivo sempre:
  // os jobs de frames/transcrever nascem todos juntos quando os downloads acabam,
  // então bastava passar 10 min para o alerta acender, mesmo com o worker rodando
  // normalmente (ele faz um job por vez, e o Whisper leva minutos por vídeo).
  // Idade de fila não mede saúde do worker; tempo desde a última atividade mede.
  const pendentes = jobs.filter((j) => j.status === 'pendente');
  const processando = jobs.filter((j) => j.status === 'processando');
  const OCIOSO_MS = 15 * 60 * 1000;

  const ultimaAtividade = jobs.reduce((maior, j) => {
    const t = Math.max(
      j.iniciado_em ? new Date(j.iniciado_em).getTime() : 0,
      j.concluido_em ? new Date(j.concluido_em).getTime() : 0,
    );
    return t > maior ? t : maior;
  }, 0);

  // Sem atividade nenhuma ainda: conta a partir do job mais antigo da fila —
  // é o caso "apertei o botão e nunca rodei o worker".
  const referencia =
    ultimaAtividade > 0
      ? ultimaAtividade
      : Math.min(...[...pendentes, ...processando].map((j) => new Date(j.criado_em).getTime()));

  const workerParece0ffline =
    (pendentes.length > 0 || processando.length > 0) &&
    Number.isFinite(referencia) &&
    Date.now() - referencia > OCIOSO_MS;
  const jobsComErro = jobs.filter((j) => j.status === 'erro');

  if (loading) {
    return <div className="text-secondary text-sm flex items-center gap-2 p-8"><Loader2 size={16} className="animate-spin" /> Carregando…</div>;
  }
  if (!autopsia) {
    return <div className="p-8 text-secondary text-sm">Autópsia não encontrada.</div>;
  }

  const abas: { chave: Aba; rotulo: string; icone: React.ReactNode; contador: number }[] = [
    { chave: 'criativos', rotulo: 'Criativos', icone: <Film size={15} />, contador: criativos.length },
    { chave: 'transcricoes', rotulo: 'Transcrições', icone: <Mic size={15} />, contador: criativos.filter((c) => c.transcricao).length },
    { chave: 'frames', rotulo: 'Frames', icone: <ImageIcon size={15} />, contador: criativos.filter((c) => c.frames_paths?.length).length },
    { chave: 'dossie', rotulo: 'Dossiê', icone: <FileText size={15} />, contador: autopsia.dossie_md ? 1 : 0 },
  ];

  return (
    <div className="relative min-h-full pb-20 animate-in fade-in duration-500">
      <Link href="/autopsia" className="text-secondary hover:text-white text-sm flex items-center gap-2 mb-6">
        <ArrowLeft size={15} /> Autópsias
      </Link>

      <div className="flex items-center gap-4 mb-6">
        {autopsia.page_profile_pic_url && (
          <img src={autopsia.page_profile_pic_url} alt="" className="w-12 h-12 rounded-full object-cover" />
        )}
        <div>
          <h1 className="text-2xl font-bold text-white">{autopsia.page_name ?? autopsia.page_id}</h1>
          <p className="text-secondary text-sm">
            {autopsia.total_anuncios} anúncios → <span className="text-white">{autopsia.total_criativos} criativos únicos</span>
            {' · '}{autopsia.total_transcritos} transcritos · status <span className="text-white">{autopsia.status}</span>
          </p>
        </div>
      </div>

      <div className="h-1.5 bg-surface rounded-full overflow-hidden mb-6">
        <div className="h-full bg-primary transition-all" style={{ width: `${autopsia.progresso}%` }} />
      </div>

      {workerParece0ffline && (
        <div className="bg-status-yellow/10 border border-status-yellow/30 rounded-lg p-4 mb-6 flex gap-3">
          <AlertTriangle size={18} className="text-status-yellow shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-status-yellow font-semibold">O worker parece estar parado.</p>
            <p className="text-secondary text-xs mt-1">
              Nenhum job avançou nos últimos 15 minutos e {pendentes.length + processando.length} ainda
              estão na fila. Rode na raiz do projeto:{' '}
              <code className="text-white">py -3 scripts/worker-autopsia.py</code>
            </p>
          </div>
        </div>
      )}

      {jobsComErro.length > 0 && (
        <div className="bg-status-red/10 border border-status-red/30 rounded-lg p-4 mb-6 text-sm">
          <p className="text-status-red font-semibold">{jobsComErro.length} job(s) falharam</p>
          <ul className="text-secondary text-xs mt-1 space-y-0.5">
            {jobsComErro.slice(0, 5).map((j) => <li key={j.id}>· {j.tipo}: {j.erro}</li>)}
          </ul>
        </div>
      )}

      <div className="flex gap-2 border-b border-surface-elevated mb-6">
        {abas.map((t) => (
          <button
            key={t.chave}
            onClick={() => setAba(t.chave)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${
              aba === t.chave ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-white'
            }`}
          >
            {t.icone} {t.rotulo}
            <span className="text-[10px] bg-surface px-1.5 py-0.5 rounded">{t.contador}</span>
          </button>
        ))}
      </div>

      {aba === 'criativos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {criativos.map((c) => (
            <div key={c.id} className="bg-surface border border-surface-elevated rounded-xl overflow-hidden">
              {c.storage_path && c.tipo === 'video' ? (
                <video src={c.storage_path} controls className="w-full aspect-[9/16] object-cover bg-black" />
              ) : c.storage_path ? (
                <img src={c.storage_path} alt="" className="w-full aspect-[9/16] object-cover bg-black" />
              ) : (
                <div className="w-full aspect-[9/16] bg-[#0D0D14] flex items-center justify-center text-secondary text-xs">
                  aguardando download
                </div>
              )}
              <div className="p-4">
                <div className="flex gap-3 text-[11px] text-secondary mb-2">
                  {c.duracao_s && <span className="text-white">{c.duracao_s}s</span>}
                  {c.dias_no_ar !== null && <span>{c.dias_no_ar} dias no ar</span>}
                  {c.is_active && <span className="text-status-green">ativo</span>}
                </div>
                <p className="text-xs text-secondary line-clamp-4 whitespace-pre-wrap">{c.ad_copy ?? '—'}</p>
                {c.cta_text && <p className="text-[11px] text-primary mt-2">{c.cta_text}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {aba === 'transcricoes' && (
        <div className="space-y-4">
          {criativos.filter((c) => c.transcricao).length === 0 ? (
            <p className="text-secondary text-sm">
              Nenhuma transcrição ainda. A legenda queimada dos anúncios é karaokê palavra-a-palavra —
              ler a copy por frame é inviável, por isso o áudio é transcrito.
            </p>
          ) : (
            criativos.filter((c) => c.transcricao).map((c) => (
              <div key={c.id} className="bg-surface border border-surface-elevated rounded-xl p-5">
                <p className="text-[11px] text-secondary mb-2">
                  {c.duracao_s}s · {c.dias_no_ar} dias no ar {c.is_active ? '· ativo' : ''}
                </p>
                <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{c.transcricao}</p>
              </div>
            ))
          )}
        </div>
      )}

      {aba === 'frames' && (
        <div className="space-y-6">
          {criativos.filter((c) => c.frames_paths?.length).map((c) => (
            <div key={c.id} className="bg-surface border border-surface-elevated rounded-xl p-5">
              <p className="text-[11px] text-secondary mb-3">{c.duracao_s}s · {c.dias_no_ar} dias no ar</p>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {c.frames_paths!.map((url) => (
                  <img key={url} src={url} alt="" className="w-full rounded-lg border border-surface-elevated" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {aba === 'dossie' && (
        <div className="bg-surface border border-surface-elevated rounded-xl p-6">
          {autopsia.dossie_md ? (
            <>
              <div className="flex items-center gap-3 mb-5 pb-5 border-b border-surface-elevated">
                <button
                  onClick={gerarDossie}
                  disabled={gerando}
                  className="text-secondary hover:text-white text-sm px-3 py-2 rounded-lg border border-surface-elevated disabled:opacity-40"
                >
                  {gerando ? 'Analisando…' : 'Regerar'}
                </button>
                <button
                  onClick={publicar}
                  disabled={publicando}
                  className="bg-primary hover:bg-primary-hover disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg"
                >
                  {publicando ? 'Publicando…' : autopsia.dossie_html_url ? 'Republicar' : 'Publicar dossiê'}
                </button>
                {autopsia.dossie_html_url && (
                  <a
                    href={autopsia.dossie_html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-status-green text-sm hover:underline"
                  >
                    No ar — abrir
                  </a>
                )}

                <div className="ml-auto">
                  {campanha ? (
                    <Link
                      href="/producao"
                      className="text-status-green text-sm hover:underline flex items-center gap-1.5"
                    >
                      <Rocket size={14} /> Em produção — ver
                    </Link>
                  ) : (
                    <button
                      onClick={produzirCampanha}
                      disabled={produzindo}
                      className="bg-status-green/15 border border-status-green/40 text-status-green hover:bg-status-green/25 disabled:opacity-40 text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                      <Rocket size={14} />
                      {produzindo ? 'Criando…' : 'Produzir campanha'}
                    </button>
                  )}
                </div>
              </div>

              {campanha && (
                <p className="text-secondary text-xs mb-5 -mt-2">
                  Campanha <span className="text-white">{campanha.nome_projeto}</span> criada e aguardando
                  produção. A copy é escrita a partir deste dossiê — seções <strong>5</strong> (modelar ×
                  rejeitar) e <strong>6</strong> (plano) são o briefing.
                </p>
              )}
              <pre className="text-sm text-text-primary whitespace-pre-wrap font-sans leading-relaxed">
                {autopsia.dossie_md}
              </pre>
            </>
          ) : (
            <div className="text-center py-10">
              <p className="text-secondary text-sm mb-4">
                O dossiê é gerado a partir das transcrições e dos metadados dos criativos.
              </p>
              <button
                onClick={gerarDossie}
                disabled={gerando || autopsia.total_transcritos === 0}
                className="bg-primary hover:bg-primary-hover disabled:opacity-40 text-white text-sm font-semibold px-5 py-2.5 rounded-lg inline-flex items-center gap-2"
              >
                {gerando ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                {gerando ? 'Analisando…' : 'Gerar dossiê com IA'}
              </button>
              {autopsia.total_transcritos === 0 && (
                <p className="text-secondary text-xs mt-3">Nenhum criativo transcrito ainda — rode o worker.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
