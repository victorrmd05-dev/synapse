// remotion/worker.mjs
//
// Renderiza os jobs tipo='compor'. Roda a mao, como o scripts/worker-video.mjs.
//
//   npm run video:compor      (da RAIZ; o script entra em remotion/ sozinho)
//   Parar: Ctrl+C
//
// 🚨 O SCRIPT PRECISA RODAR COM O CWD EM remotion/, e isso NAO e detalhe de
// estilo. O Remotion resolve o cache do navegador em `<cwd>/node_modules/
// .remotion` — pelo DIRETORIO ATUAL, nao por onde o @remotion/renderer esta
// instalado. Rodando da raiz, ele nao enxerga o Chrome que ja existe em
// remotion/node_modules/.remotion, baixa uma SEGUNDA copia de 107 MB, e aqui
// a extracao dessa copia TRAVOU (parou depois de 2 arquivos, job preso em
// 'processando' por 20+ minutos sem erro nenhum). Por isso o script e
// `cd remotion && node --env-file=../.env.local worker.mjs`: o `--env-file`
// continua achando o .env.local da raiz, e o Remotion acha o Chrome certo.
// Medido em 02/08/2026.
//
// 🚨 ESTE WORKER NUNCA CHAMA A ELEVENLABS. A narracao ja esta no Storage,
// paga pela rota no clique do Fernando, e o banco garante isso com a check
// `compor_exige_narracao`. E por isso que aqui o RETRY E LIVRE: render e
// gratis, entao reprocessar job travado nao custa nada — o oposto do
// tipo='gerar', onde reprocessar significaria cobrar de novo.
//
// Copia o padrao do worker-video.mjs INCLUINDO as correcoes que custaram caro:
//   - bundle() UMA vez por processo (leva ~5s; repetir por job e desperdicio)
//   - checagem de dependencias na largada, dizendo QUAL node esta em uso
//   - o while envolto em try/catch EXTERNO — o defeito n5 do modulo passado foi
//     exatamente isso: excecao fora do try por-job matando o processo em
//     silencio, deixando job sem ninguem processando.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createClient } from '@supabase/supabase-js';
import { bundle } from '@remotion/bundler';
import { selectComposition, renderMedia } from '@remotion/renderer';

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'criativos';
const INTERVALO_MS = 10_000;

// Teto so pra nao girar eternamente em job impossivel (clipe que sumiu do
// Storage, params corrompidos). Nao e trava de custo — nao ha custo aqui.
const MAX_TENTATIVAS = 3;

const AQUI = path.dirname(fileURLToPath(import.meta.url));

function checarDependencias() {
  const faltando = [];
  if (!URL_SUPABASE) faltando.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!CHAVE_SERVICE) faltando.push('SUPABASE_SERVICE_ROLE_KEY');
  if (faltando.length) {
    console.error(`\n[worker-compor] FALTA: ${faltando.join(', ')}`);
    console.error('Rode da RAIZ: npm run video:compor\n');
    process.exit(1);
  }
}

checarDependencias();
console.log(`[worker-compor] node = ${process.execPath}`);
console.log('[worker-compor] o PRIMEIRO render baixa um Chrome headless (~150-300 MB). Acontece uma vez.');

process.on('unhandledRejection', (err) => {
  console.error('[worker-compor] unhandledRejection (processo segue vivo):', err);
});

const supabase = createClient(URL_SUPABASE, CHAVE_SERVICE, { auth: { persistSession: false } });

// UMA vez por processo. ~5s.
console.log('[worker-compor] empacotando a composicao…');
const servidor = await bundle({ entryPoint: path.join(AQUI, 'src', 'index.ts') });
console.log('[worker-compor] pronto. Aguardando jobs. Ctrl+C para parar.');

async function renderizar(job) {
  const p = job.params_json ?? {};
  const inputProps = {
    urlClipe: p.url_clipe,
    duracaoClipeS: Number(p.duracao_clipe_s ?? 5),
    duracaoNarracaoS: Number(p.duracao_narracao_s ?? 0),
    gancho: p.gancho ?? '',
    cta: p.cta ?? '',
    urlNarracao: job.url_narracao,
    legendas: p.legendas ?? [],
    corFaixa: p.cor_faixa ?? '#FFFFFF',
  };

  if (!inputProps.urlClipe) throw new Error('params_json.url_clipe ausente');
  if (!inputProps.duracaoNarracaoS) throw new Error('params_json.duracao_narracao_s ausente ou zero');

  const composicao = await selectComposition({
    serveUrl: servidor,
    id: 'AnuncioUGC',
    inputProps,
  });

  const saida = path.join(tmpdir(), `anuncio-${job.id}.mp4`);
  await renderMedia({
    composition: composicao,
    serveUrl: servidor,
    codec: 'h264',
    outputLocation: saida,
    inputProps,
  });

  const buffer = await readFile(saida);
  if (buffer.length < 10_000) throw new Error(`mp4 suspeito: ${buffer.length} bytes`);

  const caminho = `anuncio/${job.id}.mp4`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, buffer, { contentType: 'video/mp4', upsert: true });
  if (error) throw new Error(`upload falhou: ${error.message}`);

  await unlink(saida).catch(() => {});

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
  return data.publicUrl;
}

async function processarUmaVolta() {
  const { data: jobs, error } = await supabase
    .from('video_jobs')
    .select('*')
    .eq('tipo', 'compor')
    .eq('status', 'pendente')
    .lt('tentativas', MAX_TENTATIVAS)
    .order('criado_em', { ascending: true })
    .limit(1);

  if (error) {
    console.error('[worker-compor] erro ao ler a fila:', error.message);
    return;
  }
  if (!jobs?.length) return;

  const job = jobs[0];
  const t0 = Date.now();

  await supabase
    .from('video_jobs')
    .update({
      status: 'processando',
      tentativas: (job.tentativas ?? 0) + 1,
      iniciado_em: new Date().toISOString(),
    })
    .eq('id', job.id);

  console.log(`[worker-compor] renderizando ${job.id}…`);

  try {
    const urlPublica = await renderizar(job);
    const segundos = Math.round((Date.now() - t0) / 1000);
    await supabase
      .from('video_jobs')
      .update({
        status: 'concluido',
        url_saida: urlPublica,
        duracao_render_s: segundos,
        erro: null,
        concluido_em: new Date().toISOString(),
      })
      .eq('id', job.id);
    console.log(`[worker-compor] OK ${job.id} em ${segundos}s -> ${urlPublica}`);
  } catch (err) {
    const tentativas = (job.tentativas ?? 0) + 1;
    const desistiu = tentativas >= MAX_TENTATIVAS;
    await supabase
      .from('video_jobs')
      .update({
        // Volta pra 'pendente' enquanto houver tentativa: render e gratis,
        // entao insistir nao custa nada.
        status: desistiu ? 'erro' : 'pendente',
        erro: `${err.message}`,
        ...(desistiu ? { concluido_em: new Date().toISOString() } : {}),
      })
      .eq('id', job.id);
    console.error(
      `[worker-compor] falhou ${job.id} (${tentativas}/${MAX_TENTATIVAS}): ${err.message}`,
    );
  }
}

while (true) {
  try {
    await processarUmaVolta();
  } catch (err) {
    // Rede de seguranca EXTERNA. Foi exatamente aqui que o modulo passado
    // quebrou: excecao fora do try por-job derrubava o processo em silencio.
    console.error('[worker-compor] erro inesperado no loop:', err);
  }
  await new Promise((r) => setTimeout(r, INTERVALO_MS));
}
