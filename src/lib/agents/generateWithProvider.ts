// src/lib/agents/generateWithProvider.ts
//
// Geração de texto via o "cérebro" de um agente (agentes_config) respeitando o
// provider do modelo configurado:
//   - modelo 'claude*'  → tenta Anthropic; se falhar (ex.: sem crédito), cai
//                          para o OpenCode Zen (GRATUITO).
//   - modelo 'gpt*'     → OpenAI oficial (PAGA) — só quando escolhido de forma
//                          explícita na config do agente.
//   - qualquer outro    → OpenCode Zen (gratuito), o default do projeto.
// Usado por rotas que precisam de JSON estruturado do agente (diagnose, optimize).
//
// ⚠️ ANTES o fallback caía em gpt-4o-mini (PAGO) sem avisar: sempre que a
// Anthropic ficava sem crédito, o gasto só mudava de fatura. Agora o caminho de
// escape é gratuito, e provider pago só roda quando alguém pediu por nome.

import type { AgentConfig } from './buildSystemPrompt';
import { gerarComClaude } from '@/lib/anthropic';
import { chatComRetry } from '@/lib/openai';
import { chatComZen, OPENCODE_MODEL, zenConfigurado } from '@/lib/opencode';

export async function gerarJSONComAgente(
  config: AgentConfig,
  system: string,
  user: string
): Promise<{ raw: string; provider: string }> {
  const mensagens = [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: user },
  ];

  // PAGO — só por escolha explícita (modelo 'gpt*' na config do agente).
  const usarOpenAI = async (model: string) => {
    const resp = await chatComRetry({
      model,
      max_tokens: config.max_tokens,
      response_format: { type: 'json_object' },
      messages: mensagens,
    });
    return resp.choices[0]?.message?.content || '';
  };

  // GRATUITO — o caminho padrão. Sem `response_format`: nem todo modelo do Zen
  // aceita JSON mode, e o parseJSONFlexivel já lida com cercas de markdown.
  // `model` undefined = default do Zen (OPENCODE_MODEL).
  const usarZen = async (model?: string) => {
    const resp = await chatComZen({ model, max_tokens: config.max_tokens, messages: mensagens });
    return resp.choices[0]?.message?.content || '';
  };

  if (config.modelo.startsWith('claude')) {
    try {
      const raw = await gerarComClaude({ model: config.modelo, max_tokens: config.max_tokens, system, user });
      return { raw, provider: config.modelo };
    } catch (err) {
      if (!zenConfigurado) throw err;
      console.warn(
        '[generateWithProvider] Anthropic falhou, caindo para o Zen (gratuito):',
        (err as Error)?.message
      );
      const raw = await usarZen();
      return { raw, provider: `${OPENCODE_MODEL} (fallback)` };
    }
  }

  if (config.modelo.startsWith('gpt')) {
    const raw = await usarOpenAI(config.modelo);
    return { raw, provider: config.modelo };
  }

  // Qualquer outro nome de modelo é tratado como modelo do Zen (ex.: gravar
  // 'deepseek-v4-flash-free' em agentes_config.modelo já basta pra ficar grátis).
  const raw = await usarZen(config.modelo);
  return { raw, provider: config.modelo || OPENCODE_MODEL };
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
