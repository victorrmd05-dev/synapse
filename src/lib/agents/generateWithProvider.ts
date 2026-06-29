// src/lib/agents/generateWithProvider.ts
//
// Geração de texto via o "cérebro" de um agente (agentes_config) respeitando o
// provider do modelo configurado, com FALLBACK automático:
//   - modelo 'claude*'  → tenta Anthropic; se falhar (ex.: sem crédito) e houver
//                          OPENAI_API_KEY, cai para OpenAI sem mudar config.
//   - modelo 'gpt*'     → OpenAI direto (JSON mode garante saída parseável).
// Usado por rotas que precisam de JSON estruturado do agente (diagnose, optimize).

import type { AgentConfig } from './buildSystemPrompt';
import { gerarComClaude } from '@/lib/anthropic';
import { chatComRetry, OPENAI_MODEL } from '@/lib/openai';

export async function gerarJSONComAgente(
  config: AgentConfig,
  system: string,
  user: string
): Promise<{ raw: string; provider: string }> {
  const usarOpenAI = async (model: string) => {
    const resp = await chatComRetry({
      model,
      max_tokens: config.max_tokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
    return resp.choices[0]?.message?.content || '';
  };

  if (config.modelo.startsWith('claude')) {
    try {
      const raw = await gerarComClaude({ model: config.modelo, max_tokens: config.max_tokens, system, user });
      return { raw, provider: config.modelo };
    } catch (err) {
      if (!process.env.OPENAI_API_KEY) throw err;
      console.warn('[generateWithProvider] Anthropic falhou, caindo para OpenAI:', (err as Error)?.message);
      const raw = await usarOpenAI(OPENAI_MODEL);
      return { raw, provider: `${OPENAI_MODEL} (fallback)` };
    }
  }

  const model = config.modelo.startsWith('gpt') ? config.modelo : OPENAI_MODEL;
  const raw = await usarOpenAI(model);
  return { raw, provider: model };
}

/** Extrai um objeto JSON mesmo se vier embrulhado em cercas markdown ou texto. */
export function parseJSONFlexivel<T = any>(raw: string): T {
  let txt = raw.trim();
  if (txt.startsWith('```')) {
    txt = txt.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  }
  const start = txt.indexOf('{');
  const end = txt.lastIndexOf('}');
  if (start !== -1 && end !== -1) txt = txt.slice(start, end + 1);
  return JSON.parse(txt) as T;
}
