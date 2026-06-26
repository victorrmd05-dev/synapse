'use server';

import { supabaseServer } from '@/lib/supabase-server';

export async function getAgentFiles(agentRole: string) {
  const { data, error } = await supabaseServer
    .from('agent_files')
    .select('*')
    .eq('agent_role', agentRole)
    .order('file_name');

  if (error) {
    console.error('Error fetching agent files:', error);
    return [];
  }

  return data;
}

export async function getAgentFile(agentRole: string, fileName: string) {
  const { data, error } = await supabaseServer
    .from('agent_files')
    .select('*')
    .eq('agent_role', agentRole)
    .eq('file_name', fileName)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is no rows returned
    console.error('Error fetching agent file:', error);
    return null;
  }

  return data;
}

export async function saveAgentFile(agentRole: string, fileName: string, content: string) {
  const { data, error } = await supabaseServer
    .from('agent_files')
    .upsert(
      {
        agent_role: agentRole,
        file_name: fileName,
        content: content,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'agent_role,file_name' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error saving agent file:', error);
    throw new Error('Failed to save file');
  }

  return data;
}
