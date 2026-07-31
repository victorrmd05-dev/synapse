// src/lib/opencode.ts
//
// Client do OPENCODE ZEN — endpoint compatível com a API da OpenAI, mas com
// modelos GRATUITOS. É o provider PADRÃO das rotas de IA deste app.
//
// A regra de ouro do projeto (custo):
//   - O que roda SOZINHO (score da mineração, 1ª passada do revisor, rascunho
//     de diagnóstico) sai daqui: não gera fatura.
//   - O que exige JULGAMENTO de verdade (copy final, landing page, dossiê) é
//     feito no Claude Code, FORA do app, e gravado direto no Supabase.
//   - Provider PAGO (OpenAI oficial / Anthropic) só entra quando alguém liga
//     explicitamente no .env.local. Nunca por fallback silencioso.
//
// Variáveis de ambiente:
//   OPENCODE_API_KEY=...                     (obrigatória)
//   OPENCODE_MODEL=deepseek-v4-flash-free    (opcional; default abaixo)
//   OPENCODE_BASE_URL=...                    (opcional)
//   OPENCODE_MIN_MAX_TOKENS=8000             (opcional; ver aviso abaixo)

import OpenAI from 'openai';
import { chatComRetry } from './openai';

export const OPENCODE_BASE_URL =
  process.env.OPENCODE_BASE_URL || 'https://opencode.ai/zen/v1';

export const OPENCODE_MODEL =
  process.env.OPENCODE_MODEL || 'deepseek-v4-flash-free';

// ⚠️ PEGADINHA QUE JÁ CUSTOU HORAS DE DEBUG:
// o deepseek-v4-flash é um modelo de RACIOCÍNIO — ele gasta tokens "pensando"
// antes de escrever a resposta. Com max_tokens baixo, o orçamento acaba no
// raciocínio e o `content` volta VAZIO, sem erro nenhum (parece bug de parse).
// Por isso todo pedido daqui tem um PISO alto de max_tokens.
export const OPENCODE_MIN_MAX_TOKENS =
  Number(process.env.OPENCODE_MIN_MAX_TOKENS) || 8000;

/** true se dá para usar o Zen (chave presente). Use antes de cair pra provider pago. */
export const zenConfigurado = !!process.env.OPENCODE_API_KEY;

export const opencode = new OpenAI({
  apiKey: process.env.OPENCODE_API_KEY || '',
  baseURL: OPENCODE_BASE_URL,
});

/**
 * Chat no OpenCode Zen, com o mesmo backoff da OpenAI e o piso de max_tokens
 * aplicado. `model` é opcional — o default é OPENCODE_MODEL.
 */
export async function chatComZen(
  params: Omit<OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming, 'model'> & {
    model?: string;
  },
  tentativas = 4
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  if (!zenConfigurado) {
    throw new Error(
      'OPENCODE_API_KEY não configurada — sem ela não existe caminho gratuito. ' +
        'Defina no .env.local, ou ligue um provider pago explicitamente.'
    );
  }

  return chatComRetry(
    {
      ...params,
      model: params.model || OPENCODE_MODEL,
      max_tokens: Math.max(params.max_tokens ?? 0, OPENCODE_MIN_MAX_TOKENS),
    },
    tentativas,
    opencode
  );
}
