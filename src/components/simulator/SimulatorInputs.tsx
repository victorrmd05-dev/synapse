import React from 'react';

interface SimulatorInputsProps {
  values: {
    orcamento: number;
    ctr_sim: number;
    connect_rate_sim: number;
    conversao_lp_sim: number;
    conversao_checkout_sim: number;
    ticket_medio: number;
    margem_produto: number;
  };
  onChange: (key: string, value: number) => void;
}

export function SimulatorInputs({ values, onChange }: SimulatorInputsProps) {
  const inputs = [
    { key: 'orcamento', label: 'Orçamento Diário (R$)', min: 100, max: 10000, step: 100, isCurrency: true },
    { key: 'ctr_sim', label: 'CTR (%)', min: 0.5, max: 8, step: 0.1 },
    { key: 'connect_rate_sim', label: 'Connect Rate (%)', min: 20, max: 100, step: 1 },
    { key: 'conversao_lp_sim', label: 'Conversão LP (%)', min: 1, max: 40, step: 0.5 },
    { key: 'conversao_checkout_sim', label: 'Conversão Checkout (%)', min: 1, max: 60, step: 0.5 },
    { key: 'ticket_medio', label: 'Ticket Médio (R$)', min: 30, max: 1000, step: 5, isCurrency: true },
    { key: 'margem_produto', label: 'Margem do Produto (%)', min: 10, max: 90, step: 1 },
  ];

  return (
    <div className="bg-[#1A1A24] border border-[#2A2A38] rounded-xl p-6">
      <h3 className="text-[#F1F1F3] font-medium text-lg mb-6">Parâmetros de Simulação</h3>
      
      <div className="space-y-6">
        {inputs.map((input) => {
          const isPercentageVal = (input.key.includes('sim') && !input.key.includes('ctr')) || input.key === 'margem_produto';
          const rawValue = values[input.key as keyof typeof values];
          const displayValue = isPercentageVal ? rawValue * 100 : rawValue;

          return (
            <div key={input.key}>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-[#8B8BA0]">{input.label}</label>
                <span className="text-sm font-medium text-[#F1F1F3]">
                  {input.isCurrency ? 'R$ ' : ''}
                  {displayValue.toFixed(input.step < 1 ? 1 : 0)}
                  {!input.isCurrency ? '%' : ''}
                </span>
              </div>
              <input
                type="range"
                min={input.min}
                max={input.max}
                step={input.step}
                value={displayValue}
                onChange={(e) => {
                  let val = parseFloat(e.target.value);
                  if (isPercentageVal) {
                    val = val / 100;
                  }
                  onChange(input.key, val);
                }}
                className="w-full h-1 bg-[#2A2A38] rounded-lg appearance-none cursor-pointer accent-[#6366F1]"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
