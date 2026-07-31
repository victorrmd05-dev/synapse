"use client";

// Controle da música de fundo, exibido no header da Visão Geral.
// O áudio em si vive no MusicProvider (layout) — ver o comentário lá sobre por
// que o elemento não pode morar nesta página.

import React from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { useMusic } from '../layout/MusicProvider';

export function MusicButton() {
  const music = useMusic();
  if (!music) return null; // provider ausente — não quebra a página

  const { tocando, volume, bloqueado, alternar, ajustarVolume } = music;

  return (
    <div className="bg-surface border border-surface-elevated rounded-lg flex items-center gap-3 pl-1 pr-3 py-1">
      <button
        onClick={alternar}
        title={tocando ? 'Pausar música' : 'Tocar música em loop'}
        aria-label={tocando ? 'Pausar música' : 'Tocar música'}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-white hover:bg-surface-elevated transition-colors"
      >
        {tocando ? (
          <Pause size={15} className="text-primary" />
        ) : (
          <Play size={15} className="text-primary" />
        )}
        {tocando ? 'Pause' : 'Play Music'}
      </button>

      <div className="flex items-center gap-2 border-l border-surface-elevated pl-3">
        <Volume2 size={14} className={tocando ? 'text-primary' : 'text-secondary'} />
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => ajustarVolume(Number(e.target.value))}
          aria-label="Volume da música"
          title={`Volume ${Math.round(volume * 100)}%`}
          className="w-20 h-1 accent-primary cursor-pointer"
        />
      </div>

      {bloqueado && (
        <span className="text-[11px] text-status-yellow" title="O navegador exige um clique antes de tocar áudio">
          clique p/ liberar
        </span>
      )}
    </div>
  );
}
