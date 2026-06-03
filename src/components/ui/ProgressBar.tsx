import React from 'react';

interface ProgressBarProps {
  label: string;
  value: number; // current percentage value (0-100)
  target: number; // target percentage value (0-100)
}

export function ProgressBar({ label, value, target }: ProgressBarProps) {
  const ratio = value / target;
  
  let colorClass = 'bg-red-500';
  if (ratio >= 1.0) {
    colorClass = 'bg-green-500';
  } else if (ratio >= 0.7) {
    colorClass = 'bg-yellow-500';
  }

  const percentageStr = `${Math.min(100, Math.max(0, value)).toFixed(1)}%`;
  const targetStr = `${target}%`;

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-medium text-[#F1F1F3] uppercase tracking-wider">{label}</span>
        <div className="text-xs">
          <span className="text-[#F1F1F3] font-medium">{percentageStr}</span>
          <span className="text-[#8B8BA0] ml-1">/ Meta: {targetStr}</span>
        </div>
      </div>
      <div className="h-[6px] w-full bg-[#2A2A38] rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full ${colorClass} transition-all duration-500`} 
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}
