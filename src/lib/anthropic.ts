import Anthropic from '@anthropic-ai/sdk';
import { CampaignMetrics } from '@/types';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Modelo usado para GERAÇÃO DE DESIGN/HTML. Claude é muito superior ao
// gpt-4o-mini em frontend — por isso a página de vendas roda aqui, não na
// OpenAI. Configurável: se a conta não tiver acesso ao default, defina
// ANTHROPIC_DESIGN_MODEL no .env.local (ex.: claude-3-5-sonnet-20241022).
export const ANTHROPIC_DESIGN_MODEL =
  process.env.ANTHROPIC_DESIGN_MODEL || 'claude-sonnet-4-6';

/**
 * Gera texto com o Claude, com retry em erros transitórios (429/5xx/overloaded).
 * Devolve o texto concatenado dos blocos de resposta.
 */
export async function gerarComClaude(
  params: { model?: string; max_tokens: number; system: string; user: string },
  tentativas = 3
): Promise<string> {
  let ultimoErro: unknown;
  for (let i = 1; i <= tentativas; i++) {
    try {
      const response = await anthropic.messages.create({
        model: params.model || ANTHROPIC_DESIGN_MODEL,
        max_tokens: params.max_tokens,
        system: params.system,
        messages: [{ role: 'user', content: params.user }],
      });
      return response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
    } catch (err) {
      ultimoErro = err;
      const status = (err as { status?: number })?.status;
      const transitorio = !status || status >= 500 || status === 429;
      console.warn(
        `[anthropic] tentativa ${i}/${tentativas} falhou (status ${status ?? '?'})` +
          (transitorio && i < tentativas ? ' — re-tentando…' : '')
      );
      if (!transitorio || i === tentativas) break;
      await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
  throw ultimoErro;
}

export async function callDiagnostic(campaignName: string, metrics: CampaignMetrics) {
  const prompt = `Você é um analista sênior de performance e media buyer especialista em Meta Ads para e-commerce dropshipping. Sua função é diagnosticar campanhas com base no princípio 80x10x10 e gerar recomendações acionáveis.

Regras de diagnóstico:
- Connect Rate < 80%: problema de velocidade/UX da landing page ou desalinhamento criativo->página
- Conversão LP < 10%: oferta fraca, copy desalinhada, falta de prova social ou CTA fraco
- Conversão Checkout < 10%: checkout complexo, frete inesperado, falta de método de pagamento ou erro técnico
- ROAS < 2: campanha não cobre custos — não escalar
- CTR < 1%: criativo fraco ou público errado
- CPM alto com CTR baixo: audiência saturada ou criativo não performando
- CPA > 40% do ticket médio: margem comprometida

Classifique sempre o gargalo principal. Retorne JSON com:
{
  "gargalo": "string (nome da métrica problemática ou 'nenhum')",
  "diagnostico": "string (2-3 frases explicando o problema)",
  "recomendacoes": [
    { "texto": "string", "prioridade": "alta"|"media"|"baixa" }
  ]
}
Retorne somente o JSON, sem markdown.

Aqui estão os dados da campanha:
Campanha: ${campaignName}
Data: ${new Date().toISOString()}
Métricas: ${JSON.stringify(metrics, null, 2)}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022', // Updated to available Sonnet model
      max_tokens: 1000,
      system: "Retorne apenas o JSON.",
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return JSON.parse(content.text);
    }
    return null;
  } catch (error) {
    console.error('Error calling Anthropic:', error);
    throw error;
  }
}
