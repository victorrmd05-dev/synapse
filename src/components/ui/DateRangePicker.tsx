"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Calendar, Check, ChevronDown } from 'lucide-react';
import {
  RANGE_PRESETS,
  RangeSelection,
  isCustomValid,
  rangeLabel,
  todayISO,
} from '@/lib/date-range';

interface DateRangePickerProps {
  value: RangeSelection;
  onChange: (sel: RangeSelection) => void;
  /** Desabilita durante uma sincronização em andamento. */
  disabled?: boolean;
}

/**
 * Seletor de janela de data no padrão do Gerenciador de Anúncios:
 * presets (Hoje, Últimos 7/14/30 dias…) + Personalizado com datas De/Até.
 */
export function DateRangePicker({ value, onChange, disabled }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [since, setSince] = useState(value.since ?? '');
  const [until, setUntil] = useState(value.until ?? '');
  const ref = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Mantém os inputs custom em sincronia se a seleção mudar de fora.
  useEffect(() => {
    setSince(value.since ?? '');
    setUntil(value.until ?? '');
  }, [value.since, value.until]);

  const selectPreset = (id: RangeSelection['preset']) => {
    if (id === 'custom') return; // custom aplica pelo botão "Aplicar"
    onChange({ preset: id });
    setOpen(false);
  };

  const applyCustom = () => {
    if (!since || !until) return;
    // Garante ordem cronológica (De ≤ Até).
    const [a, b] = since <= until ? [since, until] : [until, since];
    onChange({ preset: 'custom', since: a, until: b });
    setOpen(false);
  };

  const today = todayISO();
  const isActive = (id: RangeSelection['preset']) =>
    value.preset === id && (id !== 'custom' || isCustomValid(value));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className="flex items-center gap-2 bg-[#1A1A24] border border-[#2A2A38] hover:border-[#6366F1]/50 text-[#F1F1F3] px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
      >
        <Calendar size={15} className="text-[#8B8BA0]" />
        <span>{rangeLabel(value)}</span>
        <ChevronDown
          size={14}
          className={`text-[#8B8BA0] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[300px] z-50 rounded-xl border border-[#2A2A38] bg-[#14141C] shadow-2xl shadow-black/50 p-2">
          <div className="max-h-[280px] overflow-y-auto">
            {RANGE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPreset(p.id)}
                className={`w-full flex items-start gap-2 text-left px-3 py-2 rounded-lg transition-colors ${
                  isActive(p.id)
                    ? 'bg-[#6366F1]/15 text-[#F1F1F3]'
                    : 'text-[#C7C7D1] hover:bg-[#1F1F2B]'
                }`}
              >
                <span className="w-4 pt-0.5 shrink-0">
                  {isActive(p.id) && <Check size={14} className="text-[#6366F1]" />}
                </span>
                <span className="flex flex-col">
                  <span className="text-[13px] font-medium">{p.label}</span>
                  <span className="text-[11px] text-[#6B6B7D]">{p.hint}</span>
                </span>
              </button>
            ))}
          </div>

          {/* Período personalizado */}
          <div className="mt-1 border-t border-[#2A2A38] pt-3 px-1 pb-1">
            <div className="flex items-center gap-2">
              <label className="flex flex-col gap-1 flex-1">
                <span className="text-[10px] uppercase tracking-wide text-[#6B6B7D]">De</span>
                <input
                  type="date"
                  value={since}
                  max={until || today}
                  onChange={(e) => setSince(e.target.value)}
                  className="bg-[#1A1A24] border border-[#2A2A38] rounded-md px-2 py-1.5 text-[12px] text-[#F1F1F3] outline-none focus:border-[#6366F1]"
                />
              </label>
              <label className="flex flex-col gap-1 flex-1">
                <span className="text-[10px] uppercase tracking-wide text-[#6B6B7D]">Até</span>
                <input
                  type="date"
                  value={until}
                  min={since || undefined}
                  max={today}
                  onChange={(e) => setUntil(e.target.value)}
                  className="bg-[#1A1A24] border border-[#2A2A38] rounded-md px-2 py-1.5 text-[12px] text-[#F1F1F3] outline-none focus:border-[#6366F1]"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={applyCustom}
              disabled={!since || !until}
              className="mt-2.5 w-full bg-[#6366F1] hover:bg-[#4f52e2] disabled:opacity-40 disabled:cursor-not-allowed text-white py-1.5 rounded-md text-[12px] font-medium transition-colors"
            >
              Aplicar período
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
