import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DATA_DIR = path.join(process.cwd(), 'analises-ia');
const FILE_PATH = path.join(DATA_DIR, 'diagnosticos.json');

/** Slug seguro para nome de arquivo (sem acentos/símbolos). */
function slugify(s: string): string {
  return s
    .normalize('NFD') // decompõe acentos: "á" -> "a" + diacrítico
    .replace(/[^\x00-\x7F]/g, '') // remove tudo que não é ASCII (os diacríticos)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// --- Formatação (pt-BR) -----------------------------------------------------
const nf = new Intl.NumberFormat('pt-BR');
const n0 = (v: any) => (Number.isFinite(Number(v)) ? nf.format(Math.round(Number(v))) : '0');
const money = (v: any) =>
  `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const money0 = (v: any) =>
  `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const pctFrac = (v: any) => `${(Number(v || 0) * 100).toFixed(1)}%`; // v é fração (0-1)
const pctRaw = (v: any) => `${Number(v || 0).toFixed(2)}%`; // v já é percentual

const STATUS_TXT: Record<string, string> = {
  escalar: '🟢 escalar',
  escalavel: '🟢 escalável',
  otimizar: '🟡 otimizar',
  pausar: '🔴 pausar',
  nao_escalar: '🔴 não escalar',
};

/** Tabela markdown de uma quebra (posicionamento/público/conjunto). */
function tabelaQuebra(rows: any[], colLabel: string): string {
  if (!Array.isArray(rows) || rows.length === 0) return '_(sem dados)_';
  const head = `| ${colLabel} | Gasto | Compras | ROAS | CPA | Status |\n|---|---|---|---|---|---|`;
  const body = rows
    .slice(0, 40)
    .map(
      (r) =>
        `| ${r.label} | ${money0(r.spend)} | ${n0(r.compras)} | ${Number(r.roas || 0).toFixed(2)} | ${money0(
          r.cpa
        )} | ${STATUS_TXT[r.status] || r.status || ''} |`
    )
    .join('\n');
  return `${head}\n${body}`;
}

/** Monta o markdown COMPLETO da página (métricas + funil + diagnóstico + Análise Profunda + Plano). */
function buildFullMarkdown(b: any, salvoEm: string): string {
  const m = b.metrics;
  const parts: string[] = [];

  parts.push(`# 🧠 Análise Completa — ${b.campaign_nome || b.meta_campaign_id}`);
  parts.push(
    [
      b.account ? `- **Conta:** ${b.account.name} (\`${b.account.id}\`)` : null,
      `- **Campanha (Meta ID):** ${b.meta_campaign_id}`,
      b.objetivo ? `- **Objetivo:** ${b.objetivo}` : null,
      b.status ? `- **Status:** ${b.status}` : null,
      b.range_label ? `- **Período:** ${b.range_label}` : null,
      `- **Gargalo (funil):** ${b.gargalo}`,
      `- **Prioridade:** ${b.prioridade}`,
      `- **Salvo em:** ${new Date(salvoEm).toLocaleString('pt-BR')}`,
    ]
      .filter(Boolean)
      .join('\n')
  );

  // --- Métricas Meta Ads ---
  if (m) {
    parts.push(`## 📊 Métricas Meta Ads

| Métrica | Valor | Métrica | Valor |
|---|---|---|---|
| Impressões | ${n0(m.impressoes)} | LP Views | ${n0(m.landing_page_views)} |
| Alcance | ${n0(m.alcance)} | Checkouts iniciados | ${n0(m.checkouts_iniciados)} |
| Frequência | ${Number(m.frequencia || 0).toFixed(2)}x | Compras | ${n0(m.compras)} |
| Cliques no link | ${n0(m.cliques_link)} | Valor de conversão | ${money0(m.valor_conversao)} |
| CTR | ${pctRaw(m.ctr)} | ROAS | ${Number(m.roas || 0).toFixed(2)}x |
| CPC | ${money(m.cpc)} | CPA | ${money(m.cpa)} |
| CPM | ${money(m.cpm)} | Status de escala | ${STATUS_TXT[m.escala_status] || m.escala_status || ''} |
| Valor gasto | ${money0(m.valor_gasto)} | | |`);

    // --- Funil 80x10x10 ---
    parts.push(`## 🔻 Funil 80×10×10

| Etapa | Valor | Meta |
|---|---|---|
| Connect Rate | ${pctFrac(m.connect_rate)} | 80% |
| Conversão LP | ${pctFrac(m.conversao_lp)} | 10% |
| Conversão Checkout | ${pctFrac(m.conversao_checkout)} | 10% |
| Conversão Global | ${pctFrac(m.conversao_global)} | 1% |`);
  }

  // --- Diagnóstico IA (funil) ---
  parts.push(`## 🩺 Diagnóstico IA — Analista de Performance

**Gargalo:** ${b.gargalo}

${b.diagnostico}

### Recomendações
${
  (Array.isArray(b.recomendacoes) ? b.recomendacoes : [])
    .map((rec: any, i: number) => {
      const p = (rec?.prioridade || '').toUpperCase();
      const txt = rec?.texto ?? String(rec);
      return `${i + 1}. ${p ? `**[${p}]** ` : ''}${txt}`;
    })
    .join('\n') || '_(sem recomendações)_'
}`);

  // --- Análise Profunda (quebras) ---
  const a = b.analysis;
  if (a && (a.byPlacement?.length || a.byAge?.length || a.byAdset?.length)) {
    parts.push(`## 🔬 Análise Profunda — Media Buyer IA

### Por posicionamento
${tabelaQuebra(a.byPlacement, 'Posicionamento')}

### Por público (idade · gênero)
${tabelaQuebra(a.byAge, 'Público')}

### Por conjunto
${tabelaQuebra(a.byAdset, 'Conjunto')}`);
  }

  // --- Leitura do media buyer (deep diagnostic) ---
  const d = b.deep;
  if (d && (d.resumo || d.vazamentos?.length || d.acoes?.length)) {
    const vaz = (d.vazamentos || [])
      .map((v: any) => `- **${v.tipo}:** ${v.descricao}`)
      .join('\n');
    const aco = (d.acoes || [])
      .map(
        (ac: any, i: number) =>
          `${i + 1}. ${ac.prioridade ? `**[${String(ac.prioridade).toUpperCase()}]** ` : ''}${ac.texto}${
            ac.impacto ? ` — _${ac.impacto}_` : ''
          }`
      )
      .join('\n');
    parts.push(`### 🧭 Diagnóstico de media buying

${d.resumo || ''}

**Vazamentos:**
${vaz || '_(nenhum)_'}

**Ações priorizadas:**
${aco || '_(nenhuma)_'}`);
  }

  // --- Plano de Otimização ---
  const p = b.plan;
  if (p && (p.resumo || p.nova_campanha || p.execucao)) {
    const secoes: string[] = [`## 🚀 Plano de Otimização do Agente — v1 (duplicar + ajustar)`];
    if (p.resumo) secoes.push(p.resumo);

    const nc = p.nova_campanha;
    if (nc) {
      secoes.push(`**Nova campanha:** ${nc.nome_sugerido || ''}  ·  **Objetivo:** ${
        nc.objetivo_meta || ''
      }  ·  **Budget/dia:** ${money0(nc.daily_budget_reais)}`);
      if (Array.isArray(nc.ajustes) && nc.ajustes.length) {
        secoes.push(
          '**Ajustes:**\n' +
            nc.ajustes
              .map((aj: any) => `- **${aj.campo}:** ${aj.de} → ${aj.para} — ${aj.motivo}`)
              .join('\n')
        );
      }
    }

    const ex = p.execucao || {};
    const seg = ex.segmentacao;
    const pos = ex.posicionamentos;
    const cortes = Array.isArray(ex.conjuntos_pausar) ? ex.conjuntos_pausar : [];
    if (seg && (seg.idade_min || seg.idade_max || seg.generos?.length)) {
      const g = (seg.generos || [])
        .map((x: string) => (x === 'male' ? 'homens' : x === 'female' ? 'mulheres' : x))
        .join(' + ');
      secoes.push(`**Realocação — público:** ${seg.idade_min || '?'}–${seg.idade_max || '?'}${
        g ? ` · ${g}` : ''
      }${seg.motivo ? `  (${seg.motivo})` : ''}`);
    }
    if (pos && (pos.facebook_positions?.length || pos.instagram_positions?.length)) {
      const all = [...(pos.facebook_positions || []), ...(pos.instagram_positions || [])].join(', ');
      secoes.push(`**Realocação — posicionamentos:** ${all}${pos.motivo ? `  (${pos.motivo})` : ''}`);
    }
    if (cortes.length) {
      secoes.push(
        `**Conjuntos que NÃO serão duplicados (${cortes.length}):**\n` +
          cortes.map((c: any) => `- ✕ ${c.nome} — ${c.motivo}`).join('\n')
      );
    }
    if (p.racional_80x10x10) secoes.push(`**Racional 80×10×10:** ${p.racional_80x10x10}`);
    if (p.riscos) secoes.push(`**Riscos (48h):** ${p.riscos}`);
    parts.push(secoes.join('\n\n'));
  }

  return parts.join('\n\n---\n\n') + '\n';
}

interface SavedDiagnostic {
  meta_campaign_id: string;
  campaign_nome: string;
  gargalo: string;
  diagnostico: string;
  recomendacoes: unknown[];
  prioridade: string;
  salvo_em: string;
}

async function readFileSafe(): Promise<SavedDiagnostic[]> {
  try {
    const raw = await fs.readFile(FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return []; // arquivo ainda não existe
  }
}

/** Salva a análise de IA de uma campanha: no arquivo .md do projeto e no Supabase (best-effort). */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'JSON inválido.' }, { status: 400 });
  }

  const { meta_campaign_id, campaign_nome, gargalo, diagnostico, recomendacoes, prioridade } = body || {};
  if (!meta_campaign_id || !diagnostico) {
    return NextResponse.json(
      { success: false, error: 'meta_campaign_id e diagnostico são obrigatórios.' },
      { status: 400 }
    );
  }

  const record: SavedDiagnostic = {
    meta_campaign_id: String(meta_campaign_id),
    campaign_nome: campaign_nome ?? '',
    gargalo: gargalo ?? 'nenhum',
    diagnostico: String(diagnostico),
    recomendacoes: Array.isArray(recomendacoes) ? recomendacoes : [],
    prioridade: prioridade ?? 'media',
    salvo_em: new Date().toISOString(),
  };

  // 1) Arquivos no projeto (pasta analises-ia/):
  //    - diagnosticos.json: todas as análises (upsert por campanha)
  //    - <campanha>_<id>.md: análise legível COMPLETA, arrastável para o chat
  let fileOk = false;
  let fileError: string | undefined;
  let mdFile: string | undefined;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });

    const list = await readFileSafe();
    const idx = list.findIndex((d) => d.meta_campaign_id === record.meta_campaign_id);
    if (idx >= 0) list[idx] = record;
    else list.push(record);
    await fs.writeFile(FILE_PATH, JSON.stringify(list, null, 2), 'utf8');

    const nome = slugify(record.campaign_nome) || 'campanha';
    mdFile = `${nome}_${record.meta_campaign_id}.md`;
    await fs.writeFile(path.join(DATA_DIR, mdFile), buildFullMarkdown(body, record.salvo_em), 'utf8');

    fileOk = true;
  } catch (e: any) {
    fileError = e?.message || 'Falha ao gravar o arquivo.';
  }

  // 2) Supabase (meta_ai_diagnostics) via service-role — histórico persistente (best-effort).
  let supabaseOk = false;
  let supabaseError: string | undefined;
  try {
    const { error } = await supabaseServer.from('meta_ai_diagnostics').insert({
      data: new Date().toISOString().slice(0, 10), // coluna date
      meta_campaign_id: record.meta_campaign_id,
      gargalo: record.gargalo,
      diagnostico: record.diagnostico,
      recomendacoes: record.recomendacoes,
      prioridade: record.prioridade,
    });
    if (error) supabaseError = error.message; // ex.: coluna inexistente => segue só com o arquivo
    else supabaseOk = true;
  } catch (e: any) {
    supabaseError = e?.message || 'Falha ao inserir no Supabase.';
  }

  // Sucesso se ao menos o arquivo foi salvo.
  return NextResponse.json({
    success: fileOk || supabaseOk,
    file: fileOk,
    fileError,
    mdFile,
    supabase: supabaseOk,
    supabaseError,
  });
}
