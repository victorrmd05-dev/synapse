// src/lib/elevenlabs/legendas.ts
//
// Transforma o alignment por CARACTERE da ElevenLabs em linhas de legenda.
//
// 🚨 POR QUE ISTO RODA NA ROTA E NAO NO COMPONENTE: o Player e o worker
// precisam ler exatamente os MESMOS dados. Se cada um agrupasse por conta
// propria, a legenda sairia num tempo na bancada e em outro no MP4 — a bancada
// mentiria, que e o unico defeito que este modulo inteiro existe para evitar.
// Agrupa uma vez, grava em params_json.legendas, os dois leem de la.

// 🚨 O tipo `Legenda` tem UMA definicao no projeto, e ela vive na composicao
// (src/video/AnuncioUGC.tsx), porque e a composicao que consome. `import type`
// e apagado na compilacao, entao este arquivo NAO ganha dependencia de runtime
// do pacote `remotion`. Duas definicoes iguais em arquivos diferentes divergem
// no primeiro campo novo — e a divergencia so aparece no MP4.
import type { Legenda } from '@/video/AnuncioUGC';

export type { Legenda };

const MAX_CHARS_PADRAO = 28;

export function agruparLegendas(
  caracteres: string[],
  inicios: number[],
  fins: number[],
  maxChars: number = MAX_CHARS_PADRAO,
): Legenda[] {
  const n = Math.min(caracteres.length, inicios.length, fins.length);
  if (n === 0) return [];

  const legendas: Legenda[] = [];
  let texto = '';
  let inicio = inicios[0] ?? 0;
  let fim = inicio;

  const fechar = () => {
    const t = texto.trim();
    if (t) {
      legendas.push({
        texto: t,
        inicio_s: Number(inicio.toFixed(3)),
        fim_s: Number(fim.toFixed(3)),
      });
    }
    texto = '';
  };

  for (let i = 0; i < n; i++) {
    const c = caracteres[i];
    if (texto === '') inicio = inicios[i] ?? fim;
    texto += c;
    fim = fins[i] ?? inicio;

    const pontuacaoForte = /[.!?…]/.test(c);
    const podeQuebrar = /\s/.test(c);
    if (pontuacaoForte || (texto.length >= maxChars && podeQuebrar)) fechar();
  }
  fechar();

  return legendas;
}

/** Fim da ultima legenda = duracao falada. E ela que manda na duracao do anuncio. */
export function duracaoDasLegendas(legendas: Legenda[]): number {
  return legendas.length ? legendas[legendas.length - 1].fim_s : 0;
}
