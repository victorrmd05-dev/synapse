"use client";

import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

// Mock data to match the image curve
const mockData = [
  { date: '01', roas: 3.2, cpa: 14.2, gasto: 400 },
  { date: '02', roas: 3.3, cpa: 13.5, gasto: 410 },
  { date: '03', roas: 3.1, cpa: 14.8, gasto: 420 },
  { date: '04', roas: 3.5, cpa: 12.1, gasto: 430 },
  { date: '05', roas: 3.4, cpa: 12.5, gasto: 450 },
  { date: '06', roas: 3.6, cpa: 11.8, gasto: 460 },
  { date: '07', roas: 3.4, cpa: 12.5, gasto: 450 },
];

export function TrendChart() {
  const [period, setPeriod] = useState('7D');

  return (
    <div className="bg-[#111116] border border-[#2A2A38] rounded-xl p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-[#F1F1F3] text-[13px] font-medium">Trend Analytics</h3>
          <p className="text-[#8B8BA0] text-[11px] mt-0.5">Acompanhamento temporal de métricas principais</p>
        </div>
        <div className="flex bg-[#0F0F13] border border-[#2A2A38] rounded-md overflow-hidden">
          {['7D', '14D', '30D'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-[11px] font-medium transition-colors ${
                period === p ? 'bg-[#2A2A38] text-[#F1F1F3]' : 'text-[#8B8BA0] hover:text-[#F1F1F3]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mockData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorGasto" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1A1A24" vertical={false} />
            <XAxis dataKey="date" stroke="#2A2A38" tick={{ fill: '#8B8BA0', fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis stroke="#2A2A38" tick={{ fill: '#8B8BA0', fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1A1A24', borderColor: '#2A2A38', color: '#F1F1F3', fontSize: 12, borderRadius: 8 }}
              itemStyle={{ fontSize: 11 }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="square"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, color: '#8B8BA0', paddingTop: 20 }} 
            />
            <Area type="monotone" dataKey="gasto" stroke="none" fillOpacity={1} fill="url(#colorGasto)" />
            <Area type="monotone" dataKey="roas" stroke="#6366F1" strokeWidth={2} fill="none" name="ROAS (Avg: 4.2)" />
            <Area type="monotone" dataKey="cpa" stroke="#22C55E" strokeWidth={2} strokeDasharray="5 5" fill="none" name="CPA (Avg: R$ 12,40)" />
            <Area type="monotone" dataKey="gasto" stroke="#0ea5e9" strokeWidth={2} strokeDasharray="3 3" fill="none" name="Spend (Daily: R$ 450)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
