// src/video/AnuncioUGC.tsx
//
// A COMPOSICAO. Este arquivo e a unica fonte da verdade visual do anuncio:
// o `@remotion/player` na bancada toca ELE, e o worker em `remotion/` renderiza
// ELE. Se as duas metades divergissem, a bancada mentiria — voce aprovaria
// vendo uma coisa e receberia outra.
//
// 🚨 POR QUE MORA EM src/ E NAO EM remotion/:
// a regra do CLAUDE.md — "`remotion/` nunca e importado pelo app Next" —
// continua literalmente verdadeira porque a seta aponta ao contrario:
// remotion/ importa DAQUI. Assim o @remotion/renderer (48 MB de binario nativo
// + Chrome headless) nunca chega perto do bundle do Next.
//
// ⚠️ RESTRICAO REAL: este arquivo e compilado por DUAS versoes do React — 18
// (app Next) e 19 (remotion/). Nada de API especifica de versao aqui dentro.

import React from 'react';
import { AbsoluteFill, Audio, Loop, Video, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';

export const FPS = 30;
export const LARGURA = 1080;
export const ALTURA = 1920;

// A MATEMATICA DO TEMPLATE C, e ela fecha redonda:
// um clipe 1:1 em 1080x1920 ocupa 1080px de altura = 56,25% exatos.
// Sobram 840px para faixa + CTA. Nenhum corte, nenhum letterbox.
const ALTURA_FAIXA = 422;   // 0    -> 422
const ALTURA_CLIPE = 1080;  // 422  -> 1502
const ALTURA_CTA = 418;     // 1502 -> 1920

// A fonte e declarada UMA vez, aqui, e usada pelas duas faixas.
//
// E a forma mais provavel de a bancada mentir: fonte diferente quebra a linha
// em outro lugar, e o gancho que cabia em duas linhas na tela sai em tres no
// MP4. Fonte de sistema e segura HOJE porque o Player e o render rodam no mesmo
// Windows, com o mesmo Chrome.
// ⚠️ No dia em que o render sair para a nuvem (Remotion Lambda), isto precisa
// virar fonte embutida — a maquina de la nao tem as fontes desta aqui.
export const FONTE = '"Arial Black", "Arial Bold", Arial, sans-serif';

export const legendaSchema = z.object({
  texto: z.string(),
  inicio_s: z.number(),
  fim_s: z.number(),
});

export const anuncioUgcSchema = z.object({
  urlClipe: z.string(),
  duracaoClipeS: z.number().positive(),
  duracaoNarracaoS: z.number().positive(),
  gancho: z.string(),
  cta: z.string(),
  urlNarracao: z.string(),
  legendas: z.array(legendaSchema),
  corFaixa: z.string(),
});

export type Legenda = z.infer<typeof legendaSchema>;
export type AnuncioUgcProps = z.infer<typeof anuncioUgcSchema>;

/** A narracao manda na duracao. Arredonda pra cima pra nunca cortar a ultima silaba. */
export function duracaoEmFrames(duracaoNarracaoS: number): number {
  return Math.max(1, Math.ceil(duracaoNarracaoS * FPS));
}

const LegendaQueimada: React.FC<{ legendas: Legenda[] }> = ({ legendas }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const atual = legendas.find((l) => t >= l.inicio_s && t < l.fim_s);
  if (!atual) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 48,
        left: 48,
        right: 48,
        textAlign: 'center',
        fontFamily: FONTE,
        fontSize: 56,
        lineHeight: 1.15,
        color: '#FFFFFF',
        textShadow: '0 4px 16px rgba(0,0,0,0.9)',
      }}
    >
      {atual.texto}
    </div>
  );
};

export const AnuncioUGC: React.FC<AnuncioUgcProps> = ({
  urlClipe,
  duracaoClipeS,
  gancho,
  cta,
  urlNarracao,
  legendas,
  corFaixa,
}) => {
  const { fps } = useVideoConfig();
  const framesDoClipe = Math.max(1, Math.round(duracaoClipeS * fps));

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      {/* Faixa branca com o gancho */}
      <div
        style={{
          height: ALTURA_FAIXA,
          backgroundColor: corFaixa,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 64px',
        }}
      >
        <div
          style={{
            fontFamily: FONTE,
            fontSize: 72,
            lineHeight: 1.1,
            color: '#111111',
            textAlign: 'center',
          }}
        >
          {gancho}
        </div>
      </div>

      {/* O clipe, 1:1, MUDO */}
      <div style={{ height: ALTURA_CLIPE, position: 'relative', overflow: 'hidden' }}>
        {/*
          Loop porque a narracao manda na duracao (spec 6.4): congelar o ultimo
          frame le como VIDEO TRAVADO em feed; loop le como b-roll. Com o
          roteiros_video dimensionado pelo clipe, o caso normal nao chega aqui —
          isto e rede de seguranca pra quando o texto for editado na bancada.

          `muted` nao e detalhe: o clipe da Sora pode vir com audio, e se tocar
          junto da narracao o anuncio sai com duas vozes.
        */}
        <Loop durationInFrames={framesDoClipe}>
          <Video src={urlClipe} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </Loop>
        <LegendaQueimada legendas={legendas} />
      </div>

      {/* CTA */}
      <div
        style={{
          height: ALTURA_CTA,
          backgroundColor: '#F97316',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 64px',
        }}
      >
        <div
          style={{
            fontFamily: FONTE,
            fontSize: 64,
            lineHeight: 1.1,
            color: '#FFFFFF',
            textAlign: 'center',
          }}
        >
          {cta}
        </div>
      </div>

      <Audio src={urlNarracao} />
    </AbsoluteFill>
  );
};
