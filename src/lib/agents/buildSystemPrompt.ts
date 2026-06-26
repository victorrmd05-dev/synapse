// src/lib/agents/buildSystemPrompt.ts
//
// Monta o system prompt final de um agente concatenando o conteúdo
// sincronizado do GitHub (agentes_config), na ordem certa de contexto:
// SOUL (quem ele é) -> AGENTS (o que faz e como colabora) ->
// TOOLS (como operar ferramentas) -> SKILL (técnica específica) ->
// HEARTBEAT (gatilhos autônomos, relevante sobretudo pro CEO/CTO).
//
// Uso:
//   const config = await getAgentConfig('copywriting');
//   const systemPrompt = buildSystemPrompt(config);

import { supabaseServer as supabase } from '@/lib/supabase-server';

export interface AgentConfig {
  slug: string;
  nome: string;
  agents_md: string | null;
  soul_md: string | null;
  heartbeat_md: string | null;
  tools_md: string | null;
  skill_md: string | null;
  modelo: string;
  max_tokens: number;
  ativo: boolean;
  ultimo_sync_em: string | null;
}

export async function getAgentConfig(slug: string): Promise<AgentConfig | null> {
  const { data, error } = await supabase
    .from('agentes_config')
    .select('*')
    .eq('slug', slug)
    .eq('ativo', true)
    .single();

  if (error || !data) return null;
  return data as AgentConfig;
}

export function buildSystemPrompt(config: AgentConfig): string {
  const partes: string[] = [];

  if (!config.agents_md && !config.skill_md) {
    // Sem conteúdo sincronizado ainda — aviso explícito em vez de
    // mandar um prompt vazio pra Anthropic sem ninguém perceber.
    return `[ATENÇÃO: agente "${config.nome}" ainda não foi sincronizado do GitHub. Rode a sincronização em /configuracoes antes de usar este agente.]`;
  }

  if (config.soul_md) {
    partes.push('## Personalidade e Valores\n' + config.soul_md);
  }
  if (config.agents_md) {
    partes.push('## Papel e Fluxo de Trabalho\n' + config.agents_md);
  }
  if (config.tools_md) {
    partes.push('## Ferramentas Disponíveis\n' + config.tools_md);
  }
  if (config.skill_md) {
    partes.push('## Skill Especializada\n' + config.skill_md);
  }
  if (config.heartbeat_md) {
    partes.push('## Gatilhos Autônomos (referência, não aplicável a esta chamada pontual)\n' + config.heartbeat_md);
  }

  return partes.join('\n\n---\n\n');
}
