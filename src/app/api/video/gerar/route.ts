// src/app/api/video/gerar/route.ts
//
// 💸 A UNICA ROTA DO PROJETO QUE GASTA CREDITO PRE-PAGO.
//
// A ORDEM DOS PASSOS E DELIBERADA: submete PRIMEIRO, grava DEPOIS.
// Se gravasse antes, a linha existiria sem `wavespeed_task_id` — e a `check`
// `gerar_exige_task_id` recusaria o insert. Isso nao e acidente: e a trava
// funcionando. Uma linha 'gerar' so pode nascer de uma submissao que ja aconteceu.
//
// O caso ruim conhecido: submissao da certo e o insert falha. Ai gastamos sem
// registrar. Por isso o task_id vai para o LOG antes do insert — e a unica forma
// de rastrear o gasto orfao na fatura.
//
// Toda validacao que PODE rejeitar a requisicao (prompt, modelo, duracao,
// duplicata) roda ANTES de `submeterVideo`. Depois dessa chamada, ja cobrou —
// nao ha mais "erro de entrada", so "erro de gravacao" (gasto orfao).

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { submeterVideo } from '@/lib/wavespeed/client';
import { estimarCustoUsd } from '@/lib/wavespeed/precos';

export const dynamic = 'force-dynamic';

const DURACAO_PADRAO_S = 5;
const DURACAO_MIN_S = 1;
const DURACAO_MAX_S = 10;

// Janela de deduplicacao: duplo-clique ou retry de rede reenviando o mesmo
// POST em sequencia. Nao e um sistema de idempotencia (sem chave de idempotencia
// do cliente) — so um freio simples e proporcional ao risco (cada duplicata e
// dinheiro real, sem reembolso).
const JANELA_DEDUPE_MS = 60_000;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { campanha_id, prompt, image_url, duracao_s, modelo: modeloBody } = body ?? {};

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10) {
      return NextResponse.json(
        { error: 'prompt e obrigatorio e precisa ter ao menos 10 caracteres' },
        { status: 400 },
      );
    }

    // 🚨 CORRECAO DE DESENHO (achados da Task 1, 31/07/2026): o MODO esta no
    // CAMINHO do modelo, nao num campo opcional no corpo. `image_url` NAO pode
    // simplesmente entrar no body de um modelo text-to-video: o endpoint
    // `openai/sora-2/text-to-video` (confirmado na chamada real) ignora ou
    // rejeita a imagem tarde, depois de já ter cobrado os ~135s de
    // processamento. image-to-video é outro caminho, com WAVESPEED_MODEL_I2V.
    const temImagem = typeof image_url === 'string' && image_url.trim().length > 0;

    // Resolve o modelo: explicito no body tem precedencia; senao, cai na env
    // certa pro modo (t2v ou i2v).
    let modelo: string | undefined = modeloBody;
    if (!modelo) {
      modelo = temImagem ? process.env.WAVESPEED_MODEL_I2V : process.env.WAVESPEED_MODEL;
    }

    if (!modelo) {
      return NextResponse.json(
        {
          error: temImagem
            ? 'image-to-video ainda nao foi configurado (WAVESPEED_MODEL_I2V ausente no .env.local).'
            : 'WAVESPEED_MODEL nao configurado no .env.local',
        },
        { status: 400 },
      );
    }

    // 🚨 FIX (round 1): a guarda acima so protegia o caminho "sem modelo no
    // body" — `if (!modelo) { ...resolve i2v... }` nunca rodava quando o
    // chamador mandava `modelo` explicito, entao `{ image_url, modelo:
    // "openai/sora-2/text-to-video" }` passava reto e cobrava por uma geracao
    // que ignora a imagem. A checagem tem que valer para QUALQUER origem do
    // `modelo` (explicito ou resolvido por env), entao roda aqui, depois que
    // `modelo` ja esta definido, comparando o valor final contra o unico
    // caminho de imagem que o projeto reconhece hoje.
    //
    // Isso e restritivo de proposito: nao ha como saber, so pelo texto de um
    // `modelo` explicito arbitrario, se aquele caminho aceita imagem ou nao.
    // Custo de errar pra mais restritivo = uma mensagem de erro. Custo de
    // errar pra mais permissivo = ~135s de geracao paga jogada fora.
    if (temImagem && modelo !== process.env.WAVESPEED_MODEL_I2V) {
      return NextResponse.json(
        {
          error:
            'image_url exige o modelo de image-to-video (WAVESPEED_MODEL_I2V). ' +
            `O modelo resolvido ("${modelo}") nao bate com essa env — recusado antes de submeter ` +
            'para nao mandar a imagem para um endpoint de text-to-video.',
        },
        { status: 400 },
      );
    }

    // 🚨 FIX (round 1): `Number(duracao_s) || DURACAO_PADRAO_S` so filtrava
    // falsy — `-5` e truthy e sobrevivia (`Math.min(-5, 10) = -5`, cobrado
    // assim mesmo), e fracionario (`7.5`) so quebrava DEPOIS de cobrar, ao
    // tentar entrar na coluna `int` `video_jobs.duracao_s` (insert falha e cai
    // no ramo de gasto orfao — que deveria ser so pra falha imprevisivel, nao
    // pra entrada malformada que dava pra barrar antes). Por isso: valida e
    // recusa (400) ANTES de chamar `submeterVideo`, sem ajustar em silencio —
    // quem pediu 30s precisa saber que foi recusado, nao descobrir na fatura
    // que recebeu 10.
    let duracao: number;
    if (duracao_s === undefined || duracao_s === null) {
      duracao = DURACAO_PADRAO_S;
    } else {
      const n = Number(duracao_s);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < DURACAO_MIN_S || n > DURACAO_MAX_S) {
        return NextResponse.json(
          {
            error: `duracao_s precisa ser um inteiro entre ${DURACAO_MIN_S} e ${DURACAO_MAX_S} segundos (recebido: ${JSON.stringify(duracao_s)})`,
          },
          { status: 400 },
        );
      }
      duracao = n;
    }

    const promptTrim = prompt.trim();
    const custo = estimarCustoUsd(modelo, duracao);

    // 🚨 FIX (round 1): freio contra duplo-envio (duplo-clique, retry de rede,
    // timeout do cliente que reenvia). Recusa VISIVEL (409) em vez de
    // deduplicar calado: quem clicou duas vezes de proposito precisa saber que
    // a segunda nao passou, nao ver "sucesso" duas vezes sem explicacao. Nao e
    // teto de gasto (o dono recusou isso explicitamente) — so evita cobrar
    // duas vezes pela MESMA submissao acidental.
    const desde = new Date(Date.now() - JANELA_DEDUPE_MS).toISOString();
    const { data: recentes, error: dedupeError } = await supabaseServer
      .from('video_jobs')
      .select('id, criado_em')
      .eq('tipo', 'gerar')
      .eq('status', 'processando')
      .eq('prompt', promptTrim)
      .eq('modelo', modelo)
      .gte('criado_em', desde)
      .limit(1);

    if (dedupeError) {
      // 🚨 FIX (round 2): fail-CLOSED, nao fail-open. A versao anterior deste
      // comentario argumentava o oposto ("loga e segue") tratando a falha do
      // proprio check como um problema independente do que ele detecta — mas
      // nao e independente. Instabilidade transitoria no Supabase e retry
      // automatico do cliente por timeout de rede tendem a acontecer NA MESMA
      // janela: e justamente quando a rede esta ruim que o navegador reenvia
      // o POST. Ou seja, o cenario em que este SELECT falha e o cenario em
      // que o reenvio acidental e MAIS provavel — fail-open desarmava a
      // protecao exatamente quando ela mais importava.
      //
      // A assimetria de custo reforça a escolha: recusar aqui custa "tente de
      // novo em alguns segundos"; deixar passar custa credito pre-pago sem
      // reembolso. Projeto de operador unico, baixo volume, sem SLA — nao ha
      // pressao para manter disponibilidade as custas de gasto duplicado.
      console.error('[video/gerar] falha ao checar duplicata, recusando (fail-closed):', dedupeError.message);
      return NextResponse.json(
        {
          error:
            'nao foi possivel verificar duplicidade antes de submeter (falha na consulta) — ' +
            'nada foi enviado a WaveSpeed. Seguro tentar de novo.',
          detalhe: dedupeError.message,
        },
        { status: 503 },
      );
    } else if (recentes && recentes.length > 0) {
      return NextResponse.json(
        {
          error:
            'ja existe uma submissao identica (mesmo prompt + modelo) em processamento nos ultimos ' +
            `${JANELA_DEDUPE_MS / 1000}s. Recusado para evitar cobranca duplicada.`,
          job_id: recentes[0].id,
        },
        { status: 409 },
      );
    }

    // 💸 A partir daqui, cobrou.
    const { taskId } = await submeterVideo({
      modelo,
      prompt: promptTrim,
      imageUrl: temImagem ? image_url : undefined,
      duracaoS: duracao,
    });

    // Antes do insert: se o insert falhar, este log e a unica pista do gasto.
    console.log(`[video/gerar] SUBMETIDO task=${taskId} modelo=${modelo} dur=${duracao}s`);

    const { data, error } = await supabaseServer
      .from('video_jobs')
      .insert({
        campanha_id: campanha_id || null,
        tipo: 'gerar',
        status: 'processando', // NUNCA 'pendente': ja foi submetido e pago
        wavespeed_task_id: taskId,
        modelo,
        prompt: promptTrim,
        image_url: temImagem ? image_url : null,
        duracao_s: duracao,
        custo_estimado_usd: custo,
        iniciado_em: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error(`[video/gerar] GASTO ORFAO task=${taskId}:`, error.message);
      return NextResponse.json(
        { error: 'video foi submetido mas nao gravou', task_id: taskId, detalhe: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      job_id: data.id,
      task_id: taskId,
      custo_estimado_usd: custo,
    });
  } catch (err) {
    console.error('[video/gerar] erro:', (err as Error)?.message);
    return NextResponse.json(
      { error: 'falha ao gerar video', detalhe: (err as Error)?.message },
      { status: 500 },
    );
  }
}
