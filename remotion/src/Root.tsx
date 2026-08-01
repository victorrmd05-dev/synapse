import React from 'react';
import { Composition } from 'remotion';
import {
  AnuncioUGC,
  anuncioUgcSchema,
  duracaoEmFrames,
  FPS,
  LARGURA,
  ALTURA,
} from '../../src/video/AnuncioUGC';

// A composicao vem de src/video/ — o app Next e este projeto renderizam
// EXATAMENTE o mesmo componente. Ver o cabecalho daquele arquivo.
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="AnuncioUGC"
      component={AnuncioUGC}
      schema={anuncioUgcSchema}
      width={LARGURA}
      height={ALTURA}
      fps={FPS}
      durationInFrames={FPS * 10}
      defaultProps={{
        urlClipe: '',
        duracaoClipeS: 5,
        duracaoNarracaoS: 10,
        gancho: 'O gancho entra aqui',
        cta: 'Clique e garanta o seu',
        urlNarracao: '',
        legendas: [],
        corFaixa: '#FFFFFF',
      }}
      // A narracao manda na duracao. Isto roda tanto no Studio quanto no
      // selectComposition() do worker, entao os dois chegam no mesmo numero.
      calculateMetadata={({ props }) => ({
        durationInFrames: duracaoEmFrames(props.duracaoNarracaoS),
      })}
    />
  );
};
