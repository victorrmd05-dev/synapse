"use client";

import { useState } from "react";

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState("api_agentes");

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Configurações do Ecossistema</h1>
          <p className="text-secondary mt-1 text-sm">Gerencie chaves de API, banco de dados e integrações da Alavanca AI.</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Sidebar Settings */}
        <div className="col-span-3">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setActiveTab("api_agentes")}
              className={`text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "api_agentes" ? "bg-primary text-white" : "text-secondary hover:bg-surface-elevated hover:text-white"
              }`}
            >
              Chaves de API (Agentes)
            </button>
            <button
              onClick={() => setActiveTab("api_meta_ads")}
              className={`text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "api_meta_ads" ? "bg-primary text-white" : "text-secondary hover:bg-surface-elevated hover:text-white"
              }`}
            >
              Chaves Meta Ads
            </button>
            <button
              onClick={() => setActiveTab("database")}
              className={`text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "database" ? "bg-primary text-white" : "text-secondary hover:bg-surface-elevated hover:text-white"
              }`}
            >
              Supabase / Banco de Dados
            </button>
            <button
              onClick={() => setActiveTab("telegram")}
              className={`text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "telegram" ? "bg-primary text-white" : "text-secondary hover:bg-surface-elevated hover:text-white"
              }`}
            >
              Alertas (Telegram)
            </button>
          </div>
        </div>

        {/* Content Settings */}
        <div className="col-span-9 space-y-6">
          {activeTab === "api_agentes" && (
            <div className="bg-surface border border-surface-elevated rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-6">Chaves de API dos Agentes (IA)</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Anthropic API Key (Claude)</label>
                  <input 
                    type="password" 
                    placeholder="sk-ant-..." 
                    className="w-full bg-[#0F0F13] border border-surface-elevated rounded-md px-4 py-2 text-text-primary text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                  <p className="text-xs text-secondary mt-2">Usado pelo Minerador, Copywriter e Revisor.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-2">OpenAI API Key (ChatGPT)</label>
                  <input 
                    type="password" 
                    placeholder="sk-..." 
                    className="w-full bg-[#0F0F13] border border-surface-elevated rounded-md px-4 py-2 text-text-primary text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-2">OpenCode / Outros Modelos</label>
                  <input 
                    type="password" 
                    placeholder="Chave opcional para modelos adicionais" 
                    className="w-full bg-[#0F0F13] border border-surface-elevated rounded-md px-4 py-2 text-text-primary text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-surface-elevated flex justify-end">
                <button className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-md text-sm font-medium transition-colors">
                  Salvar Alterações (.env)
                </button>
              </div>
            </div>
          )}

          {activeTab === "api_meta_ads" && (
            <div className="bg-surface border border-surface-elevated rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-6">Chaves de Integração - Meta Ads</h2>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Meta App ID</label>
                    <input 
                      type="text" 
                      defaultValue="2541976782925694" 
                      className="w-full bg-[#0F0F13] border border-surface-elevated rounded-md px-4 py-2 text-text-primary text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Meta App Secret</label>
                    <input 
                      type="password" 
                      placeholder="••••••••••••••••••••••••••••" 
                      className="w-full bg-[#0F0F13] border border-surface-elevated rounded-md px-4 py-2 text-text-primary text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Meta Access Token</label>
                  <input 
                    type="password" 
                    placeholder="EAAk..." 
                    className="w-full bg-[#0F0F13] border border-surface-elevated rounded-md px-4 py-2 text-text-primary text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                  <p className="text-xs text-status-green mt-2 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-status-green animate-pulse"></span> Token Válido e Conectado (Gestão de Ads)
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Ad Account ID (Default)</label>
                  <input 
                    type="text" 
                    placeholder="act_1234567890" 
                    className="w-full bg-[#0F0F13] border border-surface-elevated rounded-md px-4 py-2 text-text-primary text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-surface-elevated flex justify-end">
                <button className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-md text-sm font-medium transition-colors">
                  Salvar Alterações (.env)
                </button>
              </div>
            </div>
          )}

          {activeTab === "database" && (
            <div className="bg-surface border border-surface-elevated rounded-xl p-6">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-semibold text-white">Conexão Supabase Realtime</h2>
                <span className="px-3 py-1 bg-status-green/10 text-status-green border border-status-green/20 rounded-full text-xs font-semibold tracking-wide flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-green"></span> SINCRONIZADO
                </span>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Project URL (REST & Realtime)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      defaultValue="https://rjecarrfysfcnebmvvdj.supabase.co" 
                      className="w-full bg-[#0F0F13] border border-surface-elevated rounded-md px-4 py-2 text-text-primary text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Anon Public Key</label>
                  <input 
                    type="password" 
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
                    className="w-full bg-[#0F0F13] border border-surface-elevated rounded-md px-4 py-2 text-text-primary text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="pt-4 border-t border-surface-elevated">
                  <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Direct Connection String (PostgreSQL)</span>
                    <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded uppercase">DANGER ZONE</span>
                  </label>
                  <input 
                    type="password" 
                    defaultValue="postgresql://postgres:********@db.rjecarrfysfcnebmvvdj.supabase.co:5432/postgres" 
                    className="w-full bg-[#0F0F13] border border-red-900/30 rounded-md px-4 py-2 text-text-primary text-sm focus:outline-none focus:border-red-500 transition-colors"
                  />
                  <p className="text-xs text-status-yellow mt-2">A conexão direta PostgreSQL é usada apenas internamente pelos agentes. O Frontend utiliza as chaves Anon para assinar os canais WebSockets.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "telegram" && (
            <div className="bg-surface border border-surface-elevated rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-6">Central de Operações (Telegram)</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Bot Token (Alavanca Operations)</label>
                  <input 
                    type="password" 
                    placeholder="123456789:AAH..." 
                    className="w-full bg-[#0F0F13] border border-surface-elevated rounded-md px-4 py-2 text-text-primary text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Chat ID (Grupo de Alertas)</label>
                  <input 
                    type="text" 
                    placeholder="-1005199123225" 
                    className="w-full bg-[#0F0F13] border border-surface-elevated rounded-md px-4 py-2 text-text-primary text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
