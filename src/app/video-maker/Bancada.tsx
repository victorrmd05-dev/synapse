'use client';

// src/app/video-maker/Bancada.tsx
//
// A coluna 3 da /video-maker quando ha um clipe pronto selecionado.
//
// Arquivo separado da page.tsx por dois motivos que se resolvem juntos:
// 1. page.tsx ja tem 900+ linhas;
// 2. o @remotion/player toca DOM e video, e nao sobrevive a renderizacao de
//    servidor — a page importa esta bancada por next/dynamic com ssr:false.
//
// O Player toca EXATAMENTE o componente que o worker renderiza
// (src/video/AnuncioUGC.tsx). Essa e a razao de ser da bancada: se as duas
// metades divergissem, voce aprovaria vendo uma coisa e receberia outra.

import React, { useMemo, useState } from 'react';
import { Player } from '@remotion/player';
import { Loader2, Mic, Film, AlertTriangle } from 'lucide-react';
import {
  AnuncioUGC,
  duracaoEmFrames,
  FPS,
  LARGURA,
  ALTURA,
  type Legenda,
} from '../../video/AnuncioUGC';

interface Props {
  campanhaId: string | null;
  jobFonteId: string;
  urlClipe: string;
  duracaoClipeS: number;
  roteiroInicial: string;
}

// Velocidade de fala em pt-BR, ~2,5 palavras/s. Serve so pra estimativa que
// aparece ao lado do contador — a duracao de VERDADE vem da ElevenLabs.
const PALAVRAS_POR_SEGUNDO = 2.5;

function estimarSegundos(texto: string): number {
  const palavras = texto.trim().split(/\s+/).filter(Boolean).length;
  return Math.round((palavras / PALAVRAS_POR_SEGUNDO) * 10) / 10;
}

export default function Bancada({
  campanhaId,
  jobFonteId,
  urlClipe,
  duracaoClipeS,
  roteiroInicial,
}: Props) {
  const [gancho, setGancho] = useState('');
  const [cta, setCta] = useState('');
  const [roteiro, setRoteiro] = useState(roteiroInicial);
  const [corFaixa, setCorFaixa] = useState('#FFFFFF');

  const [urlNarracao, setUrlNarracao] = useState('');
  const [legendas, setLegendas] = useState<Legenda[]>([]);
  const [duracaoNarracaoS, setDuracaoNarracaoS] = useState(0);

  const [gerandoVoz, setGerandoVoz] = useState(false);
  const [renderizando, setRenderizando] = useState(false);
  const [erro, setErro] = useState('');

  const temNarracao = Boolean(urlNarracao) && duracaoNarracaoS > 0;
  const sobra = temNarracao ? duracaoNarracaoS - duracaoClipeS : 0;

  const inputProps = useMemo(
    () => ({
      urlClipe,
      duracaoClipeS,
      duracaoNarracaoS: duracaoNarracaoS || duracaoClipeS,
      gancho,
      cta,
      urlNarracao,
      legendas,
      corFaixa,
    }),
    [urlClipe, duracaoClipeS, duracaoNarracaoS, gancho, cta, urlNarracao, legendas, corFaixa],
  );

  async function gerarVoz() {
    setErro('');
    setGerandoVoz(true);
    try {
      const res = await fetch('/api/video/narracao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campanha_id: campanhaId, texto: roteiro }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detalhe || json.error || 'falha ao gerar voz');
      setUrlNarracao(json.url_narracao);
      setLegendas(json.legendas ?? []);
      setDuracaoNarracaoS(json.duracao_s ?? 0);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setGerandoVoz(false);
    }
  }

  async function renderizar() {
    setErro('');
    setRenderizando(true);
    try {
      const res = await fetch('/api/video/compor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campanha_id: campanhaId,
          job_fonte_id: jobFonteId,
          url_narracao: urlNarracao,
          params_json: {
            gancho,
            cta,
            cor_faixa: corFaixa,
            legendas,
            duracao_narracao_s: duracaoNarracaoS,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detalhe || json.error || 'falha ao criar o job');
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setRenderizando(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar">
      {/*
        `shrink-0` NAO e enfeite. Esta div e filha de um flex column com altura
        limitada; sem ele o flexbox encolhe o contêiner e o Player fica cortado
        — medido: Player em 338x601 dentro de um wrapper de 207px de altura,
        engolindo a faixa de CTA e a area da legenda queimada. Uma bancada que
        esconde 2 dos 3 blocos do anuncio nao serve pra aprovar nada.
      */}
      <div className="w-full shrink-0 bg-black rounded-xl border border-surface-elevated overflow-hidden">
        <Player
          component={AnuncioUGC}
          inputProps={inputProps}
          durationInFrames={duracaoEmFrames(duracaoNarracaoS || duracaoClipeS)}
          compositionWidth={LARGURA}
          compositionHeight={ALTURA}
          fps={FPS}
          controls
          style={{ width: '100%' }}
        />
      </div>

      {sobra > 0.2 && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-status-yellow/10 border border-status-yellow/30">
          <AlertTriangle size={13} className="text-status-yellow shrink-0 mt-0.5" />
          <p className="text-[11px] text-status-yellow leading-relaxed">
            Narração {sobra.toFixed(1)}s mais longa que o clipe — ele entra em loop.
            Encurte o roteiro se o loop ficar visível.
          </p>
        </div>
      )}

      <input
        value={gancho}
        onChange={(e) => setGancho(e.target.value)}
        placeholder="Gancho (faixa branca)"
        className="w-full bg-surface border border-surface-elevated rounded-lg px-3 py-2 text-xs text-white placeholder:text-secondary outline-none focus:border-primary"
      />

      <div>
        <textarea
          value={roteiro}
          onChange={(e) => setRoteiro(e.target.value)}
          placeholder="Roteiro falado (narração)"
          rows={5}
          className="w-full bg-surface border border-surface-elevated rounded-lg px-3 py-2 text-xs text-white placeholder:text-secondary outline-none focus:border-primary resize-none"
        />
        <div className="flex justify-between text-[10px] text-secondary mt-1">
          <span>{roteiro.length} caracteres</span>
          <span>~{estimarSegundos(roteiro)}s falados · clipe {duracaoClipeS}s</span>
        </div>
      </div>

      <input
        value={cta}
        onChange={(e) => setCta(e.target.value)}
        placeholder="CTA (faixa laranja)"
        className="w-full bg-surface border border-surface-elevated rounded-lg px-3 py-2 text-xs text-white placeholder:text-secondary outline-none focus:border-primary"
      />

      <div className="flex items-center gap-2">
        <label className="text-[11px] text-secondary">Cor da faixa</label>
        <input
          type="color"
          value={corFaixa}
          onChange={(e) => setCorFaixa(e.target.value)}
          className="w-8 h-8 bg-transparent border border-surface-elevated rounded cursor-pointer"
        />
      </div>

      {erro && (
        <div className="p-2 rounded-lg bg-status-red/10 border border-status-red/30 text-[11px] text-status-red">
          {erro}
        </div>
      )}

      <button
        onClick={gerarVoz}
        disabled={gerandoVoz || roteiro.trim().length < 10}
        className="w-full bg-primary hover:bg-primary-hover text-white py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {gerandoVoz ? <Loader2 size={14} className="animate-spin" /> : <Mic size={14} />}
        {gerandoVoz ? 'Gerando voz…' : 'Gerar voz'}
      </button>

      {/*
        Nasce desabilitado ate existir narracao. Isso torna a trava do banco
        (`compor_exige_narracao`) VISIVEL na tela, em vez de virar um 400
        depois do clique.
      */}
      <button
        onClick={renderizar}
        disabled={!temNarracao || renderizando}
        title={temNarracao ? '' : 'Gere a voz primeiro'}
        className="w-full bg-status-green/20 hover:bg-status-green/30 text-status-green border border-status-green/30 py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {renderizando ? <Loader2 size={14} className="animate-spin" /> : <Film size={14} />}
        {renderizando ? 'Enviando…' : 'Renderizar'}
      </button>
    </div>
  );
}
