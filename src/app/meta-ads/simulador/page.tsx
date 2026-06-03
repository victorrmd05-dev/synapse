"use client";

import React, { useState, useMemo } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { SimulatorInputs } from '@/components/simulator/SimulatorInputs';
import { SimulatorResults } from '@/components/simulator/SimulatorResults';
import { simulateScale } from '@/lib/calc-8010x10';

export default function SimulatorPage() {
  const [params, setParams] = useState({
    orcamento: 1000,
    ctr_sim: 2.0,
    connect_rate_sim: 0.80, // 80%
    conversao_lp_sim: 0.10, // 10%
    conversao_checkout_sim: 0.10, // 10%
    ticket_medio: 150,
    margem_produto: 0.40, // 40%
  });

  const [isSaving, setIsSaving] = useState(false);

  const results = useMemo(() => {
    return simulateScale({
      ...params,
      cpc_base: 1.85, // Default/Mock base cpc
    });
  }, [params]);

  const handleChange = (key: string, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSimulation = async () => {
    setIsSaving(true);
    // Simulação de salvar POST /api/simulations
    setTimeout(() => {
      setIsSaving(false);
      alert('Simulação salva com sucesso!');
    }, 800);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <TopBar 
        title="Simulador de Escala" 
        subtitle="Projete cenários e valide a viabilidade antes de escalar o orçamento." 
      />

      <div className="flex justify-end mb-6">
        <button
          onClick={handleSaveSimulation}
          disabled={isSaving}
          className="bg-[#2A2A38] hover:bg-[#343446] text-[#F1F1F3] px-6 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {isSaving ? 'Salvando...' : 'Salvar Simulação'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-8">
        <SimulatorInputs values={params} onChange={handleChange} />
        <SimulatorResults results={results} />
      </div>
    </div>
  );
}
