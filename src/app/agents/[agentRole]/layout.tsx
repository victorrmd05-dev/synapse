'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, Play, Pause, PowerOff } from 'lucide-react';

const TABS = [
  { id: 'instructions', label: 'Instructions', href: (role: string) => `/agents/${role}/instructions` },
  { id: 'skills', label: 'Skills', href: (role: string) => `/agents/${role}/skills` },
  { id: 'configuration', label: 'Configuration', href: (role: string) => `/agents/${role}/configuration` },
];

export default function AgentDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { agentRole: string };
}) {
  const pathname = usePathname();
  const agentName = params.agentRole.toUpperCase(); // We could map this to a prettier name later

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Top Header */}
      <header className="px-8 pt-8 pb-4 flex flex-col gap-6 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center">
              <Bot className="text-zinc-300" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">{agentName}</h1>
              <p className="text-zinc-400 text-sm capitalize">{params.agentRole}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-sm font-medium border border-zinc-700 hover:border-zinc-600 rounded-md bg-transparent text-white transition-colors flex items-center gap-2">
              <span className="text-lg">+</span> Assign Task
            </button>
            <button className="px-4 py-2 text-sm font-medium border border-zinc-700 hover:border-zinc-600 rounded-md bg-transparent text-white transition-colors flex items-center gap-2">
              <Play size={14} /> Run Heartbeat
            </button>
            <button className="px-4 py-2 text-sm font-medium border border-zinc-700 hover:border-zinc-600 rounded-md bg-transparent text-white transition-colors flex items-center gap-2">
              <Pause size={14} /> Pause
            </button>
            <div className="px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900 text-xs text-zinc-400 ml-2">
              idle
            </div>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex gap-6">
          {TABS.map((tab) => {
            const href = tab.href(params.agentRole);
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={tab.id}
                href={href}
                className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
                  isActive 
                    ? 'border-white text-white' 
                    : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden relative">
        {children}
      </div>
    </div>
  );
}
