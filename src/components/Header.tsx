import React from 'react';
import { ShieldCheck, RotateCcw, FileText, CheckCircle2, Clock } from 'lucide-react';
import { SessionMetrics } from '../types/compliance';

interface HeaderProps {
  metrics: SessionMetrics;
  onResetSession: () => void;
}

export const Header: React.FC<HeaderProps> = ({ metrics, onResetSession }) => {
  return (
    <header className="bg-[#0B1D33] text-white border-b border-[#0B1D33] shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left Brand Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-lg bg-[#0E7C86] flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-7 h-7 text-white" strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold tracking-tight text-white font-sans">
                  EscheatGuard
                </span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded tracking-wide bg-white/10 text-white/80 border border-white/10">
                  Demo
                </span>
              </div>
              <p className="text-xs text-white/70 tracking-wide font-normal mt-0.5">
                Unclaimed Property Compliance — Insurance Policy Proceeds
              </p>
            </div>
          </div>

          {/* Right Live Stat Cards */}
          <div className="flex items-center flex-wrap gap-2.5 sm:gap-3">
            {/* Stat 1: Records processed */}
            <div className="bg-[#18242F]/70 border border-[#D8DEE4]/20 rounded-lg px-3.5 py-2 min-w-[115px] sm:min-w-[125px]">
              <div className="flex items-center justify-between text-[11px] text-white/70">
                <span>Processed</span>
                <FileText className="w-3.5 h-3.5 text-[#0E7C86]" />
              </div>
              <div className="mt-0.5 flex items-baseline">
                <span className="text-xl font-bold text-white tracking-tight">
                  {metrics.totalProcessed}
                </span>
                <span className="ml-1 text-[11px] text-white/50">records</span>
              </div>
            </div>

            {/* Stat 2: Filed / remitted % */}
            <div className="bg-[#18242F]/70 border border-[#D8DEE4]/20 rounded-lg px-3.5 py-2 min-w-[115px] sm:min-w-[125px]">
              <div className="flex items-center justify-between text-[11px] text-white/70">
                <span>Filed / Remit</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1D9E75]" />
              </div>
              <div className="mt-0.5 flex items-baseline">
                <span className="text-xl font-bold text-white tracking-tight">
                  {metrics.remittedPct}%
                </span>
                <span className="ml-1 text-[11px] text-white/50">
                  ({metrics.remittedCount})
                </span>
              </div>
            </div>

            {/* Stat 3: Reversed — owner located % */}
            <div className="bg-[#18242F]/70 border border-[#D8DEE4]/20 rounded-lg px-3.5 py-2 min-w-[115px] sm:min-w-[125px]">
              <div className="flex items-center justify-between text-[11px] text-white/70">
                <span>Reversed</span>
                <RotateCcw className="w-3.5 h-3.5 text-[#1D9E75]" />
              </div>
              <div className="mt-0.5 flex items-baseline">
                <span className="text-xl font-bold text-white tracking-tight">
                  {metrics.reversePct}%
                </span>
                <span className="ml-1 text-[11px] text-white/50">
                  ({metrics.reverseCount})
                </span>
              </div>
            </div>

            {/* Stat 4: Avg. processing time */}
            <div className="bg-[#18242F]/70 border border-[#D8DEE4]/20 rounded-lg px-3.5 py-2 min-w-[125px] sm:min-w-[135px]">
              <div className="flex items-center justify-between text-[11px] text-white/70">
                <span>Avg. Time</span>
                <Clock className="w-3.5 h-3.5 text-[#0E7C86]" />
              </div>
              <div className="mt-0.5 flex items-baseline">
                <span className="text-xl font-bold text-white tracking-tight">
                  {metrics.avgProcessingSeconds > 0 ? `${metrics.avgProcessingSeconds}s` : '—'}
                </span>
                <span className="ml-1 text-[11px] text-white/50">session avg</span>
              </div>
            </div>

            {/* Session Reset button if records exist */}
            {metrics.totalProcessed > 0 && (
              <button
                onClick={onResetSession}
                title="Reset session history"
                className="text-white/60 hover:text-white p-2 rounded hover:bg-white/10 transition-colors text-xs flex items-center gap-1 border border-white/10"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
