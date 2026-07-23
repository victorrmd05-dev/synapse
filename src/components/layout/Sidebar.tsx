"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { 
  LayoutDashboard, 
  Search, 
  PenTool, 
  CheckSquare, 
  Monitor, 
  Video, 
  BarChart, 
  Settings, 
  HelpCircle,
  Layers,
  ChevronDown,
  ChevronRight,
  Megaphone,
  Calculator,
  Bot,
  Radar,
  LayoutTemplate
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const [metaAdsOpen, setMetaAdsOpen] = useState(pathname.startsWith('/meta-ads'));

  const isMetaAdsActive = pathname.startsWith('/meta-ads');

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[240px] bg-[#0F0F13] border-r border-[#2A2A38] p-5 flex flex-col z-50">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg">
            A
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight tracking-tight">Alavanca AI</h1>
            <p className="text-secondary text-[10px] uppercase tracking-wider font-semibold">Command Center</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto pr-2 custom-scrollbar">
        <Link 
          href="/" 
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            pathname === '/' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-secondary hover:text-white hover:bg-surface'
          }`}
        >
          <LayoutDashboard size={18} />
          Visão Geral
        </Link>
        <Link 
          href="/mineracao" 
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            pathname === '/mineracao' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-secondary hover:text-white hover:bg-surface'
          }`}
        >
          <Search size={18} />
          Mineração
        </Link>
        <Link 
          href="/producao" 
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            pathname === '/producao' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-secondary hover:text-white hover:bg-surface'
          }`}
        >
          <Layers size={18} />
          Produção
        </Link>
        <Link 
          href="/copywriting" 
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            pathname === '/copywriting' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-secondary hover:text-white hover:bg-surface'
          }`}
        >
          <PenTool size={18} />
          Copywriting
        </Link>
        <Link 
          href="/revisor" 
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            pathname === '/revisor' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-secondary hover:text-white hover:bg-surface'
          }`}
        >
          <CheckSquare size={18} />
          Revisor
        </Link>
        <Link 
          href="/design" 
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            pathname === '/design' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-secondary hover:text-white hover:bg-surface'
          }`}
        >
          <Monitor size={18} />
          Design/Webmaster
        </Link>
        <Link
          href="/paginas"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            pathname === '/paginas' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-secondary hover:text-white hover:bg-surface'
          }`}
        >
          <LayoutTemplate size={18} />
          Páginas
        </Link>
        <Link 
          href="/video-maker" 
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            pathname === '/video-maker' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-secondary hover:text-white hover:bg-surface'
          }`}
        >
          <Video size={18} />
          Video Maker
        </Link>
        <Link
          href="/tracking"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            pathname === '/tracking' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-secondary hover:text-white hover:bg-surface'
          }`}
        >
          <Radar size={18} />
          Tracking
        </Link>

        {/* Gestor Meta Ads (Submenu) */}
        <div className="pt-2">
          <button 
            onClick={() => setMetaAdsOpen(!metaAdsOpen)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isMetaAdsActive ? 'bg-primary/5 text-primary' : 'text-secondary hover:text-white hover:bg-surface'
            }`}
          >
            <div className="flex items-center gap-3">
              <BarChart size={18} className={isMetaAdsActive ? 'text-primary' : ''} />
              Gestor Meta Ads
            </div>
            {metaAdsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          
          {metaAdsOpen && (
            <div className="mt-1 ml-4 pl-4 border-l border-surface-elevated space-y-1.5">
              <Link 
                href="/meta-ads/dashboard" 
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  pathname === '/meta-ads/dashboard' ? 'bg-primary/10 text-primary' : 'text-secondary hover:text-white hover:bg-surface'
                }`}
              >
                <LayoutDashboard size={16} />
                Dashboard
              </Link>
              <Link 
                href="/meta-ads/campanhas" 
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  pathname === '/meta-ads/campanhas' ? 'bg-primary/10 text-primary' : 'text-secondary hover:text-white hover:bg-surface'
                }`}
              >
                <Megaphone size={16} />
                Campanhas
              </Link>
              <Link 
                href="/meta-ads/simulador" 
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  pathname === '/meta-ads/simulador' ? 'bg-primary/10 text-primary' : 'text-secondary hover:text-white hover:bg-surface'
                }`}
              >
                <Calculator size={16} />
                Simulador
              </Link>
            </div>
          )}
        </div>
      </nav>

      <div className="mt-auto space-y-4 pt-4 border-t border-surface-elevated">
        <div className="space-y-1">
          <Link href="/configuracoes" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === '/configuracoes' ? 'text-white bg-surface' : 'text-secondary hover:text-white hover:bg-surface'}`}>
            <Settings size={18} />
            Configurações
          </Link>
          <Link href="/agents" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname.startsWith('/agents') ? 'text-white bg-surface' : 'text-secondary hover:text-white hover:bg-surface'}`}>
            <Bot size={18} />
            Agents Config
          </Link>
          <Link href="/suporte" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-secondary hover:text-white hover:bg-surface transition-colors">
            <HelpCircle size={18} />
            Suporte
          </Link>
        </div>
      </div>
    </aside>
  );
}
