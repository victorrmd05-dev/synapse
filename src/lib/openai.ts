// src/lib/openai.ts
//
// Client único da OpenAI (API oficial) + helper de retry, compartilhado pelas
// rotas de IA que rodam na OpenAI (copywriting, revisor, ...).
//
// Variáveis de ambiente:
//   OPENAI_API_KEY=sk-...        (obrigatória)
//   OPENAI_MODEL=gpt-4o-mini     (opcional; default abaixo)

import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// A API da OpenAI pode devolver erros transitórios (429 rate limit, 5xx).
// Re-tentamos algumas vezes com backoff antes de desistir. 4xx (auth, request
// inválido) não adianta re-tentar.
export async function chatComRetry(
  params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
  tentativas = 4
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  let ultimoErro: unknown;
  for (let i = 1; i <= tentativas; i++) {
    try {
      return await openai.chat.completions.create(params);
    } catch (err) {
      ultimoErro = err;
      const status = (err as { status?: number })?.status;
      const transitorio = !status || status >= 500 || status === 429;
      console.warn(
        `[openai] tentativa ${i}/${tentativas} falhou (status ${status ?? '?'})` +
          (transitorio && i < tentativas ? ' — re-tentando…' : '')
      );
      if (!transitorio || i === tentativas) break;
      await new Promise((r) => setTimeout(r, 800 * i)); // backoff linear
    }
  }
  throw ultimoErro;
}
