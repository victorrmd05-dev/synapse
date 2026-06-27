// src/app/api/deploy/route.ts
//
// Publica a landing page de um workflow_design no Cloudflare Pages (via Wrangler)
// e registra a URL pública. Disparado pelo botão "Aprovar e Publicar" em /design.
//
// Fluxo:
//   1. Busca workflow_design (precisa ter codigo_html gerado pelo Designer)
//   2. Deriva o slug do projeto a partir do nome da campanha
//   3. wrangler pages create+deploy (src/lib/cloudflare)
//   4. Salva url_recurso + data_aprovacao -> a UI passa a exibir "No Ar"
//
// Requer: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID no ambiente.

import { supabaseServer as supabase } from '@/lib/supabase-server';
import { deployHtmlToPages } from '@/lib/cloudflare';

// O deploy roda um processo Wrangler e pode levar dezenas de segundos.
export const maxDuration = 120;

interface DeployBody {
  design_id: string;
}

export async function POST(request: Request) {
  try {
    const { design_id } = (await request.json()) as DeployBody;
    if (!design_id) {
      return Response.json({ error: 'design_id é obrigatório' }, { status: 400 });
    }

    // 1. Registro de design + HTML gerado
    const { data: design, error: designError } = await supabase
      .from('workflow_design')
      .select('id, campanha_id, codigo_html, url_recurso')
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
    if (!design.codigo_html || !/<html|<!doctype/i.test(design.codigo_html)) {
      return Response.json(
        { error: 'Esta página ainda não tem HTML gerado. Gere o design antes de publicar.' },
        { status: 400 }
      );
    }

    // 2. Nome da campanha -> slug do projeto Pages
    let nomeProjeto = design_id;
    if (design.campanha_id) {
      const { data: campanha } = await supabase
        .from('campanhas_producao')
        .select('nome_projeto')
        .eq('id', design.campanha_id)
        .maybeSingle();
      if (campanha?.nome_projeto) nomeProjeto = campanha.nome_projeto;
    }
    // Sufixo curto do id garante unicidade do projeto entre campanhas homônimas.
    const slugBase = `${nomeProjeto}-${design_id.slice(0, 8)}`;

    // 3. Deploy via Wrangler
    let resultado;
    try {
      resultado = await deployHtmlToPages({ slug: slugBase, html: design.codigo_html });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'erro desconhecido';
      console.error('[api/deploy] falha no Wrangler:', msg);
      return Response.json(
        {
          error: 'Falha ao publicar no Cloudflare Pages.',
          detalhe: msg,
          dica: 'Confira CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID e as permissões de Pages do token.',
        },
        { status: 502 }
      );
    }

    // 4. Persistir URL pública + marcar como aprovada/publicada
    const { data: registro, error: updateError } = await supabase
      .from('workflow_design')
      .update({ url_recurso: resultado.url, data_aprovacao: new Date().toISOString() })
      .eq('id', design_id)
      .select()
      .single();

    if (updateError) {
      // A página subiu, mas não conseguimos gravar a URL — devolvemos mesmo assim.
      return Response.json(
        {
          sucesso: true,
          aviso: 'Página publicada, mas falhou ao salvar a URL no banco.',
          detalhe: updateError.message,
          url: resultado.url,
        },
        { status: 200 }
      );
    }

    return Response.json({
      sucesso: true,
      url: resultado.url,
      deployment_url: resultado.deploymentUrl,
      slug: resultado.slug,
      registro,
    });
  } catch (err) {
    console.error('[api/deploy] erro:', err);
    const msg = err instanceof Error ? err.message : 'erro desconhecido';
    return Response.json({ error: 'Falha ao publicar a página', detalhe: msg }, { status: 500 });
  }
}
