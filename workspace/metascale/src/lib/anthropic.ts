import Anthropic from '@anthropic-ai/sdk';
import { CampaignMetrics } from '@/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

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
