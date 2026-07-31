"use client";

// Player de música de fundo do dashboard.
//
// POR QUE VIVE NO LAYOUT, E NÃO NA PÁGINA: no App Router, trocar de rota
// desmonta o componente da página. Se o <audio> morasse em `/` (Visão Geral),
// a música CORTARIA no instante em que você clicasse em Mineração. Aqui o
// elemento é montado uma única vez, junto da Sidebar, e sobrevive a toda a
// navegação — que é o que "toca sempre e nunca para" exige.
//
// O botão que controla isso vive na Visão Geral (`MusicButton`) e conversa com
// este provider por contexto. Assim o controle fica onde o Fernando pediu sem
// acoplar o áudio ao ciclo de vida daquela página.
//
// `loop` é atributo nativo do <audio>: o navegador reinicia sem gap e sem
// timer nosso. Não há "fim da faixa" para tratar.

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

/** Único arquivo hoje. Trocar aqui (ou virar playlist) não afeta o botão. */
const FAIXA = '/audio/v2_07_soulful_dub_pop_bed_trim_152.mp3';

const CHAVE_VOLUME = 'synapse_music_volume';
const CHAVE_TOCANDO = 'synapse_music_tocando';

// Cama sonora de fundo: 100% atrapalha quem está lendo um dossiê.
const VOLUME_PADRAO = 0.35;

interface MusicCtx {
  tocando: boolean;
  volume: number;
  bloqueado: boolean;
  alternar: () => void;
  ajustarVolume: (v: number) => void;
}

const Ctx = createContext<MusicCtx | null>(null);

/** Hook do controle. Devolve null se usado fora do provider (não quebra a página). */
export function useMusic(): MusicCtx | null {
  return useContext(Ctx);
}

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [tocando, setTocando] = useState(false);
  const [volume, setVolume] = useState(VOLUME_PADRAO);
  // O navegador bloqueia áudio sem interação do usuário. Quando isso acontece
  // na retomada automática, avisamos em vez de mentir que está tocando.
  const [bloqueado, setBloqueado] = useState(false);

  // Restaura a preferência e tenta retomar se estava tocando antes do reload.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const salvo = Number(localStorage.getItem(CHAVE_VOLUME));
    const vol = Number.isFinite(salvo) && salvo > 0 ? Math.min(salvo, 1) : VOLUME_PADRAO;
    setVolume(vol);
    el.volume = vol;

    if (localStorage.getItem(CHAVE_TOCANDO) === '1') {
      el.play()
        .then(() => setTocando(true))
        .catch(() => {
          // Autoplay barrado: precisa de um clique. Estado fica honesto (pausado).
          setBloqueado(true);
          setTocando(false);
        });
    }
  }, []);

  function alternar() {
    const el = audioRef.current;
    if (!el) return;

    if (el.paused) {
      el.volume = volume;
      el.play()
        .then(() => {
          setTocando(true);
          setBloqueado(false);
          localStorage.setItem(CHAVE_TOCANDO, '1');
        })
        .catch((e) => {
          console.warn('[music] navegador recusou tocar:', e?.message);
          setBloqueado(true);
        });
    } else {
      el.pause();
      setTocando(false);
      localStorage.setItem(CHAVE_TOCANDO, '0');
    }
  }

  function ajustarVolume(v: number) {
    const clamped = Math.max(0, Math.min(1, v));
    setVolume(clamped);
    if (audioRef.current) audioRef.current.volume = clamped;
    localStorage.setItem(CHAVE_VOLUME, String(clamped));
  }

  return (
    <Ctx.Provider value={{ tocando, volume, bloqueado, alternar, ajustarVolume }}>
      {/* preload="metadata": não baixa os 4 MB antes de alguém querer ouvir. */}
      <audio ref={audioRef} src={FAIXA} loop preload="metadata" />
      {children}
    </Ctx.Provider>
  );
}
