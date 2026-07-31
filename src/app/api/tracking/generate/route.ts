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
import { chatComZen } from '@/lib/opencode';
import {
  getFunnelTemplate,
  injectFopIntoHtml,
  type FunnelType,
  type SnippetParams,
  validarInstalacaoFop,
} from '@/lib/tracking/fop';

interface GenerateBody {
  design_id: string;
  /** Força um template de funil (A–E), ignorando o diagnóstico da IA. */
  tipo_funil?: string;
  /** Deixa a IA re-diagnosticar mesmo já havendo instalação. Ver a trava do funil. */
  rediagnosticar?: boolean;
}

// Vazio = usa o modelo default do Zen (gratuito). Só preencha TRACKING_MODEL se
// quiser forçar um modelo específico — inclusive um pago, aí por sua conta.
const TRACKING_MODEL = process.env.TRACKING_MODEL || undefined;

// Endpoint público do relay CAPI que o snippet da LP vai chamar. A LP roda
// noutro domínio, então precisa da URL ABSOLUTA do Synapse publicado.
/**
 * URL do relay CAPI que vai ASSADA dentro do HTML publicado.
 *
 * ⚠️ ARMADILHA QUE JÁ CUSTOU CARO (29/07/2026): o fallback era o origin da
 * requisição. Instalando o FOP pelo dashboard local, isso assava
 * `http://localhost:3000/api/track/capi` no HTML — e o navegador de cada
 * VISITANTE passava a POSTar para a própria máquina dele. O `fetch` do FOP tem
 * `.catch(function(){})`, então falhava em SILÊNCIO: eventos de navegador
 * chegavam, os de servidor não, e a deduplicação ficava impossível de validar
 * sem nenhum erro visível em lugar nenhum.
 *
 * Agora um endereço local NUNCA é assado. A ordem é:
 *   1. TRACKING_CAPI_ENDPOINT (explícito, sempre ganha)
 *   2. NEXT_PUBLIC_APP_URL, se for público
 *   3. Edge Function `track-capi` do Supabase (espelha esta mesma rota)
 *   4. erro claro — melhor não instalar do que instalar quebrado
 */
function resolveCapiEndpoint(request: Request): string {
  const ehLocal = (u: string) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:|\/|$)/i.test(u);

  const explicito = process.env.TRACKING_CAPI_ENDPOINT;
  if (explicito) return explicito;

  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const candidato = `${base.replace(/\/$/, '')}/api/track/capi`;
  if (!ehLocal(candidato)) return candidato;

  // Origin local: cair no relay público em vez de assar localhost.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/track-capi`;

  throw new Error(
    'Não há endpoint CAPI público. Instalar o FOP a partir de um endereço local ' +
      'assaria "' + candidato + '" no HTML, e o lado servidor morreria em silêncio ' +
      'para todo visitante. Defina TRACKING_CAPI_ENDPOINT no .env.local.'
  );
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
    const {
      design_id,
      tipo_funil: funilForcado,
      rediagnosticar,
    } = (await request.json()) as GenerateBody;
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
      // Zen (gratuito). O max_tokens: 500 daqui é elevado automaticamente pelo
      // piso do chatComZen — modelo de raciocínio devolve content VAZIO se o
      // orçamento acabar no "pensar" (ver src/lib/opencode.ts).
      const resp = await chatComZen({
        model: TRACKING_MODEL,
        max_tokens: 500,
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

    // TRAVA DO FUNIL: reinstalar não pode trocar a hierarquia sozinho.
    //
    // Medido em 29/07: três instalações seguidas da MESMA página deram E, A e E.
    // O diagnóstico é da IA e não é determinístico — e trocar de template muda
    // quais eventos existem, o que invalida um teste em andamento no Gerenciador.
    // Regra: o primeiro diagnóstico manda. Para trocar de propósito, mande
    // `tipo_funil` no body (ou `rediagnosticar: true` para deixar a IA decidir).
    const jaInstalado = await supabase
      .from('workflow_tracking')
      .select('tipo_funil')
      .eq('design_id', design_id)
      .maybeSingle();

    const valido = (t: unknown): t is FunnelType =>
      typeof t === 'string' && ['A', 'B', 'C', 'D', 'E'].includes(t.toUpperCase());

    let tipoFunil: FunnelType;
    let origemFunil: string;
    if (valido(funilForcado)) {
      tipoFunil = funilForcado.toUpperCase() as FunnelType;
      origemFunil = 'forçado no pedido';
    } else if (!rediagnosticar && valido(jaInstalado.data?.tipo_funil)) {
      tipoFunil = (jaInstalado.data!.tipo_funil as string).toUpperCase() as FunnelType;
      origemFunil = 'mantido da instalação anterior';
    } else {
      tipoFunil = (valido(diag.tipo_funil) ? diag.tipo_funil.toUpperCase() : 'B') as FunnelType;
      origemFunil = 'diagnóstico da IA';
    }
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

    // 5b. TRAVAMENTO — não grava instalação quebrada.
    //
    // Duas vezes em 29/07 esta rota devolveu sucesso tendo produzido uma página
    // com o lado servidor morto, e as duas falharam em silêncio (o fetch do CAPI
    // engole o erro). Recusar aqui custa um clique; descobrir depois de publicar
    // custa um ciclo inteiro de teste no Gerenciador de Eventos.
    const problemas = validarInstalacaoFop(htmlFinal, snippetParams);
    if (problemas.length) {
      return Response.json(
        {
          error: 'Instalação do FOP recusada: o HTML gerado não passou na verificação.',
          problemas,
          dica:
            'Nada foi gravado e o tracking anterior continua valendo. ' +
            'Se o problema for "capi-local", defina TRACKING_CAPI_ENDPOINT no .env.local.',
        },
        { status: 422 }
      );
    }

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
      origem_funil: origemFunil,
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
