import { NextResponse } from 'next/server';
import { getAgentConfig, buildSystemPrompt } from '@/lib/agents/buildSystemPrompt';
import { gerarJSONComAgente, parseJSONFlexivel } from '@/lib/agents/generateWithProvider';
import { supabaseServer } from '@/lib/supabase-server';

// Contrato de saída para esta chamada programática. O cérebro do agente
// (gestor-meta-ads) responde normalmente em markdown; aqui sobrescrevemos o
// formato para JSON estruturado que o dashboard consegue persistir e exibir.
const OUTPUT_CONTRACT = `
---

## CONTRATO DE SAÍDA (OBRIGATÓRIO PARA ESTA CHAMADA)
Ignore o "FORMATO DE RESPOSTA PADRÃO" em markdown. Para esta requisição automática,
responda APENAS com um objeto JSON válido (sem cercas \`\`\`, sem texto fora do JSON):

{
  "gargalo": "string curta nomeando a métrica/etapa problemática, ou 'nenhum'",
  "diagnostico": "2 a 4 frases explicando a causa provável conectada ao algoritmo da Meta",
  "prioridade": "alta" | "media" | "baixa",
  "recomendacoes": [
    { "texto": "ação prática e específica", "prioridade": "alta" | "media" | "baixa" }
  ]
}

Regras:
- Avalie SEMPRE no contexto do objetivo da campanha. Se for tráfego/awareness, NÃO exija
  ROAS de compra — foque em CTR, CPM, Connect Rate e custo por resultado do objetivo dela.
- 1 a 4 recomendações, ordenadas por prioridade.
- Use os benchmarks do mercado brasileiro definidos na sua skill.`;

interface DiagnosticoJSON {
  gargalo: string;
  diagnostico: string;
  prioridade: string;
  recomendacoes: { texto: string; prioridade: string }[];
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const alvoId: string | undefined = body?.meta_campaign_id;

    const config = await getAgentConfig('gestor-meta-ads');
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Agente gestor-meta-ads não sincronizado ou inativo' },
        { status: 400 }
      );
    }
    const systemPrompt = buildSystemPrompt(config) + '\n\n' + OUTPUT_CONTRACT;

    // Define o alvo: uma campanha específica ou todas as ativas
    let campQuery = supabaseServer
      .from('meta_campaigns')
      .select('meta_campaign_id, nome, objetivo, ativo');
    campQuery = alvoId
      ? campQuery.eq('meta_campaign_id', alvoId)
      : campQuery.eq('ativo', true);

    const { data: campanhas, error: campErr } = await campQuery;
    if (campErr) throw campErr;
    if (!campanhas || campanhas.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhuma campanha-alvo encontrada (sincronize antes)' },
        { status: 404 }
      );
    }

    const hoje = new Date().toISOString().slice(0, 10);
    const relatorio: { meta_campaign_id: string; nome: string; ok: boolean; gargalo?: string; erro?: string }[] = [];

    for (const c of campanhas) {
      // Última métrica da campanha
      const { data: metricRows } = await supabaseServer
        .from('meta_campaign_metrics')
        .select('*')
        .eq('meta_campaign_id', c.meta_campaign_id)
        .order('data', { ascending: false })
        .limit(1);

      const m = metricRows?.[0];
      if (!m) {
        relatorio.push({ meta_campaign_id: c.meta_campaign_id, nome: c.nome, ok: false, erro: 'sem métricas' });
        continue;
      }

      const userMsg = `Diagnostique a campanha abaixo e responda no contrato de saída JSON.

Campanha: ${c.nome}
Objetivo da campanha: ${c.objetivo}
Métricas (lifetime, R$ em BRL):
${JSON.stringify(
  {
    impressoes: m.impressoes,
    alcance: m.alcance,
    frequencia: m.frequencia,
    cliques_link: m.cliques_link,
    ctr_pct: m.ctr,
    cpc: m.cpc,
    cpm: m.cpm,
    valor_gasto: m.valor_gasto,
    landing_page_views: m.landing_page_views,
    connect_rate: m.connect_rate,
    checkouts_iniciados: m.checkouts_iniciados,
    conversao_lp: m.conversao_lp,
    compras: m.compras,
    conversao_checkout: m.conversao_checkout,
    valor_conversao: m.valor_conversao,
    roas: m.roas,
    cpa: m.cpa,
  },
  null,
  2
)}`;

      try {
        const { raw, provider } = await gerarJSONComAgente(config, systemPrompt, userMsg);
        const diag = parseJSONFlexivel<DiagnosticoJSON>(raw);

        const { error: upErr } = await supabaseServer.from('meta_ai_diagnostics').upsert(
          {
            meta_campaign_id: c.meta_campaign_id,
            data: hoje,
            gargalo: diag.gargalo,
            diagnostico: diag.diagnostico,
            recomendacoes: diag.recomendacoes ?? [],
            prioridade: diag.prioridade,
            modelo: provider,
          },
          { onConflict: 'meta_campaign_id,data' }
        );
        if (upErr) throw upErr;

        relatorio.push({ meta_campaign_id: c.meta_campaign_id, nome: c.nome, ok: true, gargalo: diag.gargalo });
      } catch (err: any) {
        console.error('[api/meta/diagnose] falha na campanha', c.meta_campaign_id, err);
        relatorio.push({ meta_campaign_id: c.meta_campaign_id, nome: c.nome, ok: false, erro: err?.message || 'erro IA' });
      }
    }

    const okCount = relatorio.filter((r) => r.ok).length;
    return NextResponse.json({
      success: true,
      message: `Diagnóstico finalizado: ${okCount}/${campanhas.length} campanhas`,
      relatorio,
    });
  } catch (err: any) {
    console.error('[api/meta/diagnose] erro:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Falha no diagnóstico' }, { status: 500 });
  }
}
