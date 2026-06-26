'use client';

import React, { useState } from 'react';
import { AgentConfig, saveAgentConfig } from '@/app/actions/agentConfig';
import { Save, Plus, Trash2, Key } from 'lucide-react';

interface ConfigurationFormProps {
  agentRole: string;
  initialConfig: AgentConfig | null;
}

const PROVIDERS = ['OpenAI', 'Anthropic', 'Gemini', 'OpenRouter', 'Local'];

export default function ConfigurationForm({ agentRole, initialConfig }: ConfigurationFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  
  // Model state
  const [provider, setProvider] = useState(initialConfig?.model_config?.provider || 'OpenRouter');
  const [primaryModel, setPrimaryModel] = useState(initialConfig?.model_config?.primaryModel || '');
  const [thinkingEffort, setThinkingEffort] = useState(initialConfig?.model_config?.thinkingEffort || 'Auto');

  // Environment Variables state
  const [envVars, setEnvVars] = useState<any[]>(initialConfig?.environment_variables || []);

  const handleAddEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '', type: 'Secret' }]);
  };

  const handleUpdateEnvVar = (index: number, field: string, value: string) => {
    const newVars = [...envVars];
    newVars[index][field] = value;
    setEnvVars(newVars);
  };

  const handleRemoveEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const configData: Partial<AgentConfig> = {
        model_config: { provider, primaryModel, thinkingEffort },
        environment_variables: envVars,
      };
      
      await saveAgentConfig(agentRole, configData);
      alert('Configuration saved successfully!');
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 pb-24 overflow-y-auto h-full text-zinc-300">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-white">Configuration</h2>
          <p className="text-sm text-zinc-500 mt-1">Configure identity, models, and environment keys for this agent.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-zinc-200 transition-colors disabled:opacity-50"
        >
          <Save size={16} />
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      <div className="space-y-10">
        {/* MODEL SECTION */}
        <section>
          <h3 className="text-lg font-semibold text-white mb-4 border-b border-zinc-800 pb-2">Model Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Provider</label>
              <select value={provider} onChange={e => setProvider(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600">
                {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Primary Model</label>
              <input type="text" value={primaryModel} onChange={e => setPrimaryModel(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600" placeholder="e.g. gpt-4o, claude-3-5-sonnet-20240620, deepseek-coder" />
            </div>
          </div>
        </section>

        {/* ENVIRONMENT VARIABLES */}
        <section>
          <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-2">
            <h3 className="text-lg font-semibold text-white">Environment Variables & Keys</h3>
            <button onClick={handleAddEnvVar} className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300">
              <Plus size={14} /> Add Variable
            </button>
          </div>
          <p className="text-xs text-zinc-500 mb-4">Set API keys (e.g. Supabase, ScrapingBee, OpenAI) required by this agent. Use &quot;Secret&quot; for sensitive keys.</p>
          
          <div className="space-y-3">
            {envVars.map((env, index) => (
              <div key={index} className="flex items-center gap-2">
                <select 
                  value={env.type} 
                  onChange={e => handleUpdateEnvVar(index, 'type', e.target.value)} 
                  className="bg-zinc-900 border border-zinc-800 rounded px-2 py-2 text-xs text-zinc-400 w-24 focus:outline-none"
                >
                  <option value="Secret">Secret</option>
                  <option value="Plain">Plain</option>
                </select>
                <input 
                  type="text" 
                  placeholder="KEY_NAME (e.g. OPENAI_API_KEY)" 
                  value={env.key} 
                  onChange={e => handleUpdateEnvVar(index, 'key', e.target.value)} 
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 font-mono" 
                />
                <input 
                  type={env.type === 'Secret' ? 'password' : 'text'} 
                  placeholder="Value" 
                  value={env.value} 
                  onChange={e => handleUpdateEnvVar(index, 'value', e.target.value)} 
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 font-mono" 
                />
                <button onClick={() => handleRemoveEnvVar(index)} className="p-2 text-zinc-600 hover:text-red-400 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {envVars.length === 0 && (
              <div className="text-center py-6 bg-zinc-900/30 border border-zinc-800 border-dashed rounded text-zinc-600 text-sm">
                No environment variables set.
              </div>
            )}
          </div>
        </section>
        
      </div>
    </div>
  );
}
