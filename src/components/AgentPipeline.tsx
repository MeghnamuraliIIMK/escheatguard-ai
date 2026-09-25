import React from 'react';
import { Check, ChevronRight, Loader2, Sparkles, Scale, SearchCheck, CheckCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { PipelineProgress, PipelineStageStatus } from '../types/compliance';

interface AgentPipelineProps {
  progress: PipelineProgress;
  isAssessing: boolean;
}

interface StepDef {
  key: keyof PipelineProgress;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepDef[] = [
  {
    key: 'step1',
    title: 'Dormancy Trigger',
    desc: 'Statutory contact & inactivity check',
    icon: SearchCheck,
  },
  {
    key: 'step2',
    title: 'Due Diligence Verification',
    desc: 'Notice & deliverability validation',
    icon: Scale,
  },
  {
    key: 'step3',
    title: 'State Compliance',
    desc: 'Statute timelines & form lookup',
    icon: Sparkles,
  },
  {
    key: 'step4',
    title: 'Escheatment Decision',
    desc: 'Final remittance or reversal counsel',
    icon: CheckCheck,
  },
];

export const AgentPipeline: React.FC<AgentPipelineProps> = ({ progress, isAssessing }) => {
  const hasRetrying =
    progress.step1 === 'retrying' ||
    progress.step2 === 'retrying' ||
    progress.step3 === 'retrying' ||
    progress.step4 === 'retrying';

  return (
    <section className="bg-white border-b border-[#D8DEE4] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#4A5866]">
              Compliance Agent Pipeline
            </span>
            {hasRetrying ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#FAEEDA] text-[#BA7517] border border-[#BA7517]/30 animate-pulse">
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                {progress.retryMessage || 'Retrying (503 Service Unavailable)...'}
              </span>
            ) : isAssessing ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#0E7C86]/10 text-[#0E7C86] border border-[#0E7C86]/30 animate-pulse">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Executing Sequential Agents...
              </span>
            ) : null}
          </div>
          <span className="text-[11px] text-[#4A5866]">
            Four sequential AI verification stages per record
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {STEPS.map((step, idx) => {
            const status: PipelineStageStatus = (progress[step.key] as PipelineStageStatus) || 'pending';
            const StepIcon = step.icon;

            const isPending = status === 'pending';
            const isActive = status === 'active';
            const isRetrying = status === 'retrying';
            const isComplete = status === 'complete';
            const isError = status === 'error';

            return (
              <div
                key={step.key}
                className={`relative flex items-center p-3 rounded-lg border transition-all duration-200 ${
                  isRetrying
                    ? 'border-[#BA7517] bg-[#FAEEDA]/50 shadow-xs ring-2 ring-[#BA7517]/30'
                    : isActive
                    ? 'border-[#0E7C86] bg-[#0E7C86]/5 shadow-xs ring-2 ring-[#0E7C86]/20'
                    : isComplete
                    ? 'border-[#1D9E75] bg-[#E1F5EE]/40 text-[#18242F]'
                    : isError
                    ? 'border-[#C43D3D] bg-[#FBEAEA]/60 text-[#18242F]'
                    : 'border-[#D8DEE4] bg-[#F4F6F8]/60 text-[#4A5866]'
                }`}
              >
                {/* Step Indicator Badge */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-3 text-xs font-semibold transition-all ${
                    isRetrying
                      ? 'bg-[#BA7517] text-white shadow-sm ring-4 ring-[#BA7517]/20 animate-spin'
                      : isActive
                      ? 'bg-[#0E7C86] text-white shadow-sm ring-4 ring-[#0E7C86]/20 animate-pulse'
                      : isComplete
                      ? 'bg-[#1D9E75] text-white'
                      : isError
                      ? 'bg-[#C43D3D] text-white'
                      : 'bg-[#D8DEE4] text-[#4A5866]'
                  }`}
                >
                  {isComplete ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : isRetrying ? (
                    <RefreshCw className="w-4 h-4" />
                  ) : isActive ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : isError ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Step Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-xs font-semibold truncate ${
                        isRetrying
                          ? 'text-[#BA7517]'
                          : isActive
                          ? 'text-[#0E7C86]'
                          : isComplete
                          ? 'text-[#18242F]'
                          : isError
                          ? 'text-[#C43D3D]'
                          : 'text-[#4A5866]'
                      }`}
                    >
                      {step.title}
                    </p>
                    {isComplete && (
                      <span className="text-[10px] font-bold text-[#1D9E75] bg-[#E1F5EE] px-1.5 py-0.5 rounded ml-1 shrink-0">
                        VERIFIED
                      </span>
                    )}
                    {isRetrying && (
                      <span className="text-[10px] font-bold text-[#BA7517] bg-[#FAEEDA] border border-[#BA7517]/30 px-1.5 py-0.5 rounded ml-1 shrink-0 animate-pulse">
                        RETRYING...
                      </span>
                    )}
                    {isActive && !isRetrying && (
                      <span className="text-[10px] font-bold text-[#0E7C86] bg-[#0E7C86]/10 px-1.5 py-0.5 rounded ml-1 shrink-0">
                        RUNNING
                      </span>
                    )}
                    {isError && (
                      <span className="text-[10px] font-bold text-[#C43D3D] bg-[#FBEAEA] border border-[#C43D3D]/30 px-1.5 py-0.5 rounded ml-1 shrink-0">
                        ERROR
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#4A5866] truncate mt-0.5">
                    {isRetrying ? 'Waiting 2s & retrying (503)...' : step.desc}
                  </p>
                </div>

                {/* Right Arrow (hidden on last or mobile) */}
                {idx < STEPS.length - 1 && (
                  <div className="hidden lg:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-4 h-4 items-center justify-center bg-white border border-[#D8DEE4] rounded-full text-[#4A5866] shadow-xs">
                    <ChevronRight className="w-3 h-3" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
