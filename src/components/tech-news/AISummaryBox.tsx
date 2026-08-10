'use client';

import React from 'react';
import { Zap, CheckCircle2 } from 'lucide-react';

interface AISummaryBoxProps {
  points: string[];
}

export const AISummaryBox: React.FC<AISummaryBoxProps> = ({ points }) => {
  if (!points || points.length === 0) return null;

  return (
    <div className="w-full my-6 p-5 sm:p-6 rounded-2xl bg-[#0071e3]/5 border border-[#0071e3]/20 shadow-xs relative overflow-hidden text-[#1d1d1f]">
      {/* Decorative Flare */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#0071e3]/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center gap-2.5 mb-3 text-[#0071e3] font-bold text-sm tracking-wide">
        <div className="p-1.5 rounded-lg bg-[#0071e3]/15">
          <Zap className="w-4 h-4 text-[#0071e3] fill-current" />
        </div>
        <span>AI Key Takeaways (3 Điểm Chính Nổi Bật)</span>
      </div>

      <ul className="space-y-2.5 text-xs sm:text-sm text-[#333336] apple-font">
        {points.map((point, index) => (
          <li key={index} className="flex items-start gap-2.5 leading-relaxed">
            <CheckCircle2 className="w-4 h-4 text-[#0071e3] mt-0.5 shrink-0" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
