export function getPerformanceColor(value: number, target: number, inverse: boolean = false) {
  // If inverse is true, lower is better (like CPA)
  const ratio = value / target;
  
  if (inverse) {
    if (value <= target) return 'text-green-500';
    if (ratio <= 1.3) return 'text-yellow-500'; // up to 30% over target
    return 'text-red-500';
  } else {
    if (ratio >= 1.0) return 'text-green-500';
    if (ratio >= 0.7) return 'text-yellow-500'; // 70-99% of target
    return 'text-red-500';
  }
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'escalavel':
      return 'bg-green-500/20 text-green-500 border border-green-500/20';
    case 'otimizar':
      return 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/20';
    case 'nao_escalar':
      return 'bg-red-500/20 text-red-500 border border-red-500/20';
    default:
      return 'bg-gray-500/20 text-gray-500 border border-gray-500/20';
  }
}
