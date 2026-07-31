// scripts/lp-para-dashboard.mjs
//
// Leva uma LP construída à mão (projeto multi-arquivo, modelo
// low-ticket/<produto>/lp/) para DENTRO do dashboard, em workflow_design.
//
// POR QUE ISSO EXISTE
// O dashboard é o que estamos validando: toda atualização precisa aparecer nele
// para seguir o fluxo normal (preview → Aprovar e Publicar → /api/deploy →
// instalar tracking). Mas o /api/deploy sobe UM ÚNICO arquivo HTML, sem bundle
// de assets, enquanto o modelo da LP é um projeto com script.js e assets/.
// Este script faz a ponte, e faz de forma REPETÍVEL: a pasta do projeto continua
// sendo a fonte da verdade e o dashboard é o espelho. Rodar de novo re-espelha.
// Copiar HTML à mão uma vez seria a receita para os dois desandarem em silêncio.
//
// O QUE ELE FAZ
//   1. sobe public/assets/*.webp + apple-touch-icon.png para o bucket público
//      em lp/<campanha_id>/pagina/   (pasta própria: NÃO colide com `web/`,
//      que é das derivadas automáticas do /api/design/imagens)
//   2. inlina o script.js dentro do HTML
//   3. troca os caminhos relativos pelas URLs absolutas do Storage
//   4. inlina o favicon como data URI (economiza uma requisição)
//   5. grava em workflow_design.codigo_html e espelha em lp_biblioteca
//
// USO
//   node scripts/lp-para-dashboard.mjs <pasta-do-projeto-lp> <design_id>
//
// Ex.:
//   node scripts/lp-para-dashboard.mjs \
//     "C:/Users/cerqu/Documents/Projetos_IDE/low-ticket/metodo-do-corredor/lp" \
//     8f8e98fd-dd25-424f-a1d3-f9a8338bd741

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './_env.mjs';

const BUCKET = 'criativos';

const [, , projetoArg, designId] = process.argv;
if (!projetoArg || !designId) {
  console.error('uso: node scripts/lp-para-dashboard.mjs <pasta-do-projeto-lp> <design_id>');
  process.exit(1);
}

const projeto = path.resolve(projetoArg);
const pub = path.join(projeto, 'public');
const indexPath = path.join(pub, 'index.html');
const scriptPath = path.join(pub, 'script.js');
const assetsDir = path.join(pub, 'assets');

for (const p of [pub, indexPath]) {
  if (!fs.existsSync(p)) {
    console.error(`não encontrei: ${p}`);
    process.exit(1);
  }
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env.local');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

const MIME = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

async function main() {
  // ── 1. registro de design + campanha ────────────────────────────────
  const { data: design, error: erroDesign } = await supabase
    .from('workflow_design')
    .select('id, campanha_id')
    .eq('id', designId)
    .maybeSingle();

  if (erroDesign) throw new Error(`buscar design: ${erroDesign.message}`);
  if (!design) throw new Error(`design_id ${designId} não existe em workflow_design`);
  if (!design.campanha_id) throw new Error('este design não tem campanha_id');

  const { data: campanha } = await supabase
    .from('campanhas_producao')
    .select('nome_projeto')
    .eq('id', design.campanha_id)
    .maybeSingle();

  const pasta = `lp/${design.campanha_id}/pagina`;
  console.log(`campanha : ${campanha?.nome_projeto ?? design.campanha_id}`);
  console.log(`destino  : ${BUCKET}/${pasta}/`);

  // ── 2. subir os assets ──────────────────────────────────────────────
  const paraSubir = [];
  if (fs.existsSync(assetsDir)) {
    for (const nome of fs.readdirSync(assetsDir)) {
      paraSubir.push({ nome, abs: path.join(assetsDir, nome), ref: `assets/${nome}` });
    }
  }
  // ícone da aba: no deploy de arquivo único não existe raiz para servir /...
  const icone = path.join(pub, 'apple-touch-icon.png');
  if (fs.existsSync(icone)) {
    paraSubir.push({ nome: 'apple-touch-icon.png', abs: icone, ref: '/apple-touch-icon.png' });
  }

  const urlPorRef = new Map();
  for (const a of paraSubir) {
    const buf = fs.readFileSync(a.abs);
    const ext = path.extname(a.nome).toLowerCase();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(`${pasta}/${a.nome}`, buf, {
        contentType: MIME[ext] ?? 'application/octet-stream',
        upsert: true,
      });
    if (error) throw new Error(`subir ${a.nome}: ${error.message}`);
    const pubUrl = supabase.storage.from(BUCKET).getPublicUrl(`${pasta}/${a.nome}`).data.publicUrl;
    urlPorRef.set(a.ref, pubUrl);
    console.log(`  ↑ ${a.nome.padEnd(24)} ${(buf.length / 1024).toFixed(0)} KB`);
  }

  // ── 3. montar o HTML de arquivo único ───────────────────────────────
  let html = fs.readFileSync(indexPath, 'utf8');

  // 3a. inlinar o script.js — no arquivo único não há /script.js para buscar
  if (fs.existsSync(scriptPath)) {
    const js = fs.readFileSync(scriptPath, 'utf8');
    const tag = html.match(/<script\s+src=["']script\.js["'][^>]*><\/script>/i);
    if (!tag) throw new Error('não achei <script src="script.js"> no index.html');
    // `</script>` dentro de string do JS encerraria a tag cedo. Não há hoje,
    // mas escapar é barato e evita um bug mudo no dia que houver.
    html = html.replace(tag[0], `<script>\n${js.replace(/<\/script>/gi, '<\\/script>')}\n</script>`);
  }

  // 3b. favicon como data URI — some uma requisição e não depende de raiz
  const favicon = path.join(pub, 'favicon.svg');
  if (fs.existsSync(favicon)) {
    const b64 = fs.readFileSync(favicon).toString('base64');
    html = html.replace(/href="\/favicon\.svg[^"]*"/i, `href="data:image/svg+xml;base64,${b64}"`);
  }

  // 3c. caminhos relativos -> URLs absolutas do Storage
  const semTrocar = [];
  for (const [ref, pubUrl] of urlPorRef) {
    if (!html.includes(ref)) { semTrocar.push(ref); continue; }
    html = html.split(ref).join(pubUrl);
  }
  // o apple-touch-icon leva ?v=1 no href; a troca acima já cobriu o caminho

  // ── 4. conferências antes de gravar ─────────────────────────────────
  const problemas = [];
  if (!/<!doctype html/i.test(html)) problemas.push('não começa em <!doctype html>');
  if (/src=["']assets\//i.test(html)) problemas.push('sobrou caminho relativo assets/');
  if (/<script\s+src=/i.test(html)) problemas.push('sobrou <script src=> externo');
  if (problemas.length) throw new Error('HTML final inválido: ' + problemas.join(' · '));

  const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(0);
  console.log(`html     : ${kb} KB (arquivo único)`);
  if (semTrocar.length) console.log(`  aviso: assets não referenciados no HTML: ${semTrocar.join(', ')}`);

  // ── 5. gravar no dashboard ──────────────────────────────────────────
  const { error: erroUpdate } = await supabase
    .from('workflow_design')
    .update({ codigo_html: html })
    .eq('id', designId);
  if (erroUpdate) throw new Error(`gravar codigo_html: ${erroUpdate.message}`);

  // espelho na Biblioteca de Páginas (/paginas), mesmo padrão do
  // /api/design/generate — senão a LP feita à mão não apareceria lá.
  const slugNome = (campanha?.nome_projeto || designId)
    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  const slugLp = `${slugNome || 'lp'}-${designId.slice(0, 8)}`;

  const { error: erroBib } = await supabase.from('lp_biblioteca').upsert(
    {
      nome: campanha?.nome_projeto || `LP ${designId.slice(0, 8)}`,
      slug: slugLp,
      origem: 'claude-code',
      design_id: designId,
      codigo_html: html,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: 'design_id' }
  );
  if (erroBib) console.warn(`  aviso: não espelhou em lp_biblioteca: ${erroBib.message}`);

  console.log('\nOK — a LP está no dashboard.');
  console.log('   /design  → selecione a campanha, o preview já mostra esta versão');
  console.log('   publicar → botão "Aprovar e Publicar" (usa /api/deploy)');
}

main().catch((err) => {
  console.error('\nFALHOU:', err.message);
  process.exit(1);
});
