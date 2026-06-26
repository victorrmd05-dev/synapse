'use server';

import { supabaseServer } from '@/lib/supabase-server';

export interface AgentConfig {
  agent_role: string;
  identity_config: any;
  model_config: any;
  environment_variables: any[];
  permissions_config: any;
}

export async function getAgentConfig(agentRole: string): Promise<AgentConfig | null> {
  const { data, error } = await supabaseServer
    .from('agent_configurations')
    .select('*')
    .eq('agent_role', agentRole)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching agent configuration:', error);
    return null;
  }

  return data as AgentConfig;
}

export async function saveAgentConfig(agentRole: string, configData: Partial<AgentConfig>) {
  const { data, error } = await supabaseServer
    .from('agent_configurations')
    .upsert(
      {
        agent_role: agentRole,
        identity_config: configData.identity_config || {},
        model_config: configData.model_config || {},
        environment_variables: configData.environment_variables || [],
        permissions_config: configData.permissions_config || {},
        updated_at: new Date().toISOString()
      },
      { onConflict: 'agent_role' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error saving agent configuration:', error);
    throw new Error('Failed to save configuration');
  }

  return data;
}
