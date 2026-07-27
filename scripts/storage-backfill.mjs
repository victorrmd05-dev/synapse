// scripts/storage-backfill.mjs
//
// Salva no Supabase Storage a imagem dos anuncios que ainda nao tem
// image_storage_path. Idempotente: rodar de novo so pega os que faltam.
//
// URGENTE por natureza: as URLs do CDN do FB expiram em ~5 dias. O que nao
// for baixado a tempo esta perdido (so re-minerando).
//
// Rodar: node scripts/storage-backfill.mjs
//
// Usa a coluna image_url, que a correcao de 29/06 ja preencheu com a
// miniatura certa (inclusive carrossel, onde a imagem vive em cards[]).
// Verificado antes de escrever o script: os 30 anuncios do banco tem
// image_url — nao ha motivo para reextrair do raw_json aqui.

import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './_env.mjs';

const env = loadEnv();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const HDRS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0 Safari/537.36',
  Referer: 'https://www.facebook.com/',
  Accept: '*/*',
};

const { data: existe } = await sb.storage.getBucket('criativos');
if (!existe) {
  const { error } = await sb.storage.createBucket('criativos', { public: true, fileSizeLimit: '50MB' });
  if (error && !/exist/i.test(error.message)) throw error;
  console.log('bucket criativos criado');
}

const { data: ads, error } = await sb
  .from('ads_minerados')
  .select('id, image_url')
  .is('image_storage_path', null);
if (error) throw error;

console.log(`${ads.length} anuncios sem imagem no Storage`);
let ok = 0;
let falha = 0;

for (const ad of ads) {
  const url = ad.image_url;
  if (!url) {
    console.log(`- ${ad.id}: sem URL de imagem`);
    falha++;
    continue;
  }

  try {
    const res = await fetch(url, { headers: HDRS });
    if (!res.ok) {
      console.log(`- ${ad.id}: HTTP ${res.status} (URL provavelmente expirada)`);
      falha++;
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const caminho = `minerados/${ad.id}.jpg`;
    const up = await sb.storage.from('criativos').upload(caminho, buf, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (up.error) throw up.error;
    const { data: pub } = sb.storage.from('criativos').getPublicUrl(caminho);
    await sb.from('ads_minerados').update({ image_storage_path: pub.publicUrl }).eq('id', ad.id);
    console.log(`+ ${ad.id}: ${(buf.length / 1024).toFixed(0)} KB`);
    ok++;
  } catch (e) {
    console.log(`- ${ad.id}: ${e.message}`);
    falha++;
  }
}

console.log(`\nCONCLUIDO — ${ok} salvos, ${falha} falharam`);
