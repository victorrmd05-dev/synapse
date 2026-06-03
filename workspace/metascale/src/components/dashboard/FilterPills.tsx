import React from 'react';

interface FilterPillsProps {
  filters: string[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export function FilterPills({ filters, activeFilter, onFilterChange }: FilterPillsProps) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {filters.map(filter => (
        <button
          key={filter}
          onClick={() => onFilterChange(filter)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeFilter === filter 
              ? 'bg-[#6366F1] text-white' 
              : 'bg-[#1A1A24] text-[#8B8BA0] hover:bg-[#2A2A38] hover:text-[#F1F1F3] border border-[#2A2A38]'
          }`}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}
