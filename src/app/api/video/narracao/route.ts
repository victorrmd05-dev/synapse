// src/app/api/video/narracao/route.ts
//
// 💸 GASTA COTA DA ELEVENLABS. E deliberado que seja a ROTA, num clique
// confirmado, e nao o worker — ver o cabecalho de src/lib/elevenlabs/client.ts.
//
// Esta rota NAO cria job nenhum. Se a ElevenLabs falhar ou a cota estourar,
// ela devolve erro e acabou: sem narracao nao ha o que renderizar. Quem cria o
// job e /api/video/compor, e o banco recusa um compor sem url_narracao.

import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { narrarComTimestamps, configuracaoElevenLabs } from '@/lib/elevenlabs/client';
import { agruparLegendas, duracaoDasLegendas } from '@/lib/elevenlabs/legendas';

export const dynamic = 'force-dynamic';

const BUCKET = 'criativos';
const MAX_CHARS = 1200;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { campanha_id, texto } = body ?? {};

    if (!texto || typeof texto !== 'string' || texto.trim().length < 10) {
      return NextResponse.json(
        { error: 'texto e obrigatorio e precisa ter ao menos 10 caracteres' },
        { status: 400 },
      );
    }
    if (texto.length > MAX_CHARS) {
      // Recusa ANTES de gastar: roteiro de anuncio nao tem esse tamanho, entao
      // texto assim quase sempre e o meta_ads_copy inteiro colado sem cortar.
      return NextResponse.json(
        { error: `texto tem ${texto.length} caracteres, acima do teto de ${MAX_CHARS}. Corte o roteiro.` },
        { status: 400 },
      );
    }

    const { chave, voz, modelo } = configuracaoElevenLabs();
    if (!chave || !voz) {
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY e/ou ELEVENLABS_VOICE_ID ausentes no .env.local' },
        { status: 400 },
      );
    }

    const textoTrim = texto.trim();

    // O CACHE, sem tabela nova: o caminho no Storage E a chave.
    //
    // Os TRES entram no hash. So o texto nao basta: voce trocaria a voz no
    // .env e receberia o mp3 antigo, sem entender por que.
    const hash = createHash('sha256').update(`${textoTrim}|${voz}|${modelo}`).digest('hex').slice(0, 32);
    const caminho = `narracao/${campanha_id || 'sem-campanha'}/${hash}.mp3`;

    const { data: jaExiste } = await supabaseServer.storage
      .from(BUCKET)
      .list(caminho.split('/').slice(0, -1).join('/'), { search: `${hash}.mp3` });

    const legendasCaminho = `${caminho}.json`;

    if (jaExiste && jaExiste.length > 0) {
      // Cache quente: as legendas vivem num .json ao lado do mp3, porque sem
      // elas o mp3 sozinho nao serve — precisariamos gastar de novo so pelo
      // timing. Se o .json sumiu, ignora o cache e regera os dois.
      const { data: baixado } = await supabaseServer.storage.from(BUCKET).download(legendasCaminho);
      if (baixado) {
        const legendas = JSON.parse(await baixado.text());
        const { data: pub } = supabaseServer.storage.from(BUCKET).getPublicUrl(caminho);
        return NextResponse.json({
          url_narracao: pub.publicUrl,
          legendas,
          duracao_s: duracaoDasLegendas(legendas),
          do_cache: true,
        });
      }
    }

    // 💸 A partir daqui, gastou cota.
    const { audio, caracteres, inicios, fins } = await narrarComTimestamps(textoTrim);
    const legendas = agruparLegendas(caracteres, inicios, fins);
    const duracaoS = duracaoDasLegendas(legendas);

    console.log(`[video/narracao] gerou ${audio.length} bytes, ${legendas.length} legendas, ${duracaoS}s`);

    const { error: erroAudio } = await supabaseServer.storage
      .from(BUCKET)
      .upload(caminho, audio, { contentType: 'audio/mpeg', upsert: true });
    if (erroAudio) {
      // Ja gastou. O log e a unica pista.
      console.error('[video/narracao] GASTOU E NAO SUBIU:', erroAudio.message);
      return NextResponse.json(
        { error: 'narracao foi gerada mas o upload falhou', detalhe: erroAudio.message },
        { status: 500 },
      );
    }

    const { error: erroLegendas } = await supabaseServer.storage
      .from(BUCKET)
      .upload(legendasCaminho, Buffer.from(JSON.stringify(legendas)), {
        contentType: 'application/json',
        upsert: true,
      });
    if (erroLegendas) {
      console.error('[video/narracao] legendas nao subiram:', erroLegendas.message);
      // Nao e fatal: o mp3 esta la e as legendas vao na resposta. So o cache
      // da proxima vez e que vai errar e regerar.
    }

    const { data: pub } = supabaseServer.storage.from(BUCKET).getPublicUrl(caminho);

    return NextResponse.json({
      url_narracao: pub.publicUrl,
      legendas,
      duracao_s: duracaoS,
      do_cache: false,
    });
  } catch (err) {
    console.error('[video/narracao] erro:', (err as Error)?.message);
    return NextResponse.json(
      { error: 'falha ao gerar narracao', detalhe: (err as Error)?.message },
      { status: 500 },
    );
  }
}
