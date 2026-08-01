// src/lib/wavespeed/client.ts
//
// Falar HTTP com a WaveSpeed. So isso: nao grava no banco, nao baixa arquivo,
// nao decide nada de negocio (nem qual caminho de modelo usar — isso e do
// chamador, ver aviso sobre CHAVE_IMAGEM abaixo).
//
// 💸 `submeterVideo` E A UNICA FUNCAO DO PROJETO QUE GASTA CREDITO PRE-PAGO.
// Ela so pode ser chamada a partir de um clique confirmado, nunca de um worker,
// nunca em loop, nunca como fallback.
//
// MEDIDO NA CHAMADA REAL (Task 1, 31/07/2026): clipe de 4s em
// `openai/sora-2/text-to-video` levou 135,8s ate `completed` — ~34x o tempo
// real do video. E por isso que isto nao roda em route handler: e fila +
// worker (Tasks 4 e 5), com polling a cada ~15s (~9 consultas por clipe).

const BASE = 'https://api.wavespeed.ai/api/v3';

// Chave do corpo confirmada na Task 1 (chamada real, saldo caiu, video saiu):
// `openai/sora-2/text-to-video` aceita `duration` em segundos.
const CHAVE_DURACAO = 'duration';

// 🚨 CHAVE_IMAGEM NAO ESTA CONFIRMADA — e palpite, nao achado.
//
// A chamada real da Task 1 testou SO text-to-video (sem imagem). O desenho
// original deste arquivo assumia que `image_url` opcional bastava para virar
// image-to-video "no mesmo modelo" — os achados corrigem isso: o MODO esta no
// CAMINHO. `openai/sora-2/text-to-video` e um caminho; image-to-video e OUTRO
// caminho (algo como `openai/sora-2/image-to-video`), possivelmente com corpo
// diferente, chave de imagem diferente, e talvez nem aceite `duration` do
// mesmo jeito.
//
// Mandar `image` para o endpoint de text-to-video nao da erro bonito — desperdica
// uma GERACAO PAGA (~135s de processamento cobrado) tentando algo que o modelo
// pode simplesmente ignorar ou rejeitar tarde. `submeterVideo` abaixo NAO decide
// isso por voce: ela so monta o corpo com o que `opts` mandar, e `opts.modelo` e
// escolhido por quem chama. Antes de ligar image-to-video de verdade:
//   1. Confirmar o caminho real do modelo i2v (checar a pagina do modelo).
//   2. Confirmar a chave de imagem NESSE caminho — nao herdar este valor sem checar.
//   3. So entao apontar `opts.modelo` para o caminho i2v ao chamar esta funcao.
const CHAVE_IMAGEM = 'image';

export type StatusWaveSpeed =
  | 'created' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'timeout';

export interface ResultadoWaveSpeed {
  status: StatusWaveSpeed;
  outputs: string[];
  erro?: string;
}

function chave(): string {
  const k = process.env.WAVESPEED_API_KEY;
  if (!k) {
    throw new Error(
      'WAVESPEED_API_KEY ausente. A chave so funciona apos um top-up na WaveSpeed.',
    );
  }
  return k;
}

/**
 * 💸 COBRA. Submete e devolve o id da tarefa. Nao espera o video ficar pronto.
 *
 * `opts.modelo` decide o caminho (e portanto o modo) — esta funcao nao infere
 * nada a partir de `imageUrl` estar presente ou nao alem de incluir a chave no
 * corpo. Quem chama e responsavel por mandar um `modelo` de image-to-video
 * quando `imageUrl` estiver preenchido (ver aviso sobre CHAVE_IMAGEM acima).
 */
export async function submeterVideo(opts: {
  modelo: string; // 'owner/nome/versao' — ja escolhido pelo chamador (t2v ou i2v)
  prompt: string;
  imageUrl?: string;
  duracaoS?: number;
}): Promise<{ taskId: string }> {
  const body: Record<string, unknown> = { prompt: opts.prompt };
  if (opts.duracaoS) body[CHAVE_DURACAO] = opts.duracaoS;
  if (opts.imageUrl) body[CHAVE_IMAGEM] = opts.imageUrl;

  const res = await fetch(`${BASE}/${opts.modelo}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${chave()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const texto = await res.text();
  if (!res.ok) {
    // O corpo do erro da WaveSpeed costuma listar os campos aceitos — vale ouro
    // quando o modelo espera chaves diferentes. Nunca engolir.
    throw new Error(`WaveSpeed ${res.status}: ${texto.slice(0, 500)}`);
  }

  const json = JSON.parse(texto);
  const taskId = json?.data?.id;
  if (!taskId) throw new Error(`WaveSpeed nao devolveu data.id: ${texto.slice(0, 300)}`);
  return { taskId };
}

/** Gratis e idempotente. Pode ser chamada quantas vezes quiser. */
export async function consultarTarefa(taskId: string): Promise<ResultadoWaveSpeed> {
  const res = await fetch(`${BASE}/predictions/${taskId}/result`, {
    headers: { Authorization: `Bearer ${chave()}` },
    cache: 'no-store',
  });

  const texto = await res.text();
  if (!res.ok) throw new Error(`WaveSpeed ${res.status}: ${texto.slice(0, 500)}`);

  const d = JSON.parse(texto)?.data ?? {};
  return {
    status: (d.status ?? 'processing') as StatusWaveSpeed,
    outputs: Array.isArray(d.outputs) ? d.outputs : [],
    erro: d.error ?? undefined,
  };
}
