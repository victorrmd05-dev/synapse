import React from 'react';
import { RefreshCw } from 'lucide-react';

interface TopBarProps {
  title: string;
  subtitle: string;
  onSync?: () => void;
  isSyncing?: boolean;
}

export function TopBar({ title, subtitle, onSync, isSyncing }: TopBarProps) {
  return (
    <header className="flex items-center justify-between pb-6 border-b border-[#2A2A38] mb-6">
      <div>
        <h2 className="text-xl font-medium text-[#F1F1F3]">{title}</h2>
        <p className="text-sm text-[#8B8BA0] mt-1">{subtitle}</p>
      </div>
      
      {onSync && (
        <button 
          onClick={onSync}
          disabled={isSyncing}
          className="flex items-center gap-2 bg-[#6366F1] hover:bg-[#4f52e2] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
          Sync Data
        </button>
      )}
    </header>
  );
}
