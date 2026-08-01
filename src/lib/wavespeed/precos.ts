// src/lib/wavespeed/precos.ts
//
// POR QUE ESTA TABELA E ESCRITA A MAO: a documentacao da WaveSpeed nao expoe
// preco por modelo via API — so nas paginas de cada modelo, em HTML. Entao isto
// e ESTIMATIVA, mantida manualmente, e VAI DESATUALIZAR.
//
// A fatura da WaveSpeed e a verdade. Numero que parece exato vira promessa, por
// isso a tela precisa dizer "estimado" ao lado do valor.
//
// MEDIDO EM 01/08/2026 — o numero saiu da diferenca entre dois saldos reais,
// nao de tabela de preco publicada:
//
//   saldo apos a chamada da Task 1 (31/07, registrado no NOTES.md) .... US$ 5,20
//   saldo apos 1 clipe de 4s em openai/sora-2/text-to-video ........... US$ 4,80
//   -------------------------------------------------------------------------
//   custo do clipe de 4s ............................................. US$ 0,40
//   por segundo ...................................................... US$ 0,10
//
// LIMITE DESTA MEDICAO: e UMA amostra, de UMA duracao. Se a WaveSpeed cobrar
// por chamada + por segundo (e nao estritamente linear), extrapolar 4s para 10s
// erra. Por isso o valor continua sendo ESTIMATIVA e a tela precisa dizer
// "estimado" ao lado — a fatura continua sendo a verdade.
//
// ⚠️ US$ 0,10/s faz do Sora 2 um modelo CARO para trabalho de rotina: os 3
// prompts que o Copywriting escreve, a 10s cada, dao US$ 3,00 POR CAMPANHA.

/** US$ por segundo de video, por caminho de modelo. */
const USD_POR_SEGUNDO: Record<string, number> = {
  // Medido por diferenca de saldo (01/08/2026) — ver o cabecalho deste arquivo.
  'openai/sora-2/text-to-video': 0.1,
};

/** Conferido em: data da ultima checagem manual dos precos. */
export const PRECOS_CONFERIDOS_EM = '2026-08-01';

/**
 * Estimativa de custo. Devolve `null` quando o modelo nao esta na tabela — e o
 * chamador PRECISA tratar esse null mostrando "custo desconhecido", nunca zero.
 * Mostrar R$ 0,00 para um modelo desconhecido faria o usuario aprovar um gasto
 * que ele acha que e de graca.
 */
export function estimarCustoUsd(modelo: string, duracaoS: number): number | null {
  const porSegundo = USD_POR_SEGUNDO[modelo];
  if (porSegundo === undefined) return null;
  return Number((porSegundo * duracaoS).toFixed(4));
}
