'use client';

import React, { useState } from 'react';
import { saveAgentFile } from '@/app/actions/agentFiles';
import { FileText, Save, Plus, Copy, AlertCircle } from 'lucide-react';

interface AgentFile {
  id: string;
  file_name: string;
  content: string;
  updated_at: string;
}

interface FileEditorProps {
  agentRole: string;
  initialFiles: AgentFile[];
  defaultFiles?: string[];
}

export default function FileEditor({ agentRole, initialFiles, defaultFiles = ['AGENTS.md'] }: FileEditorProps) {
  const [files, setFiles] = useState<AgentFile[]>(initialFiles);
  const [activeFile, setActiveFile] = useState<string | null>(initialFiles[0]?.file_name || null);
  const [content, setContent] = useState<string>(initialFiles[0]?.content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const currentFile = files.find(f => f.file_name === activeFile);

  const handleSelectFile = (fileName: string) => {
    setActiveFile(fileName);
    const file = files.find(f => f.file_name === fileName);
    setContent(file ? file.content : '');
  };

  const handleSave = async () => {
    if (!activeFile) return;
    
    setIsSaving(true);
    try {
      const updatedFile = await saveAgentFile(agentRole, activeFile, content);
      
      setFiles(prev => {
        const exists = prev.some(f => f.file_name === activeFile);
        if (exists) {
          return prev.map(f => f.file_name === activeFile ? updatedFile : f);
        } else {
          return [...prev, updatedFile].sort((a, b) => a.file_name.localeCompare(b.file_name));
        }
      });
      
      // Show success briefly (you could use a toast library here)
      alert('Saved successfully!');
    } catch (error) {
      console.error('Error saving file:', error);
      alert('Failed to save file.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddFile = () => {
    if (!newFileName.trim()) return;
    
    // Se o usuário não digitou extensão, adiciona .md por padrão
    const finalName = newFileName.includes('.') ? newFileName : `${newFileName}.md`;
    
    if (files.some(f => f.file_name === finalName)) {
      alert('File already exists.');
      return;
    }

    const newFile: AgentFile = {
      id: 'temp-' + Date.now(),
      file_name: finalName,
      content: `# ${finalName.split('.')[0]}\n\n`,
      updated_at: new Date().toISOString()
    };

    setFiles(prev => [...prev, newFile].sort((a, b) => a.file_name.localeCompare(b.file_name)));
    setActiveFile(finalName);
    setContent(newFile.content);
    setIsAddingFile(false);
    setNewFileName('');
  };

  // Combine default files and existing files for the sidebar list
  const displayFiles = Array.from(new Set([...defaultFiles, ...files.map(f => f.file_name)])).sort();

  return (
    <div className="flex h-full bg-[#0a0a0a] text-white">
      {/* Sidebar: Files List */}
      <div className="w-64 border-r border-zinc-800 flex flex-col">
        <div className="p-4 flex items-center justify-between border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-300">Files</h2>
          <button 
            onClick={() => setIsAddingFile(true)}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
          >
            <Plus size={16} />
          </button>
        </div>

        {isAddingFile && (
          <div className="p-2 px-4 flex gap-2 border-b border-zinc-800">
            <input 
              type="text" 
              autoFocus
              placeholder="filename.md or script.py"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddFile()}
              className="bg-zinc-900 border border-zinc-700 text-sm text-white px-2 py-1 flex-1 rounded"
            />
            <button onClick={() => setIsAddingFile(false)} className="text-zinc-500 text-sm">Cancel</button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-2">
          {displayFiles.map(fileName => {
            const hasData = files.some(f => f.file_name === fileName);
            return (
              <button
                key={fileName}
                onClick={() => handleSelectFile(fileName)}
                className={`w-full text-left px-4 py-2 flex items-center justify-between group transition-colors ${
                  activeFile === fileName ? 'bg-zinc-800/50 text-white' : 'text-zinc-400 hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-center gap-2 text-sm">
                  <FileText size={14} className={activeFile === fileName ? 'text-purple-400' : 'text-zinc-500'} />
                  {fileName}
                </div>
                {!hasData && (
                  <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500 group-hover:text-zinc-400">
                    EMPTY
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Area: Editor */}
      <div className="flex-1 flex flex-col">
        {activeFile ? (
          <>
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-[#0e0e0e]">
              <div className="flex flex-col">
                <h2 className="text-lg font-semibold">{activeFile}</h2>
                <span className="text-xs text-zinc-500">
                  {activeFile.endsWith('.py') ? 'python script' : 'markdown file'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  className="p-2 hover:bg-zinc-800 rounded text-zinc-400 transition-colors"
                  title="Copy content"
                  onClick={() => navigator.clipboard.writeText(content)}
                >
                  <Copy size={18} />
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  <Save size={16} />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
            
            <div className="flex-1 p-4 bg-[#111111]">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-full bg-transparent text-zinc-300 font-mono text-sm resize-none focus:outline-none placeholder-zinc-700"
                placeholder={`Type content for ${activeFile} here...`}
                spellCheck="false"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
            <AlertCircle size={48} className="mb-4 opacity-20" />
            <p>Select a file to edit or create a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
