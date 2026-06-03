import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  valueClassName?: string;
}

export function MetricCard({ label, value, valueClassName = 'text-[#F1F1F3]' }: MetricCardProps) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-[#8B8BA0] uppercase tracking-wider mb-1">{label}</span>
      <span className={`text-[14px] font-medium ${valueClassName}`}>{value}</span>
    </div>
  );
}
