// src/app/api/tracking/generate/route.ts
//
// MOTOR DO AGENTE TRACKING (FOP).
//
// Pega uma landing page já gerada pelo Designer (workflow_design.codigo_html),
// roda o agente para o DIAGNÓSTICO do funil (qual template A–E, value,
// content_name) e injeta a camada FOP (Pixel + Advanced Matching + dispatcher
// CAPI deduplicado) de forma DETERMINÍSTICA — ver src/lib/tracking/fop.ts.
//
// Arquitetura híbrida: a IA decide a INTELIGÊNCIA (hierarquia/params); o builder
// injeta o código byte-exato (dedup/AM não podem ser "alucinados").
//
// Disparo MANUAL, um de cada vez, pelo botão "play" em /tracking.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { supabaseServer as supabase } from '@/lib/supabase-server';
import { getAgentConfig, buildSystemPrompt } from '@/lib/agents/buildSystemPrompt';
import { chatComRetry } from '@/lib/openai';
import {
  getFunnelTemplate,
  injectFopIntoHtml,
  type FunnelType,
  type SnippetParams,
} from '@/lib/tracking/fop';

interface GenerateBody {
  design_id: string;
}

const TRACKING_MODEL = process.env.TRACKING_MODEL || 'gpt-4o-mini';

// Endpoint público do relay CAPI que o snippet da LP vai chamar. A LP roda
// noutro domínio, então precisa da URL ABSOLUTA do Synapse publicado.
function resolveCapiEndpoint(request: Request): string {
  if (process.env.TRACKING_CAPI_ENDPOINT) return process.env.TRACKING_CAPI_ENDPOINT;
  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  return `${base.replace(/\/$/, '')}/api/track/capi`;
}

function slugify(s: string): string {
  return (s || 'lp')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function POST(request: Request) {
  try {
    const { design_id } = (await request.json()) as GenerateBody;
    if (!design_id) {
      return Response.json({ error: 'design_id é obrigatório' }, { status: 400 });
    }

    // 1. A página gerada pelo Designer (precisa ter HTML).
    const { data: design, error: designErr } = await supabase
      .from('workflow_design')
      .select('id, campanha_id, codigo_html')
      .eq('id', design_id)
      .maybeSingle();

    if (designErr) {
      return Response.json(
        { error: 'Erro ao buscar o design', detalhe: designErr.message },
        { status: 500 }
      );
    }
    if (!design) {
      return Response.json({ error: 'Design não encontrado' }, { status: 404 });
    }
    if (!design.codigo_html) {
      return Response.json(
        { error: 'Esta página ainda não tem HTML. Gere a página no Designer antes de instalar o tracking.' },
        { status: 400 }
      );
    }

    // 2. Pixel ativo (padrão primeiro). Token fica só no servidor.
    const { data: pixels } = await supabase
      .from('tracking_config')
      .select('id, nome, pixel_id, ativo, padrao')
      .eq('ativo', true)
      .order('padrao', { ascending: false })
      .order('data_criacao', { ascending: true });

    const pixel = pixels?.[0];
    if (!pixel) {
      return Response.json(
        {
          error:
            'Nenhum Pixel configurado. Cadastre um Pixel + token da Conversions API na página Tracking antes de instalar.',
        },
        { status: 400 }
      );
    }

    // 3. Contexto pro diagnóstico (campanha + produto + copy aprovada).
    const { data: campanha } = await supabase
      .from('campanhas_producao')
      .select('nome_projeto, ad_minerado_id')
      .eq('id', design.campanha_id)
      .maybeSingle();

    let produto: { page_name?: string; ad_title?: string; ad_copy?: string; cta_text?: string; link_url?: string } | null =
      null;
    if (campanha?.ad_minerado_id) {
      const { data } = await supabase
        .from('ads_minerados')
        .select('page_name, ad_title, ad_copy, cta_text, link_url')
        .eq('id', campanha.ad_minerado_id)
        .maybeSingle();
      produto = data;
    }

    const { data: copy } = await supabase
      .from('workflow_copywriting')
      .select('conteudo_texto, meta_ads_copy')
      .eq('campanha_id', design.campanha_id)
      .eq('revisor_ok', true)
      .not('data_aprovacao', 'is', null)
      .order('data_aprovacao', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 4. Agente Tracking → diagnóstico do funil (JSON estruturado).
    const config = await getAgentConfig('tracking');
    if (!config) {
      return Response.json(
        {
          error:
            'Agente "tracking" não encontrado ou inativo. Rode a sincronização em /agents (Sincronizar da pasta agentes/) primeiro.',
        },
        { status: 400 }
      );
    }
    const systemPrompt = buildSystemPrompt(config);

    const userPrompt = `Diagnostique o funil desta oferta e proponha a hierarquia FOP.

=== PRODUTO / OFERTA ===
Nome do projeto: ${campanha?.nome_projeto || '—'}
Anunciante: ${produto?.page_name || '—'}
Título do anúncio: ${produto?.ad_title || '—'}
CTA do anúncio: ${produto?.cta_text || '—'}
Link de destino do anúncio: ${produto?.link_url || '—'}

=== COPY APROVADA (resumo do conteúdo da página) ===
${(copy?.conteudo_texto || produto?.ad_copy || '').slice(0, 2500)}

=== TAREFA ===
Escolha o template de funil FOP mais adequado e extraia os parâmetros.
Responda APENAS um JSON válido, sem markdown, no formato EXATO:
{
  "tipo_funil": "A|B|C|D|E",
  "content_name": "nome curto do produto/oferta",
  "content_id": "slug-curto-do-produto",
  "value": número (preço estimado em BRL; 0 se desconhecido),
  "currency": "BRL",
  "justificativa": "1 frase explicando a escolha do template"
}

Guia dos templates:
A = LP com popup (form em popup) · B = LP sem popup (form inline) ·
C = WhatsApp Direct (botão wa.me) · D = Instagram Direct (DM) · E = E-commerce (carrinho).`;

    let diag: {
      tipo_funil?: string;
      content_name?: string;
      content_id?: string;
      value?: number;
      currency?: string;
      justificativa?: string;
    } = {};
    try {
      const resp = await chatComRetry({
        model: TRACKING_MODEL,
        max_tokens: 500,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });
      diag = JSON.parse(resp.choices[0]?.message?.content || '{}');
    } catch (err) {
      // Fallback heurístico: sem IA, assume LP sem popup (B), o caso mais comum.
      console.warn('[tracking/generate] diagnóstico IA falhou, usando fallback B:', err);
      diag = { tipo_funil: 'B', justificativa: 'fallback (diagnóstico IA indisponível)' };
    }

    const tipoFunil = (['A', 'B', 'C', 'D', 'E'].includes((diag.tipo_funil || '').toUpperCase())
      ? (diag.tipo_funil as string).toUpperCase()
      : 'B') as FunnelType;
    const template = getFunnelTemplate(tipoFunil);

    const nomeOferta = diag.content_name || campanha?.nome_projeto || produto?.page_name || 'Oferta';
    const contentId = diag.content_id || slugify(nomeOferta);
    const value = Number(diag.value) || 0;
    const currency = diag.currency || 'BRL';

    // 5. Injeção determinística da camada FOP no HTML do Designer.
    const snippetParams: SnippetParams = {
      pixelId: pixel.pixel_id,
      capiEndpoint: resolveCapiEndpoint(request),
      funnel: tipoFunil,
      contentName: nomeOferta,
      contentId,
      value,
      currency,
    };
    const htmlFinal = injectFopIntoHtml(design.codigo_html, snippetParams);

    // 6. Upsert da ordem de serviço de tracking (1 por design).
    const { data: existente } = await supabase
      .from('workflow_tracking')
      .select('id')
      .eq('design_id', design_id)
      .maybeSingle();

    const row = {
      design_id,
      campanha_id: design.campanha_id,
      pixel_config_id: pixel.id,
      tipo_funil: tipoFunil,
      hierarquia_json: template.eventos,
      codigo_html_final: htmlFinal,
      status: 'instalado',
      observacoes: diag.justificativa || null,
      data_atualizacao: new Date().toISOString(),
    };

    let registro;
    if (existente) {
      const { data, error } = await supabase
        .from('workflow_tracking')
        .update(row)
        .eq('id', existente.id)
        .select()
        .single();
      if (error) throw error;
      registro = data;
    } else {
      const { data, error } = await supabase
        .from('workflow_tracking')
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      registro = data;
    }

    // 7. Salva o HTML instrumentado em disco (rede de segurança p/ edição manual).
    let arquivo: string | null = null;
    try {
      const dir = path.join(process.cwd(), 'lps');
      await fs.mkdir(dir, { recursive: true });
      const nomeArquivo = `${slugify(campanha?.nome_projeto || nomeOferta)}-${design_id.slice(0, 8)}-tracked.html`;
      await fs.writeFile(path.join(dir, nomeArquivo), htmlFinal, 'utf-8');
      arquivo = `lps/${nomeArquivo}`;
    } catch (err) {
      console.warn('[tracking/generate] não salvou em disco:', err instanceof Error ? err.message : err);
    }

    return Response.json({
      sucesso: true,
      pixel: pixel.nome,
      pixel_id: pixel.pixel_id,
      tipo_funil: tipoFunil,
      template: template.nome,
      eventos: template.eventos.length,
      content_name: nomeOferta,
      value,
      justificativa: diag.justificativa,
      arquivo,
      registro,
    });
  } catch (err) {
    console.error('[api/tracking/generate] erro:', err);
    const msg = err instanceof Error ? err.message : 'erro desconhecido';
    return Response.json({ error: 'Falha ao instalar o tracking', detalhe: msg }, { status: 500 });
  }
}
