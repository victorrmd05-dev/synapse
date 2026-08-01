// scripts/worker-video.mjs
//
// Consulta as tarefas de video na WaveSpeed e baixa o resultado para o Storage.
//
// 🚨 ESTE WORKER NUNCA SUBMETE NADA. Consultar e baixar sao operacoes GRATIS e
// IDEMPOTENTES — podem ser repetidas sem custo. Submeter cobra, e por isso mora
// na rota, amarrado a um clique confirmado. Se um dia alguem for tentado a
// "reenviar job travado" daqui: nao. Isso cobra de novo. O banco ate protege
// contra isso: video_jobs tem `check (tipo <> 'gerar' or wavespeed_task_id is
// not null)` — uma linha 'gerar' so existe se ja foi submetida (e paga).
//
// Mesma licao do worker da autopsia (scripts/worker-autopsia.py): falhar na
// largada dizendo QUAL interpretador esta em uso, em vez de quebrar 40 minutos
// depois no primeiro job real.
//
// Rodar:  node --env-file=.env.local scripts/worker-video.mjs
//         (ou:  npm run video:worker)
// Parar:  Ctrl+C

import { createClient } from '@supabase/supabase-js';

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CHAVE_WAVESPEED = process.env.WAVESPEED_API_KEY;
const BUCKET = 'criativos';

// Medido na chamada real (Task 1, 31/07/2026): clipe de 4s em
// `openai/sora-2/text-to-video` levou 135,8s ate `completed`. 15s de intervalo
// da ~9 consultas por clipe — folgado sem martelar a API. Ver
// docs/superpowers/plans/2026-07-31-video-wavespeed-ACHADOS.md.
const INTERVALO_MS = 15_000;

// Teto de retentativas do DOWNLOAD, contado na coluna `tentativas_download`
// (SEPARADA de `tentativas`, que conta falhas de consulta — ver mais abaixo
// por que os dois tem tratamento diferente e nao podem dividir a mesma
// coluna). Existe porque a validade da URL temporaria de saida da WaveSpeed
// ainda NAO e conhecida (ACHADOS.md, secao "Ainda NAO confirmado"). Sem teto,
// uma URL expirada faria o job girar para sempre em 'processando',
// reincrementando `tentativas_download` sem nunca virar 'concluido' nem
// 'erro'. Quando alguem medir a validade real, e aqui que se ajusta.
const MAX_TENTATIVAS = 5;

function checarDependencias() {
  const faltando = [];
  if (!URL_SUPABASE) faltando.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!CHAVE_SERVICE) faltando.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!CHAVE_WAVESPEED) faltando.push('WAVESPEED_API_KEY');
  if (faltando.length) {
    console.error(`\n[worker-video] FALTA: ${faltando.join(', ')}`);
    console.error('Rode com as variaveis carregadas. Ex: node --env-file=.env.local scripts/worker-video.mjs\n');
    process.exit(1);
  }
}

checarDependencias();
console.log(`[worker-video] node = ${process.execPath}`);
console.log(`[worker-video] intervalo = ${INTERVALO_MS / 1000}s. Ctrl+C para parar.`);

// Um job pago fica orfao se o processo morrer sem ninguem olhando. Uma
// promise rejeitada sem catch derrubaria o Node em silencio (comportamento
// padrao desde o Node 15) — aqui so loga e segue vivo.
process.on('unhandledRejection', (err) => {
  console.error('[worker-video] unhandledRejection (processo segue vivo):', err);
});

const supabase = createClient(URL_SUPABASE, CHAVE_SERVICE, {
  auth: { persistSession: false },
});

/** Gratis e idempotente — pode ser chamada quantas vezes quiser. */
async function consultar(taskId) {
  const res = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${taskId}/result`, {
    headers: { Authorization: `Bearer ${CHAVE_WAVESPEED}` },
  });
  const texto = await res.text();
  if (!res.ok) throw new Error(`WaveSpeed ${res.status}: ${texto.slice(0, 300)}`);
  const d = JSON.parse(texto)?.data ?? {};
  return { status: d.status ?? 'processing', outputs: d.outputs ?? [], erro: d.error };
}

async function baixarParaStorage(url, caminho) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download falhou: HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 1000) throw new Error(`arquivo suspeito: ${buffer.length} bytes`);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, buffer, { contentType: 'video/mp4', upsert: true });
  if (error) throw new Error(`upload falhou: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
  return data.publicUrl;
}

async function processarUmaVolta() {
  const { data: jobs, error } = await supabase
    .from('video_jobs')
    .select('*')
    .eq('tipo', 'gerar')
    .eq('status', 'processando')
    .order('criado_em', { ascending: true })
    .limit(10);

  if (error) {
    console.error('[worker-video] erro ao ler fila:', error.message);
    return;
  }
  if (!jobs?.length) return;

  for (const job of jobs) {
    // Catch separado do de baixarParaStorage() abaixo: sao erros de natureza
    // diferente. Se a CONSULTA falha (rede, 5xx, DNS), a tarefa provavelmente
    // segue viva do lado da WaveSpeed e ja foi paga — nao marca erro, so conta
    // a tentativa e tenta de novo na proxima volta, sem teto (a WaveSpeed nao
    // cobra por consulta, entao nao ha custo em insistir).
    let r;
    try {
      r = await consultar(job.wavespeed_task_id);
    } catch (err) {
      await supabase
        .from('video_jobs')
        .update({ tentativas: (job.tentativas ?? 0) + 1, erro: `consulta falhou: ${err.message}` })
        .eq('id', job.id);
      console.warn(`[worker-video] consulta falhou ${job.id}: ${err.message}`);
      continue;
    }

    if (r.status === 'created' || r.status === 'processing') {
      continue; // ainda cozinhando; consultar de novo na proxima volta
    }

    if (r.status === 'completed' && r.outputs[0]) {
      // A URL de saida da WaveSpeed e TEMPORARIA. Mesma licao que a autopsia
      // pagou com o CDN do Facebook: baixar antes de qualquer outra coisa,
      // senao o criativo evapora e ninguem entende por que.
      const caminho = `video/${job.id}.mp4`;
      try {
        const urlPublica = await baixarParaStorage(r.outputs[0], caminho);

        await supabase
          .from('video_jobs')
          .update({
            status: 'concluido',
            url_saida: urlPublica,
            concluido_em: new Date().toISOString(),
          })
          .eq('id', job.id);

        console.log(`[worker-video] OK ${job.id} -> ${urlPublica}`);
      } catch (err) {
        // O DOWNLOAD falhou, mas a WaveSpeed ja disse 'completed' — ja foi
        // COBRADO. Pode ser rede passageira (vale insistir) ou a URL
        // temporaria pode ter expirado (insistir para sempre nao resolve).
        // Como nao sabemos qual dos dois, contamos ate MAX_TENTATIVAS e so
        // entao desistimos, com uma mensagem que deixa claro que o dinheiro
        // ja foi gasto — quem ler nao pode achar que e so "tentar de novo".
        //
        // Conta em `tentativas_download`, coluna SEPARADA de `tentativas`
        // (que conta falhas de consulta). Sao naturezas diferentes: rede
        // instavel na consulta pode incrementar `tentativas` varias vezes
        // sem nenhuma relacao com o download. Se as duas dividissem a mesma
        // coluna, 4 falhas de consulta em voltas anteriores fariam a
        // PRIMEIRA falha de download estourar o teto, descartando um video
        // ja pago com uma mensagem que mente sobre quantas vezes o download
        // de fato falhou.
        const tentativasDownload = (job.tentativas_download ?? 0) + 1;
        if (tentativasDownload >= MAX_TENTATIVAS) {
          await supabase
            .from('video_jobs')
            .update({
              status: 'erro',
              tentativas_download: tentativasDownload,
              erro: `video foi gerado e cobrado, mas o download falhou ${tentativasDownload}x (${err.message}); a URL de saida da WaveSpeed pode ter expirado`,
              concluido_em: new Date().toISOString(),
            })
            .eq('id', job.id);
          console.error(`[worker-video] DESISTI do download ${job.id} apos ${tentativasDownload} tentativas: ${err.message}`);
        } else {
          await supabase
            .from('video_jobs')
            .update({ tentativas_download: tentativasDownload, erro: `download falhou: ${err.message}` })
            .eq('id', job.id);
          console.warn(`[worker-video] download falhou ${job.id} (tentativa ${tentativasDownload}/${MAX_TENTATIVAS}): ${err.message}`);
        }
      }
      continue;
    }

    // failed | cancelled | timeout, ou completed sem outputs
    await supabase
      .from('video_jobs')
      .update({
        status: 'erro',
        erro: r.erro || `WaveSpeed devolveu status=${r.status} sem saida`,
        concluido_em: new Date().toISOString(),
      })
      .eq('id', job.id);

    console.warn(`[worker-video] ERRO ${job.id}: ${r.status}`);
  }
}

while (true) {
  try {
    await processarUmaVolta();
  } catch (err) {
    // Rede de seguranca para qualquer coisa que escapou dos catches de dentro
    // de processarUmaVolta() (ex.: o proprio .select() da fila falhando de
    // forma atipica, erro de DNS). O worker tem que ser dificil de matar — a
    // fila e o que guarda o dinheiro. Loga com contexto e segue para a
    // proxima volta, em vez de derrubar o processo em silencio e deixar um
    // job ja pago sem ninguem consultando ate alguem notar e reiniciar a mao.
    console.error('[worker-video] erro inesperado no loop:', err);
  }
  await new Promise((r) => setTimeout(r, INTERVALO_MS));
}
