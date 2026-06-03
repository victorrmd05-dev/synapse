import React from 'react';

interface BadgeProps {
  status: 'escalavel' | 'otimizar' | 'nao_escalar' | string;
  className?: string;
  children?: React.ReactNode;
}

export function Badge({ status, className = '', children }: BadgeProps) {
  let bgColor = 'bg-gray-500/20';
  let textColor = 'text-gray-500';
  let borderColor = 'border-gray-500/20';

  if (status === 'escalavel' || status === 'alta') {
    bgColor = 'bg-green-500/20';
    textColor = 'text-green-500';
    borderColor = 'border-green-500/20';
  } else if (status === 'otimizar' || status === 'media') {
    bgColor = 'bg-yellow-500/20';
    textColor = 'text-yellow-500';
    borderColor = 'border-yellow-500/20';
  } else if (status === 'nao_escalar' || status === 'baixa') {
    bgColor = 'bg-red-500/20';
    textColor = 'text-red-500';
    borderColor = 'border-red-500/20';
  }

  const label = children || (status === 'nao_escalar' ? 'NÃO ESCALAR' : status.toUpperCase());

  return (
    <span
      className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded border ${bgColor} ${textColor} ${borderColor} ${className}`}
    >
      {label}
    </span>
  );
}
