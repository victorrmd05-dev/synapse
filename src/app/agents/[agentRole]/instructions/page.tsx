import React from 'react';
import { getAgentFiles } from '@/app/actions/agentFiles';
import FileEditor from '@/components/agents/FileEditor';

export default async function AgentInstructionsPage({
  params,
}: {
  params: { agentRole: string };
}) {
  // Fetch existing files from DB
  const agentFiles = await getAgentFiles(params.agentRole);

  return (
    <div className="absolute inset-0">
      <FileEditor agentRole={params.agentRole} initialFiles={agentFiles || []} />
    </div>
  );
}
