import React from 'react';
import { getAgentConfig } from '@/app/actions/agentConfig';
import ConfigurationForm from '@/components/agents/ConfigurationForm';

export default async function AgentConfigurationPage({
  params,
}: {
  params: { agentRole: string };
}) {
  const initialConfig = await getAgentConfig(params.agentRole);

  return (
    <div className="absolute inset-0 bg-[#0a0a0a]">
      <ConfigurationForm agentRole={params.agentRole} initialConfig={initialConfig} />
    </div>
  );
}
