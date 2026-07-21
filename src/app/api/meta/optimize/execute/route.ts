import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import {
  getCampaignAdSets,
  getAdSetAds,
  createCampaignV2,
  createAdSetV2,
  createAdV2,
  deleteEntity,
} from '@/lib/meta-api';

export const maxDuration = 120;

const AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID || '';
const OPT_GOALS_VALIDOS = [
  'LINK_CLICKS',
  'LANDING_PAGE_VIEWS',
  'OFFSITE_CONVERSIONS',
  'REACH',
  'IMPRESSIONS',
  'THRUPLAY',
  'AD_RECALL_LIFT',
  'POST_ENGAGEMENT',
];

// Posicionamentos aceitos pela Graph API (evita 400 se a IA inventar token).
const FB_POSITIONS_VALIDOS = new Set([
  'feed', 'facebook_reels', 'facebook_reels_overlay', 'story', 'right_hand_column',
  'marketplace', 'video_feeds', 'instream_video', 'search', 'profile_feed', 'groups_feed',
]);
const IG_POSITIONS_VALIDOS = new Set([
  'stream', 'story', 'reels', 'explore', 'explore_home', 'profile_feed', 'ig_search', 'profile_reels',
]);

/** Filtra uma lista de posicionamentos mantendo só os tokens válidos. */
function filtrarPos(lista: any, validos: Set<string>): string[] {
  if (!Array.isArray(lista)) return [];
  return lista.filter((p) => typeof p === 'string' && validos.has(p));
}

/**
 * Aplica as alavancas de media buying (da Análise Profunda) no targeting clonado:
 * segmentação (idade/gênero) e posicionamentos (ex.: concentrar em Reels).
 * Devolve avisos sobre o que foi aplicado, para o usuário ver o efeito real.
 */
function aplicarAlavancas(
  targeting: any,
  seg: any,
  pos: any,
  removerAN: boolean,
  somenteMobile: boolean,
  avisos: string[]
) {
  // --- Segmentação (público) ---
  if (seg) {
    const min = Number(seg.idade_min);
    const max = Number(seg.idade_max);
    if (Number.isFinite(min) && min >= 13) targeting.age_min = min;
    if (Number.isFinite(max) && max <= 65) targeting.age_max = max;
    if (Array.isArray(seg.generos) && seg.generos.length > 0) {
      // Meta: 1 = masculino, 2 = feminino. Omitir = todos.
      const g = seg.generos
        .map((x: string) => (x === 'male' ? 1 : x === 'female' ? 2 : null))
        .filter((x: number | null): x is number => x !== null);
      if (g.length > 0 && g.length < 2) targeting.genders = g; // 2 gêneros = todos, então omite
    }
  }

  // --- Posicionamentos ---
  const fb = pos ? filtrarPos(pos.facebook_positions, FB_POSITIONS_VALIDOS) : [];
  const ig = pos ? filtrarPos(pos.instagram_positions, IG_POSITIONS_VALIDOS) : [];
  const platforms: string[] = Array.isArray(pos?.publisher_platforms)
    ? pos.publisher_platforms.filter((p: any) => typeof p === 'string')
    : [];

  if (fb.length) targeting.facebook_positions = fb;
  if (ig.length) targeting.instagram_positions = ig;

  // Reconcilia publisher_platforms com os posicionamentos escolhidos (senão a Meta rejeita).
  const plataformasNecessarias = new Set<string>(platforms);
  if (fb.length) plataformasNecessarias.add('facebook');
  if (ig.length) plataformasNecessarias.add('instagram');
  if (removerAN) plataformasNecessarias.delete('audience_network');
  if (plataformasNecessarias.size > 0) {
    targeting.publisher_platforms = Array.from(plataformasNecessarias);
  } else if (removerAN) {
    targeting.publisher_platforms = ['facebook', 'instagram'];
  }

  if (somenteMobile) targeting.device_platforms = ['mobile'];

  if (fb.length || ig.length) {
    avisos.push(`Posicionamentos concentrados em: ${[...fb, ...ig].join(', ')}`);
  }
  if (targeting.age_min || targeting.age_max || targeting.genders) {
    const gTxt = targeting.genders ? (targeting.genders[0] === 1 ? 'homens' : 'mulheres') : 'todos';
    avisos.push(`Público: ${targeting.age_min || '?'}–${targeting.age_max || '?'} · ${gTxt}`);
  }
}

// Executa um plano APROVADO: duplica a campanha-fonte criando tudo em PAUSED.
// v1: mantém o objetivo da fonte (mudança de objetivo é manual); aplica budget,
// optimization_goal, alavancas de público/posicionamento e pula os conjuntos
// perdedores (conjuntos_pausar) — tudo derivado da Análise Profunda no plano.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const planId: string | undefined = body?.plan_id;
    if (!planId) {
      return NextResponse.json({ success: false, error: 'plan_id é obrigatório' }, { status: 400 });
    }

    // 1. Plano precisa estar APROVADO (trava do orquestrador)
    const { data: plan } = await supabaseServer
      .from('meta_optimization_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle();
    if (!plan) {
      return NextResponse.json({ success: false, error: 'Plano não encontrado' }, { status: 404 });
    }
    if (plan.status !== 'aprovado') {
      return NextResponse.json(
        { success: false, error: `Plano não está aprovado (status: ${plan.status})` },
        { status: 409 }
      );
    }

    // 2. Campanha-fonte
    const { data: source } = await supabaseServer
      .from('meta_campaigns')
      .select('meta_campaign_id, nome, objetivo')
      .eq('meta_campaign_id', plan.meta_campaign_id)
      .maybeSingle();
    if (!source) {
      return NextResponse.json({ success: false, error: 'Campanha-fonte não encontrada' }, { status: 404 });
    }

    const planoJson = plan.plano || {};
    const exec = planoJson.execucao || {};
    const novaCfg = planoJson.nova_campanha || {};

    const nome: string = novaCfg.nome_sugerido || `${source.nome} — OTIM`;
    const objetivo: string = source.objetivo || 'OUTCOME_TRAFFIC'; // v1: mantém o objetivo da fonte

    const budgetReais: number =
      Number(exec.daily_budget_reais) || Number(novaCfg.daily_budget_reais) || 0;
    const budgetCentsBase = budgetReais > 0 ? Math.round(budgetReais * 100) : 0;
    const optGoalOverride: string | null =
      typeof exec.optimization_goal === 'string' && OPT_GOALS_VALIDOS.includes(exec.optimization_goal)
        ? exec.optimization_goal
        : null;
    const removerAN = exec.remover_audience_network === true;
    const somenteMobile = exec.somente_mobile === true;

    // Alavancas de media buying vindas da Análise Profunda.
    const seg = exec.segmentacao || null;
    const pos = exec.posicionamentos || null;
    const conjuntosPausar: any[] = Array.isArray(exec.conjuntos_pausar) ? exec.conjuntos_pausar : [];
    const idsPausar = new Set<string>(
      conjuntosPausar.map((c) => String(c?.id || '')).filter(Boolean)
    );
    const nomesPausar = new Set<string>(
      conjuntosPausar.map((c) => String(c?.nome || '').trim().toLowerCase()).filter(Boolean)
    );

    // 3. Estrutura da fonte
    const adsets = await getCampaignAdSets(source.meta_campaign_id);
    if (!adsets.length) {
      return NextResponse.json(
        { success: false, error: 'A campanha-fonte não tem conjuntos de anúncios para duplicar' },
        { status: 400 }
      );
    }

    // Salvaguarda: se o plano marcar TODOS os conjuntos p/ pausar, ignora (senão a campanha fica vazia).
    const sobrariam = adsets.filter(
      (a) => !idsPausar.has(a.id) && !nomesPausar.has((a.name || '').trim().toLowerCase())
    );
    const aplicarPausas = sobrariam.length > 0;

    // 4. Cria a nova campanha (PAUSED)
    const novaCampanhaId = await createCampaignV2(nome, objetivo);

    const criados: { adsets: any[]; ads: any[] } = { adsets: [], ads: [] };
    const avisos: string[] = [];
    const pulados: string[] = [];
    if (!aplicarPausas && conjuntosPausar.length > 0) {
      avisos.push('O plano marcaria todos os conjuntos p/ pausar — pausas ignoradas p/ não esvaziar a campanha.');
    }

    // 5. Duplica só os conjuntos VENCEDORES (pula os perdedores da Análise Profunda) + seus anúncios
    for (const a of adsets) {
      const ehPerdedor =
        aplicarPausas &&
        (idsPausar.has(a.id) || nomesPausar.has((a.name || '').trim().toLowerCase()));
      if (ehPerdedor) {
        pulados.push(a.name || a.id);
        continue;
      }
      try {
        // Orçamento: ajuste do plano, ou o da fonte, com piso de segurança
        const fonteDaily = a.daily_budget ? parseInt(a.daily_budget) : 0;
        let budgetCents = budgetCentsBase || fonteDaily || 600;
        budgetCents = Math.max(budgetCents, 600); // piso R$6/dia

        // Targeting: clona o da fonte e aplica as alavancas da Análise Profunda
        const targeting = a.targeting ? JSON.parse(JSON.stringify(a.targeting)) : { geo_locations: { countries: ['BR'] } };
        aplicarAlavancas(targeting, seg, pos, removerAN, somenteMobile, avisos);

        const novoAdsetId = await createAdSetV2({
          campaignId: novaCampanhaId,
          name: `${a.name} — OTIM`,
          dailyBudgetCents: budgetCents,
          billingEvent: a.billing_event,
          optimizationGoal: optGoalOverride || a.optimization_goal,
          targeting,
          promotedObject: a.promoted_object,
          destinationType: a.destination_type,
        });
        criados.adsets.push({ origem: a.id, novo: novoAdsetId, budget_cents: budgetCents });

        // Anúncios: reaproveita o criativo existente da fonte
        const ads = await getAdSetAds(a.id);
        for (const ad of ads) {
          if (!ad.creative?.id) {
            avisos.push(`Anúncio ${ad.id} sem creative.id — pulado`);
            continue;
          }
          try {
            const novoAdId = await createAdV2(novoAdsetId, `${ad.name} — OTIM`, ad.creative.id);
            criados.ads.push({ origem: ad.id, novo: novoAdId });
          } catch (e: any) {
            avisos.push(`Falha ao criar anúncio (origem ${ad.id}): ${e?.message || e}`);
          }
        }
      } catch (e: any) {
        avisos.push(`Falha ao duplicar conjunto ${a.name} (${a.id}): ${e?.message || e}`);
      }
    }

    // Se nenhum conjunto foi criado, a campanha ficou vazia → apaga e não marca executado.
    if (criados.adsets.length === 0) {
      try {
        await deleteEntity(novaCampanhaId);
      } catch (e: any) {
        avisos.push(`Não consegui apagar a campanha vazia ${novaCampanhaId}: ${e?.message || e}`);
      }
      return NextResponse.json(
        {
          success: false,
          error: 'Nenhum conjunto pôde ser duplicado — campanha vazia removida.',
          avisos,
        },
        { status: 502 }
      );
    }

    const contaNum = AD_ACCOUNT_ID.replace('act_', '');
    const managerUrl = `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${contaNum}&selected_campaign_ids=${novaCampanhaId}`;

    if (pulados.length > 0) {
      avisos.unshift(`Conjuntos perdedores NÃO duplicados (${pulados.length}): ${pulados.join(', ')}`);
    }

    const resultado = {
      nova_campanha_id: novaCampanhaId,
      nome,
      objetivo,
      status: 'PAUSED',
      adsets_criados: criados.adsets.length,
      ads_criados: criados.ads.length,
      conjuntos_pulados: pulados.length,
      detalhes: criados,
      avisos: Array.from(new Set(avisos)), // dedup (as alavancas repetem por conjunto)
      manager_url: managerUrl,
    };

    // 6. Marca o plano como executado
    await supabaseServer
      .from('meta_optimization_plans')
      .update({ status: 'executado', resultado, executado_em: new Date().toISOString() })
      .eq('id', planId);

    return NextResponse.json({ success: true, resultado });
  } catch (err: any) {
    console.error('[api/meta/optimize/execute] erro:', err);
    // registra o erro no plano (sem travar)
    try {
      const body = await request.clone().json().catch(() => ({}));
      if (body?.plan_id) {
        await supabaseServer
          .from('meta_optimization_plans')
          .update({ status: 'erro', resultado: { erro: err?.message || 'falha' } })
          .eq('id', body.plan_id);
      }
    } catch {}
    return NextResponse.json({ success: false, error: err?.message || 'Falha na execução' }, { status: 500 });
  }
}
