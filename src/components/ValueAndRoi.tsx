import React from 'react';
import {
  TrendingUp,
  Clock,
  PieChart,
  Users,
  Zap,
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
} from 'lucide-react';
import { SessionMetrics } from '../types/compliance';

interface ValueAndRoiProps {
  metrics: SessionMetrics;
}

export const ValueAndRoi: React.FC<ValueAndRoiProps> = ({ metrics }) => {
  return (
    <section className="space-y-4">
      {/* Title & Stated Assumption Header */}
      <div className="bg-white rounded-xl border border-[#D8DEE4] p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-[#D8DEE4]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0E7C86]/10 flex items-center justify-center text-[#0E7C86]">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#18242F]">
                Value and ROI
              </h2>
              <p className="text-xs text-[#4A5866]">
                Reflects this session&apos;s actual runs. Measured figures come from the log above; projected figures rest on a stated assumption.
              </p>
            </div>
          </div>
          <div className="text-[11px] text-[#4A5866] bg-[#F4F6F8] px-3 py-1.5 rounded-lg border border-[#D8DEE4]">
            <span className="font-semibold text-[#18242F]">Stated baseline assumption:</span> manual due-diligence review and state-rule lookup averages 25 minutes per record.
          </div>
        </div>

        {/* Row 1: Measured (Green badge) */}
        <div className="mt-4">
          <div className="flex items-center space-x-2 mb-2.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#E1F5EE] text-[#1D9E75] border border-[#1D9E75]/30">
              <CheckCircle className="w-3 h-3 mr-1" />
              Measured
            </span>
            <span className="text-xs font-semibold text-[#18242F]">
              Live Session Empirical Metrics
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Card 1: Records Processed */}
            <div className="p-3.5 rounded-lg border border-[#D8DEE4] bg-[#F4F6F8]">
              <div className="flex items-center justify-between text-xs text-[#4A5866]">
                <span>Records processed</span>
                <Users className="w-4 h-4 text-[#0E7C86]" />
              </div>
              <div className="mt-1 flex items-baseline">
                <span className="text-2xl font-black text-[#18242F]">
                  {metrics.totalProcessed}
                </span>
                <span className="ml-1.5 text-xs text-[#4A5866]">records this session</span>
              </div>
              <p className="text-[11px] text-[#4A5866] mt-1">
                Audited through 4 sequential AI compliance verification gates
              </p>
            </div>

            {/* Card 2: Decision Split */}
            <div className="p-3.5 rounded-lg border border-[#D8DEE4] bg-[#F4F6F8]">
              <div className="flex items-center justify-between text-xs text-[#4A5866]">
                <span>Decision split</span>
                <PieChart className="w-4 h-4 text-[#0E7C86]" />
              </div>
              <div className="mt-1 flex items-baseline space-x-2 text-xs font-semibold">
                <span className="text-[#1D9E75]">{metrics.remittedPct}% Remit</span>
                <span className="text-[#4A5866]">·</span>
                <span className="text-[#BA7517]">{metrics.holdPct}% Hold</span>
                <span className="text-[#4A5866]">·</span>
                <span className="text-[#1D9E75]">{metrics.reversePct}% Reverse</span>
              </div>
              <div className="w-full bg-[#D8DEE4] h-1.5 rounded-full overflow-hidden flex mt-2">
                <div style={{ width: `${metrics.remittedPct}%` }} className="bg-[#1D9E75]" />
                <div style={{ width: `${metrics.holdPct}%` }} className="bg-[#BA7517]" />
                <div style={{ width: `${metrics.reversePct}%` }} className="bg-[#0E7C86]" />
              </div>
              <p className="text-[11px] text-[#4A5866] mt-1">
                Remit: {metrics.remittedCount} | Hold: {metrics.holdCount} | Reverse: {metrics.reverseCount}
              </p>
            </div>

            {/* Card 3: Avg Processing Time */}
            <div className="p-3.5 rounded-lg border border-[#D8DEE4] bg-[#F4F6F8]">
              <div className="flex items-center justify-between text-xs text-[#4A5866]">
                <span>Avg. processing time</span>
                <Clock className="w-4 h-4 text-[#0E7C86]" />
              </div>
              <div className="mt-1 flex items-baseline">
                <span className="text-2xl font-black text-[#18242F]">
                  {metrics.avgProcessingSeconds > 0 ? `${metrics.avgProcessingSeconds}s` : '0.0s'}
                </span>
                <span className="ml-1.5 text-xs text-[#4A5866]">wall-clock per record</span>
              </div>
              <p className="text-[11px] text-[#4A5866] mt-1">
                Measured end-to-end across all 4 agents
              </p>
            </div>
          </div>
        </div>

        {/* Row 2: Projected (Amber badge) */}
        <div className="mt-5">
          <div className="flex items-center space-x-2 mb-2.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#FAEEDA] text-[#BA7517] border border-[#BA7517]/30">
              <Clock className="w-3 h-3 mr-1" />
              Projected
            </span>
            <span className="text-xs font-semibold text-[#18242F]">
              Operational Efficiency (Based on 25 min manual baseline)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Card 1: Review time avoided */}
            <div className="p-3.5 rounded-lg border border-[#D8DEE4] bg-[#F4F6F8]">
              <div className="flex items-center justify-between text-xs text-[#4A5866]">
                <span>Review time avoided</span>
                <Zap className="w-4 h-4 text-[#BA7517]" />
              </div>
              <div className="mt-1 flex items-baseline">
                <span className="text-2xl font-black text-[#18242F]">
                  {metrics.totalProcessed > 0 ? metrics.reviewTimeAvoidedFormatted : '25m 00s'}
                </span>
                <span className="ml-1.5 text-xs text-[#4A5866]">saved / record</span>
              </div>
              <p className="text-[11px] text-[#4A5866] mt-1">
                25 minutes minus the measured AI average ({metrics.avgProcessingSeconds}s)
              </p>
            </div>

            {/* Card 2: Analyst hours freed */}
            <div className="p-3.5 rounded-lg border border-[#D8DEE4] bg-[#F4F6F8]">
              <div className="flex items-center justify-between text-xs text-[#4A5866]">
                <span>Analyst hours freed</span>
                <Users className="w-4 h-4 text-[#BA7517]" />
              </div>
              <div className="mt-1 flex items-baseline">
                <span className="text-2xl font-black text-[#18242F]">
                  {metrics.analystHoursFreed}
                </span>
                <span className="ml-1.5 text-xs text-[#4A5866]">analyst hours</span>
              </div>
              <p className="text-[11px] text-[#4A5866] mt-1">
                Calculated as review time avoided × {metrics.totalProcessed} records processed
              </p>
            </div>

            {/* Card 3: Records reviewable per analyst-hour */}
            <div className="p-3.5 rounded-lg border border-[#D8DEE4] bg-[#F4F6F8]">
              <div className="flex items-center justify-between text-xs text-[#4A5866]">
                <span>Records reviewable / analyst-hr</span>
                <TrendingUp className="w-4 h-4 text-[#BA7517]" />
              </div>
              <div className="mt-1 flex items-baseline">
                <span className="text-2xl font-black text-[#18242F]">
                  {metrics.recordsPerHour > 0 ? `~${metrics.recordsPerHour.toLocaleString()}` : '—'}
                </span>
                <span className="ml-1.5 text-xs text-[#4A5866]">vs 2.4 manual</span>
              </div>
              <p className="text-[11px] text-[#4A5866] mt-1">
                Throughput rate at current session processing velocity
              </p>
            </div>
          </div>
        </div>

        {/* Warning Note Box */}
        <div className="mt-4 p-3 rounded-lg bg-[#FAEEDA] border border-[#BA7517]/30 flex items-start space-x-2.5">
          <AlertTriangle className="w-4 h-4 text-[#BA7517] shrink-0 mt-0.5" />
          <p className="text-xs text-[#18242F] font-medium leading-relaxed">
            Hours freed and per-hour throughput describe the same saved time from two angles. They should not be added together.
          </p>
        </div>

        {/* Seventh Card: Full Width Dark Navy Penalty Exposure Avoided */}
        <div className="mt-4 p-4 rounded-xl bg-[#0B1D33] text-white border border-[#0B1D33] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Penalty exposure avoided (illustrative)
                </h3>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded bg-white/15 text-white">
                  Range
                </span>
              </div>
              <p className="text-lg font-bold text-white mt-0.5">
                $500 – $5,000 per late or incorrect filing, varies by state
              </p>
              <p className="text-[11px] text-white/70 mt-0.5">
                Illustrative only — actual penalty schedules vary by state and are not calculated by this demo.
              </p>
            </div>
          </div>

          <div className="shrink-0 text-right sm:border-l sm:border-white/10 sm:pl-4">
            <span className="text-[11px] text-white/60 block">Escheatment Risk Guard</span>
            <span className="text-xs font-semibold text-[#1D9E75] bg-[#E1F5EE] px-2 py-0.5 rounded inline-block mt-1">
              Audit Safeguard Active
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
