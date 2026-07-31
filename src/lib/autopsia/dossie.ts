// src/lib/autopsia/dossie.ts
//
// Montagem determinística do dossiê. A IA devolve JSON por seção; ESTE
// arquivo decide o formato.
//
// Mesmo padrão de src/lib/tracking/fop.ts: a IA decide a inteligência, o
// código decide a forma. Deixar o modelo escrever o markdown inteiro faria a
// estrutura variar a cada geração, e o HTML (Task 15) precisa de estrutura
// estável para renderizar.
//
// `em_aberto` é campo de primeira classe de propósito: transforma a regra "o
// dossiê não preenche slot em aberto" em schema, em vez de depender de o
// modelo se comportar.

export interface DossieJSON {
  sumario_executivo: string;
  alvo: string;
  anatomia: string;
  vulnerabilidades: string;
  modelar_x_rejeitar: string;
  plano: string;
  restricoes: string;
  em_aberto: string[];
}

export interface CriativoDossie {
  ad_archive_id: string | null;
  duracao_s: number | null;
  dias_no_ar: number | null;
  is_active: boolean | null;
  ad_copy: string | null;
  cta_text: string | null;
  link_url: string | null;
  transcricao: string | null;
  storage_path: string | null;
  frames_paths: string[] | null;
}

export interface DadosDossie {
  page_name: string | null;
  page_id: string;
  total_anuncios: number;
  total_criativos: number;
  criado_em: string;
  criativos: CriativoDossie[];
  secoes: DossieJSON;
}

/** Texto fixo da seção 2 — é fato de engenharia, não análise da IA. */
export function metodoDeColeta(dados: DadosDossie): string {
  return [
    `1. Coleta via **ScrapeCreators** (endpoint \`company/ads\`), paginada por \`cursor\` — ` +
      `${dados.total_anuncios} anúncios lidos do \`page_id\` \`${dados.page_id}\`.`,
    `2. Dedup por **path do arquivo** no CDN do Facebook (a querystring é assinada e muda a ` +
      `toda hora; o path é estável) → **${dados.total_criativos} criativos únicos**.`,
    `3. Download com header \`Referer: facebook.com\` (sem ele o CDN devolve 403) e guarda no ` +
      `Supabase Storage — as URLs do CDN expiram em ~5 dias.`,
    `4. Frames: \`ffmpeg\` monta 3 grades 3×3 por vídeo (gancho · meio · CTA).`,
    `5. Transcrição: \`faster-whisper\` \`medium\`, local, CPU.`,
    ``,
    `> ⚠️ A legenda dos anúncios é karaokê palavra-a-palavra queimada no vídeo. Ler a copy por ` +
      `frame é inviável — o áudio precisa ser transcrito.`,
  ].join('\n');
}

function tabelaCriativos(criativos: CriativoDossie[]): string {
  const linhas = criativos.map((c, i) => {
    const primeira = (c.ad_copy ?? '').split('\n')[0].slice(0, 70).replace(/\|/g, '\\|');
    return `| ${i} | \`${c.ad_archive_id ?? '—'}\` | ${c.duracao_s ?? '—'}s | ${c.dias_no_ar ?? '—'} | ` +
      `${c.is_active ? 'sim' : 'não'} | ${c.transcricao ? 'sim' : 'não'} | ${primeira || '—'} |`;
  });
  return [
    '| # | ad_archive_id | Duração | Dias no ar | Ativo | Transcrito | Primeira linha da copy |',
    '|---|---|---|---|---|---|---|',
    ...linhas,
  ].join('\n');
}

export function montarMarkdown(dados: DadosDossie): string {
  const s = dados.secoes;
  const data = new Date(dados.criado_em).toLocaleDateString('pt-BR');
  const semTranscricao = dados.criativos.filter((c) => !c.transcricao).length;

  const emAberto = s.em_aberto?.length
    ? s.em_aberto.map((q) => `- ⬜ ${q}`).join('\n')
    : '_A análise não registrou pontos em aberto. Em material real isso é raro — confira se ' +
      'alguma conclusão foi preenchida por inferência._';

  return `# 🔬 DOSSIÊ — Autópsia: *${dados.page_name ?? dados.page_id}*

> Gerado pelo Alavanca Synapse em ${data} · \`page_id\` \`${dados.page_id}\`
> ${dados.total_anuncios} anúncios coletados → **${dados.total_criativos} criativos únicos**${
    semTranscricao > 0 ? ` · ⚠️ ${semTranscricao} criativo(s) sem transcrição` : ''
  }

---

## 0. Sumário executivo

${s.sumario_executivo}

---

## 1. O alvo

${s.alvo}

---

## 2. Método de coleta

${metodoDeColeta(dados)}

---

## 3. Anatomia da operação

${s.anatomia}

---

## 4. Vulnerabilidades

${s.vulnerabilidades}

---

## 5. O que modelamos × o que rejeitamos

${s.modelar_x_rejeitar}

---

## 6. Plano

${s.plano}

---

## 7. Restrições

${s.restricoes}

---

## 8. Em aberto — decisão humana, não preenchida por inferência

${emAberto}

---

## 9. Anexos — inventário de criativos

${tabelaCriativos(dados.criativos)}
`;
}

function escapar(txt: string): string {
  return txt
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Markdown mínimo → HTML. Só o que o dossiê usa: títulos, negrito, itálico,
 * código, listas, citação, tabela e parágrafo.
 *
 * Deliberadamente sem biblioteca: o HTML precisa ser um ARQUIVO ÚNICO e
 * autocontido, que abre com duplo clique e não depende de CDN nenhum.
 */
function markdownParaHtml(md: string): string {
  const linhas = escapar(md).split('\n');
  const out: string[] = [];
  let emLista = false;
  let emTabela = false;

  const inline = (t: string) =>
    t
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');

  const fecharLista = () => { if (emLista) { out.push('</ul>'); emLista = false; } };
  const fecharTabela = () => { if (emTabela) { out.push('</tbody></table>'); emTabela = false; } };

  for (const linha of linhas) {
    const l = linha.trimEnd();

    if (/^\|(\s*:?-+:?\s*\|)+$/.test(l)) continue; // separador da tabela

    if (l.startsWith('|')) {
      const celulas = l.split('|').slice(1, -1).map((c) => inline(c.trim()));
      if (!emTabela) {
        fecharLista();
        out.push('<table><thead><tr>' + celulas.map((c) => `<th>${c}</th>`).join('') + '</tr></thead><tbody>');
        emTabela = true;
      } else {
        out.push('<tr>' + celulas.map((c) => `<td>${c}</td>`).join('') + '</tr>');
      }
      continue;
    }
    fecharTabela();

    if (/^#{1,4}\s/.test(l)) {
      fecharLista();
      const nivel = l.match(/^#+/)![0].length;
      out.push(`<h${nivel}>${inline(l.replace(/^#+\s/, ''))}</h${nivel}>`);
    } else if (/^[-*]\s/.test(l)) {
      if (!emLista) { out.push('<ul>'); emLista = true; }
      out.push(`<li>${inline(l.replace(/^[-*]\s/, ''))}</li>`);
    } else if (l.startsWith('&gt; ')) {
      fecharLista();
      out.push(`<blockquote>${inline(l.slice(5))}</blockquote>`);
    } else if (l === '---') {
      fecharLista();
      out.push('<hr>');
    } else if (l.trim() === '') {
      fecharLista();
    } else {
      fecharLista();
      out.push(`<p>${inline(l)}</p>`);
    }
  }
  fecharLista();
  fecharTabela();
  return out.join('\n');
}

/**
 * HTML de arquivo ÚNICO: CSS inline, sem CDN, sem build, abre com duplo clique.
 *
 * ⚠️ As imagens usam as URLs ABSOLUTAS do Supabase Storage. O dossiê do método
 * manual usava caminhos relativos porque vivia numa pasta com os arquivos ao
 * lado; publicado no Cloudflare, relativo abriria sem imagem nenhuma.
 */
export function montarHtml(dados: DadosDossie): string {
  const corpo = markdownParaHtml(montarMarkdown(dados));

  const galeria = dados.criativos
    .filter((c) => c.frames_paths?.length)
    .map((c, i) => {
      const imgs = c.frames_paths!
        .map((u) => `<img src="${u}" alt="frames do criativo ${i}" loading="lazy">`)
        .join('\n');
      return `<section class="criativo">
  <h3>Criativo ${i} — ${c.duracao_s ?? '?'}s · ${c.dias_no_ar ?? '?'} dias no ar${c.is_active ? ' · ativo' : ''}</h3>
  <div class="grades">${imgs}</div>
  ${c.transcricao ? `<details><summary>Transcrição</summary><p class="transc">${escapar(c.transcricao)}</p></details>` : ''}
</section>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dossiê — ${escapar(dados.page_name ?? dados.page_id)}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 3rem 1.25rem 6rem; background: #0D0D14; color: #E5E7EB;
         font: 16px/1.7 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 860px; margin: 0 auto; }
  h1 { font-size: 2rem; line-height: 1.25; margin: 0 0 1.5rem; color: #fff; }
  h2 { font-size: 1.4rem; margin: 3rem 0 1rem; color: #fff; border-bottom: 1px solid #2A2A38; padding-bottom: .5rem; }
  h3 { font-size: 1.1rem; margin: 2rem 0 .75rem; color: #fff; }
  h4 { font-size: 1rem; margin: 1.5rem 0 .5rem; color: #A5B4FC; }
  p { margin: 0 0 1rem; }
  a { color: #818CF8; }
  code { background: #16161F; padding: .15em .4em; border-radius: 4px; font-size: .875em; color: #A5B4FC; }
  blockquote { margin: 1.25rem 0; padding: .75rem 1rem; border-left: 3px solid #6366f1;
               background: #16161F; border-radius: 0 6px 6px 0; color: #9CA3AF; }
  ul { padding-left: 1.25rem; margin: 0 0 1rem; }
  li { margin: .35rem 0; }
  hr { border: 0; border-top: 1px solid #2A2A38; margin: 2.5rem 0; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: .875rem; display: block; overflow-x: auto; }
  th, td { border: 1px solid #2A2A38; padding: .5rem .65rem; text-align: left; vertical-align: top; }
  th { background: #16161F; color: #fff; font-weight: 600; }
  .criativo { margin: 2.5rem 0; padding: 1.25rem; background: #16161F; border: 1px solid #2A2A38; border-radius: 10px; }
  .grades { display: grid; gap: .75rem; grid-template-columns: 1fr; }
  @media (min-width: 720px) { .grades { grid-template-columns: repeat(3, 1fr); } }
  .grades img { width: 100%; border-radius: 6px; display: block; }
  details { margin-top: 1rem; }
  summary { cursor: pointer; color: #818CF8; font-size: .9rem; }
  .transc { margin-top: .75rem; color: #9CA3AF; font-size: .9rem; white-space: pre-wrap; }
  footer { max-width: 860px; margin: 4rem auto 0; padding-top: 1.5rem; border-top: 1px solid #2A2A38;
           color: #6B7280; font-size: .8rem; }
</style>
</head>
<body>
<main>
${corpo}

<h2>Galeria de criativos</h2>
${galeria || '<p>Nenhuma grade de frames gerada.</p>'}
</main>
<footer>Gerado pelo Alavanca Synapse · ${new Date(dados.criado_em).toLocaleDateString('pt-BR')}</footer>
</body>
</html>`;
}
