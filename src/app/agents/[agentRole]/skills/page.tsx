import React from 'react';
import { getAgentFiles } from '@/app/actions/agentFiles';
import FileEditor from '@/components/agents/FileEditor';

export default async function AgentSkillsPage({
  params,
}: {
  params: { agentRole: string };
}) {
  // Fetch existing files from DB
  const agentFiles = await getAgentFiles(params.agentRole);

  // We filter out AGENTS.md, SOUL.md, etc., if we wanted to only show skills.
  // But since the DB table stores all files, we'll just show them all, 
  // or maybe filter by defaultFiles. The user just asked for the page to be like instructions but with SKILLS.md.
  // Let's just use SKILLS.md as the default file for this view.
  
  return (
    <div className="absolute inset-0">
      <FileEditor 
        agentRole={params.agentRole} 
        initialFiles={agentFiles || []} 
        defaultFiles={['SKILLS.md']}
      />
    </div>
  );
}
