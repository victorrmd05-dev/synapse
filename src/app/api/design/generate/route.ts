// src/app/api/design/generate/route.ts
//
// MOTOR DO DESIGNER-WEBMASTER — agora rodando no CLAUDE (Anthropic).
//
// Por que Claude e não gpt-4o-mini: o mini é fraco em frontend e entregava
// páginas feias/sem estrutura por melhores que fossem as referências. Claude é
// disparado o melhor em gerar HTML/CSS bonito. As referências (DESIGN.md de
// marcas de luxo) e as imagens reais do concorrente só "pagam" com um bom
// desenhista renderizando — e esse é o Claude.
//
// Pipeline:
//   1. Copy aprovada (conteúdo) + produto minerado (nicho + imagens reais)
//   2. Marca de luxo injetada por nicho (src/lib/design/brandReferences)
//   3. Scraping do concorrente via Firecrawl (estrutura + imagens) — opcional
//   4. Claude gera o HTML completo
//   5. Salva em workflow_design.codigo_html E em disco (lps/) para edição
//      manual pelo terminal como rede de segurança.
//
// Disparo MANUAL, um de cada vez, pelo botão "play" em /design.
//
// Variáveis de ambiente: ANTHROPIC_API_KEY (e opcional ANTHROPIC_DESIGN_MODEL),
// FIRECRAWL_API_KEY (opcional).

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { supabaseServer as supabase } from '@/lib/supabase-server';
import { getAgentConfig, buildSystemPrompt } from '@/lib/agents/buildSystemPrompt';
import { buildBrandReferenceBlock } from '@/lib/design/brandReferences';
import { scrapeConcorrente } from '@/lib/firecrawl';
import { gerarComClaude, ANTHROPIC_DESIGN_MODEL } from '@/lib/anthropic';
import { chatComRetry } from '@/lib/openai';
import { chatComZen, OPENCODE_MODEL } from '@/lib/opencode';
import { listarImagensParaPagina, substituirPlaceholders } from '@/lib/design/imagensLp';

interface GenerateBody {
  design_id: string;
}

// Provider do desenho. Default 'zen' (OpenCode Zen, GRATUITO) — o botão continua
// funcionando sem gerar fatura. Os outros dois são PAGOS e só entram se você
// pedir por nome no .env.local: 'anthropic' (melhor em frontend) ou 'openai'.
//
// ⚠️ O default era 'openai' com gpt-4o, que é modelo caro — o comentário antigo
// dizia "sem custo novo" porque você já tinha crédito lá, mas custo havia.
// A LP de verdade é feita no Claude Code (skill landing-page-vendas), fora do
// app; esta rota serve para rascunho rápido dentro do painel.
const DESIGN_PROVIDER = (process.env.DESIGN_PROVIDER || 'zen').toLowerCase();
const OPENAI_DESIGN_MODEL = process.env.OPENAI_DESIGN_MODEL || 'gpt-4o';
// Claude 3.5 tem cap 8192; gpt-4o aceita até 16384. Cada um no seu teto seguro.
const MAX_TOKENS_ANTHROPIC = Number(process.env.ANTHROPIC_DESIGN_MAX_TOKENS) || 8000;
const MAX_TOKENS_OPENAI = Number(process.env.OPENAI_DESIGN_MAX_TOKENS) || 16000;

export async function POST(request: Request) {
  try {
    const { design_id } = (await request.json()) as GenerateBody;
    if (!design_id) {
      return Response.json({ error: 'design_id é obrigatório' }, { status: 400 });
    }

    // 1. Registro de design (ordem de serviço criada na aprovação do Revisor)
    const { data: design, error: designError } = await supabase
      .from('workflow_design')
      .select('*')
      .eq('id', design_id)
      .maybeSingle();

    if (designError) {
      return Response.json(
        { error: 'Erro ao buscar registro de design', detalhe: designError.message },
        { status: 500 }
      );
    }
    if (!design) {
      return Response.json({ error: 'Registro de design não encontrado' }, { status: 404 });
    }
    if (!design.campanha_id) {
      return Response.json(
        { error: 'Registro de design sem campanha vinculada (campanha_id nulo)' },
        { status: 400 }
      );
    }

    // 2. Campanha + produto minerado (nicho + imagens reais do concorrente)
    const { data: campanha } = await supabase
      .from('campanhas_producao')
      .select('nome_projeto, ad_minerado_id')
      .eq('id', design.campanha_id)
      .maybeSingle();

    let produto:
      | {
          page_name?: string;
          ad_title?: string;
          ad_copy?: string;
          cta_text?: string;
          link_url?: string;
          image_url?: string;
          image_resized_url?: string;
          extra_image_urls?: string[];
          page_profile_pic_url?: string;
        }
      | null = null;

    if (campanha?.ad_minerado_id) {
      const { data } = await supabase
        .from('ads_minerados')
        .select(
          'page_name, ad_title, ad_copy, cta_text, link_url, image_url, image_resized_url, extra_image_urls, page_profile_pic_url'
        )
        .eq('id', campanha.ad_minerado_id)
        .maybeSingle();
      produto = data;
    }

    // 3. Copy APROVADA pelo Revisor = fonte do conteúdo da página.
    //    Sinal de aprovação = revisor_ok + data_aprovacao (mais confiável que
    //    status, que pode ser sobrescrito por uma revisão da IA que termina tarde).
    const { data: copy } = await supabase
      .from('workflow_copywriting')
      .select('conteudo_texto, meta_ads_copy')
      .eq('campanha_id', design.campanha_id)
      .eq('revisor_ok', true)
      .not('data_aprovacao', 'is', null)
      .order('data_aprovacao', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!copy || !copy.conteudo_texto) {
      return Response.json(
        {
          error:
            'Nenhuma copy aprovada encontrada para esta campanha. O Revisor precisa aprovar a copy antes de gerar a página.',
        },
        { status: 400 }
      );
    }

    // 3b. Imagens PRÓPRIAS da LP: a copy marca os pontos com
    //     `[IMAGEM N · hero.png — descrição]` e a pasta `lp/<campanha_id>/` tem
    //     os arquivos com esses nomes. Trocamos o placeholder pela tag <img>
    //     real ANTES de o texto chegar no modelo — assim a URL, o alt e as
    //     dimensões saem determinísticos em vez de inventados pela IA.
    const imagensLp = await listarImagensParaPagina(design.campanha_id);
    const sub = substituirPlaceholders(copy.conteudo_texto, imagensLp);
    const conteudoCopy = sub.texto;

    // 4. Imagens reais já mineradas do anúncio do concorrente
    const imagensMineradas: string[] = [
      produto?.image_url,
      produto?.image_resized_url,
      ...(produto?.extra_image_urls ?? []),
    ].filter((u): u is string => !!u && /^https?:\/\//i.test(u));

    // 5. Scraping do concorrente (estrutura + mais imagens) — best-effort
    const scrape = await scrapeConcorrente(produto?.link_url);
    const todasImagens = Array.from(
      new Set([...imagensMineradas, ...(scrape?.imagens ?? [])])
    ).slice(0, 14);

    // 6. Marca de luxo injetada por nicho
    const termoNicho =
      produto?.ad_title || produto?.page_name || campanha?.nome_projeto || '';
    const brandRef = await buildBrandReferenceBlock(termoNicho);

    // 7. System prompt do agente Designer (sincronizado do GitHub)
    const config = await getAgentConfig('designer-webmaster');
    if (!config) {
      return Response.json(
        {
          error:
            'Agente "designer-webmaster" não encontrado ou inativo. Rode a sincronização em /api/agents/sync primeiro.',
        },
        { status: 400 }
      );
    }
    const systemPrompt = buildSystemPrompt(config);

    // 8. Prompt do usuário
    const blocoImagens = todasImagens.length
      ? `=== IMAGENS REAIS DISPONÍVEIS (use estas URLs em <img src>, NÃO invente links) ===
${todasImagens.map((u, i) => `${i + 1}. ${u}`).join('\n')}
Use as imagens com mais força no hero e nas seções de produto/prova. Se faltar
imagem para alguma seção, use um bloco de cor/gradiente da marca em vez de um link quebrado.`
      : `=== SEM IMAGENS DISPONÍVEIS ===
Não há imagens reais. NÃO use <img> com links inventados — construa o visual com
tipografia forte, blocos de cor e gradientes fiéis à marca injetada.`;

    const blocoConcorrente = scrape
      ? `=== ESTRUTURA DA LANDING PAGE DO CONCORRENTE (referência de seções/fluxo) ===
${scrape.estrutura}
Inspire-se na SEQUÊNCIA de seções e na lógica de oferta, mas reescreva tudo com a
copy aprovada e a estética da marca injetada — não copie o texto do concorrente.`
      : '';

    // As <img> da própria LP já vêm prontas dentro da copy. O modelo tende a
    // "melhorar" o que recebe — daí a instrução explícita de não tocar.
    const blocoImagensLp = sub.usadas.length
      ? `=== IMAGENS PRÓPRIAS DA LANDING PAGE (JÁ INSERIDAS NA COPY) ===
A copy abaixo já contém ${sub.usadas.length} tag(s) <img> completas, com src, alt,
width/height e loading corretos. COPIE CADA UMA EXATAMENTE COMO ESTÁ, no mesmo
ponto do texto. NÃO altere o src, NÃO troque por outra imagem, NÃO remova os
atributos width/height (eles seguram o layout e evitam CLS).
Envolva cada <img> no seu container de layout, mas preserve a tag intacta.
A primeira imagem é o LCP da página — no <head>, adicione:
<link rel="preload" as="image" href="${imagensLp.find((i) => i.radical === 'hero')?.url ?? sub.usadas[0]}">`
      : '';

    const userPrompt = `${brandRef.block}

${blocoImagensLp ? blocoImagensLp + '\n\n' : ''}${blocoImagens}

${blocoConcorrente ? blocoConcorrente + '\n\n' : ''}=== COPY APROVADA (fonte do conteúdo da página de vendas) ===
${conteudoCopy}

${copy.meta_ads_copy ? `=== COPY DO META ADS (apoio para títulos/CTAs) ===\n${copy.meta_ads_copy}\n\n` : ''}=== TAREFA ===
Gere a landing page de vendas COMPLETA e DE ALTÍSSIMA CONVERSÃO para este produto,
transformando a copy aprovada em uma página linda e bem estruturada, ancorada
EXATAMENTE na estética da marca injetada (cores, tipografia, componentes, layout,
do's/don'ts).

Estrutura mínima de seções (adapte à oferta): hero com headline + sub + CTA e
imagem forte; blocos de benefícios; prova social/depoimentos; demonstração do
produto; oferta com ancoragem de preço; garantia; FAQ; CTA final repetido.

Requisitos técnicos OBRIGATÓRIOS:
- Um único arquivo HTML completo e autossuficiente (comece em <!DOCTYPE html>).
- Tailwind via CDN: <script src="https://cdn.tailwindcss.com"></script>.
- Importe as fontes da marca via <link> do Google Fonts quando aplicável.
- Mobile-first, 100% responsivo, carregamento rápido.
- Ícones: SVG inline (NUNCA emojis).
- Use as IMAGENS REAIS listadas acima nos <img>. Nada de placeholder/lorem ipsum.
- As <img> que já vêm dentro da copy são as imagens oficiais da página: mantenha
  cada uma intacta e no seu lugar. Se sobrar algum marcador em colchetes do tipo
  [IMAGEM N · arquivo], significa que o arquivo não existe — NÃO invente uma URL
  nem deixe o colchete aparecer na página: resolva a seção sem imagem.
- CTAs em destaque na cor de ação da marca, repetidos ao longo da página.
- Microinterações de hover suaves e estados de foco acessíveis.

Responda APENAS com o código HTML puro. Sem cercas de markdown (\`\`\`), sem
comentários fora do HTML, sem explicações antes ou depois.`;

    // 9. Gerar o HTML — Claude (melhor) ou gpt-4o, conforme DESIGN_PROVIDER
    let html = '';
    let modeloUsado = '';
    try {
      const mensagens = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userPrompt },
      ];

      if (DESIGN_PROVIDER === 'anthropic') {
        modeloUsado = ANTHROPIC_DESIGN_MODEL;
        html = (
          await gerarComClaude({ max_tokens: MAX_TOKENS_ANTHROPIC, system: systemPrompt, user: userPrompt })
        ).trim();
      } else if (DESIGN_PROVIDER === 'openai') {
        modeloUsado = OPENAI_DESIGN_MODEL;
        const response = await chatComRetry({
          model: OPENAI_DESIGN_MODEL,
          max_tokens: MAX_TOKENS_OPENAI,
          messages: mensagens,
        });
        html = (response.choices[0]?.message?.content ?? '').trim();
      } else {
        modeloUsado = OPENCODE_MODEL;
        const response = await chatComZen({ max_tokens: MAX_TOKENS_OPENAI, messages: mensagens });
        html = (response.choices[0]?.message?.content ?? '').trim();
      }
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const msg = err instanceof Error ? err.message : 'erro desconhecido';
      const dicaPorProvider: Record<string, string> = {
        anthropic:
          'Sem crédito na Anthropic? Rode DESIGN_PROVIDER=zen (gratuito) ou faça a LP no Claude Code com a skill landing-page-vendas.',
        openai:
          'Confira OPENAI_API_KEY/saldo (provider PAGO), ou volte para DESIGN_PROVIDER=zen (gratuito).',
        zen: 'Confira OPENCODE_API_KEY. Para uma LP de verdade, o caminho é o Claude Code com a skill landing-page-vendas.',
      };
      return Response.json(
        {
          error: `Falha na chamada ao modelo de design "${modeloUsado}" (provider ${DESIGN_PROVIDER}, status ${status ?? '?'}).`,
          detalhe: msg,
          dica: dicaPorProvider[DESIGN_PROVIDER] ?? dicaPorProvider.zen,
        },
        { status: 502 }
      );
    }

    // Limpeza defensiva: tira cercas de markdown e texto antes do doc.
    const fence = html.match(/```(?:html)?\s*([\s\S]*?)```/i);
    if (fence) html = fence[1].trim();
    const docIdx = html.search(/<!doctype html|<html/i);
    if (docIdx > 0) html = html.slice(docIdx);

    if (!html || !/<html|<!doctype/i.test(html)) {
      return Response.json(
        { error: 'A IA não retornou um HTML válido. Tente novamente.', amostra: html.slice(0, 200) },
        { status: 502 }
      );
    }

    // 10. Salvar no banco (a fila atualiza via Realtime)
    const { data: registro, error: updateError } = await supabase
      .from('workflow_design')
      .update({ codigo_html: html })
      .eq('id', design_id)
      .select()
      .single();

    if (updateError) {
      return Response.json(
        { error: 'Falha ao salvar o HTML gerado', detalhe: updateError.message },
        { status: 500 }
      );
    }

    // 11. Salvar também em disco (rede de segurança p/ edição manual no terminal)
    const slugNome = (campanha?.nome_projeto || design_id)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    const slugLp = `${slugNome || 'lp'}-${design_id.slice(0, 8)}`;
    let arquivo: string | null = null;
    try {
      const dir = path.join(process.cwd(), 'lps');
      await fs.mkdir(dir, { recursive: true });
      const nomeArquivo = `${slugLp}.html`;
      await fs.writeFile(path.join(dir, nomeArquivo), html, 'utf-8');
      arquivo = `lps/${nomeArquivo}`;
    } catch (err) {
      console.warn('[design/generate] não salvou em disco:', err instanceof Error ? err.message : err);
    }

    // 12. Upsert na Biblioteca de Páginas (/paginas) — toda LP gerada vira
    //     modelo consultável; regerar atualiza o HTML do mesmo registro.
    try {
      await supabase.from('lp_biblioteca').upsert(
        {
          nome: campanha?.nome_projeto || `LP ${design_id.slice(0, 8)}`,
          slug: slugLp,
          origem: 'pipeline',
          design_id,
          codigo_html: html,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: 'design_id' }
      );
    } catch (err) {
      console.warn('[design/generate] não salvou na biblioteca:', err instanceof Error ? err.message : err);
    }

    return Response.json({
      sucesso: true,
      marca: brandRef.nome,
      marca_slug: brandRef.slug,
      provider: DESIGN_PROVIDER,
      modelo: modeloUsado,
      imagens_usadas: todasImagens.length,
      imagens_lp: sub.usadas,
      // Nome na copy que não achou arquivo na pasta — quase sempre erro de
      // digitação no renomear. Sai na resposta para não falhar em silêncio.
      imagens_lp_faltando: sub.faltando,
      concorrente_scrapeado: !!scrape,
      arquivo,
      registro,
    });
  } catch (err) {
    console.error('[api/design/generate] erro:', err);
    const msg = err instanceof Error ? err.message : 'erro desconhecido';
    return Response.json({ error: 'Falha ao gerar a página', detalhe: msg }, { status: 500 });
  }
}
