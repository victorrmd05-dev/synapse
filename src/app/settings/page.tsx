"use client";

import React, { useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';

export default function SettingsPage() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false); // mock state

  const handleConnect = async () => {
    setIsConnecting(true);
    // Simula redirect OAuth Facebook Login
    setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <TopBar 
        title="Configurações" 
        subtitle="Gerencie integrações e configurações da sua conta." 
      />

      <div className="bg-[#1A1A24] border border-[#2A2A38] rounded-xl p-6">
        <h3 className="text-[#F1F1F3] font-medium mb-2">Integração Meta Ads</h3>
        <p className="text-sm text-[#8B8BA0] mb-6">
          Conecte sua conta do Facebook para importar contas de anúncios e campanhas automaticamente.
        </p>

        <div className="flex items-center justify-between p-4 bg-[#0F0F13] border border-[#2A2A38] rounded-lg">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded bg-[#1877F2] flex items-center justify-center text-white font-bold text-xl">
              f
            </div>
            <div>
              <p className="text-[#F1F1F3] font-medium">Facebook Marketing API</p>
              <p className="text-xs text-[#8B8BA0]">
                {isConnected ? 'Conectado como DropMaster' : 'Não conectado'}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleConnect}
            disabled={isConnecting || isConnected}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isConnected 
                ? 'bg-[#2A2A38] text-[#8B8BA0] cursor-not-allowed' 
                : 'bg-[#1877F2] hover:bg-[#166fe5] text-white'
            }`}
          >
            {isConnecting ? 'Conectando...' : isConnected ? 'Conectado' : 'Conectar Conta'}
          </button>
        </div>
      </div>
    </div>
  );
}
