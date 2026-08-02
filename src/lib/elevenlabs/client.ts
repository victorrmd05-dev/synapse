// src/lib/elevenlabs/client.ts
//
// 💸 GASTA COTA. Cada chamada consome caracteres do plano da ElevenLabs.
//
// 🚨 SO A ROTA CHAMA ISTO. O worker do Remotion NUNCA importa este arquivo.
// Motivo: o padrao de fila do projeto reprocessa job travado (incrementa
// `tentativas` e pega de novo). Se o worker gerasse a narracao, um render que
// morre no meio — Chrome que cai, maquina que dorme — gastaria a cota de novo.
// Mesma licao da WaveSpeed: retry automatico e cobranca nao podem morar no
// mesmo lugar. Por isso a narracao e paga ANTES, no clique, e o worker so le o
// mp3 pronto do Storage.
//
// O formato da resposta foi MEDIDO em 01/08/2026 — ver
// docs/superpowers/plans/2026-08-01-remotion-bancada-ACHADOS.md.

const BASE = 'https://api.elevenlabs.io/v1';

export interface NarracaoBruta {
  audio: Buffer;
  caracteres: string[];
  inicios: number[];
  fins: number[];
}

export function configuracaoElevenLabs() {
  const chave = process.env.ELEVENLABS_API_KEY;
  const voz = process.env.ELEVENLABS_VOICE_ID;
  const modelo = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
  return { chave, voz, modelo };
}

export async function narrarComTimestamps(texto: string): Promise<NarracaoBruta> {
  const { chave, voz, modelo } = configuracaoElevenLabs();
  if (!chave) throw new Error('ELEVENLABS_API_KEY nao configurada no .env.local');
  if (!voz) throw new Error('ELEVENLABS_VOICE_ID nao configurado no .env.local');

  const res = await fetch(`${BASE}/text-to-speech/${voz}/with-timestamps`, {
    method: 'POST',
    headers: { 'xi-api-key': chave, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: texto, model_id: modelo }),
  });

  const bruto = await res.text();
  if (!res.ok) {
    // A mensagem carrega o status: 401 e chave, 422 e texto invalido, e o
    // estouro de cota tem corpo proprio — quem le o erro precisa saber qual.
    // 🚨 402 `paid_plan_required` tem causa conhecida e nao e bug: voz de
    // categoria `professional` (Voice Library) nao roda no plano gratuito.
    // Medido duas vezes com a Keren em 01/08 — ver o ACHADOS.md.
    throw new Error(`ElevenLabs HTTP ${res.status}: ${bruto.slice(0, 300)}`);
  }

  const json = JSON.parse(bruto);

  // 🚨 `alignment`, NAO `normalized_alignment` — e o contrario do que este
  // plano supunha antes de medir.
  //
  // MEDIDO em 01/08/2026 com um texto de 66 chars:
  //   alignment            -> 66 chars, identico ao enviado
  //   normalized_alignment -> 68 chars, com um espaco no inicio E no fim
  //
  // Os dois caracteres de padding do `normalized` entrariam na primeira e na
  // ultima legenda, deslocando o agrupamento. Ver o ACHADOS.md desta rodada.
  const alinhamento = json.alignment ?? json.normalized_alignment;
  if (!alinhamento) {
    throw new Error(
      `resposta da ElevenLabs sem alignment. Chaves recebidas: ${Object.keys(json).join(', ')}`,
    );
  }

  const caracteres: string[] = alinhamento.characters ?? [];
  const inicios: number[] = alinhamento.character_start_times_seconds ?? [];
  const fins: number[] = alinhamento.character_end_times_seconds ?? [];
  if (!caracteres.length || !inicios.length || !fins.length) {
    throw new Error(
      `alignment veio vazio ou com nomes diferentes. Chaves do alignment: ${Object.keys(alinhamento).join(', ')}`,
    );
  }

  const b64: string | undefined = json.audio_base64 ?? json.audio;
  if (!b64) {
    throw new Error(`resposta sem audio. Chaves recebidas: ${Object.keys(json).join(', ')}`);
  }
  const audio = Buffer.from(b64, 'base64');
  if (audio.length < 1000) {
    throw new Error(`audio suspeito: ${audio.length} bytes`);
  }

  return { audio, caracteres, inicios, fins };
}
