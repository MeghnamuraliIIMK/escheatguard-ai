import React, { useState } from 'react';
import {
  SearchCheck,
  Scale,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  Clock,
  FileCheck2,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import {
  DormancyResult,
  DueDiligenceResult,
  StateComplianceResult,
  DecisionResult,
  ComplianceRecord,
} from '../types/compliance';
import { ComplianceGauge } from './ComplianceGauge';

interface ResultsColumnProps {
  dormancy?: DormancyResult | null;
  dueDiligence?: DueDiligenceResult | null;
  stateCompliance?: StateComplianceResult | null;
  decision?: DecisionResult | null;
  record?: ComplianceRecord | null;
  isAssessing: boolean;
  activeStep: number; // 0: idle, 1: dormancy running, 2: dd running, 3: state running, 4: decision running
  errorMessage?: string | null;
  onRetryAssessment?: () => void;
}

export const ResultsColumn: React.FC<ResultsColumnProps> = ({
  dormancy,
  dueDiligence,
  stateCompliance,
  decision,
  record,
  isAssessing,
  activeStep,
  errorMessage,
  onRetryAssessment,
}) => {
  const [copiedMemo, setCopiedMemo] = useState(false);

  const handleCopyMemo = () => {
    if (!decision) return;
    const memoText = `[ESCHEATGUARD COMPLIANCE MEMO]
Policyholder: ${record?.policyholderName || 'N/A'} (Policy: ${record?.policyNumber || 'N/A'})
Record Type: ${record?.recordType || 'N/A'} | State: ${record?.state || 'N/A'} | Amount: $${record?.amount?.toLocaleString() || '0'}
Reporting Deadline: ${record?.deadline || 'N/A'} (${stateCompliance?.daysToDeadline !== undefined ? `${stateCompliance.daysToDeadline} days remaining` : 'N/A'})
Statutory Filing Reference: ${stateCompliance?.filingReference || 'NAUPA Standard'}

FINAL DECISION: ${decision.decision}
REASONING:
${decision.reasoning}

COMPLIANCE AUDIT TRAIL:
- Dormancy Confirmed: ${dormancy?.isDormant ? 'YES' : 'NO (Active Contact)'}
- Due Diligence Completeness: ${dueDiligence?.completenessScore || 0}/100
- Assessment Timestamp: ${new Date().toISOString()}
- Advisory note: Synthetic demo decision-support tool. Final action subject to carrier compliance officer certification.`;

    navigator.clipboard.writeText(memoText);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2500);
  };

  // Helper for deadline countdown formatting & color
  const getDeadlineBadge = (days: number | undefined) => {
    if (days === undefined) return null;

    if (days < 0) {
      // Overdue -> Red
      return {
        text: `OVERDUE (${Math.abs(days)} days ago)`,
        className: 'bg-[#FBEAEA] text-[#C43D3D] border-[#C43D3D]/30',
        icon: AlertTriangle,
      };
    } else if (days < 14) {
      // Under 14 days -> Red (approaching critical / imminent)
      return {
        text: `${days} days to deadline`,
        className: 'bg-[#FBEAEA] text-[#C43D3D] border-[#C43D3D]/30',
        icon: AlertTriangle,
      };
    } else if (days < 30) {
      // Under 30 days -> Amber
      return {
        text: `${days} days to deadline`,
        className: 'bg-[#FAEEDA] text-[#BA7517] border-[#BA7517]/30',
        icon: Clock,
      };
    } else {
      // 30+ days -> Green
      return {
        text: `${days} days to deadline`,
        className: 'bg-[#E1F5EE] text-[#1D9E75] border-[#1D9E75]/30',
        icon: CheckCircle2,
      };
    }
  };

  const deadlineBadge = getDeadlineBadge(stateCompliance?.daysToDeadline);

  return (
    <div className="space-y-4">
      {/* Error state alert when Gemini 503 retries are exhausted */}
      {errorMessage && (
        <div className="bg-[#FBEAEA] border border-[#C43D3D]/40 rounded-xl p-4 text-[#18242F] shadow-xs flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-[#C43D3D] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-[#C43D3D] uppercase tracking-wide">
              Compliance Agent Service Interruption
            </h4>
            <p className="text-xs text-[#18242F] mt-1 leading-relaxed">
              {errorMessage}
            </p>
            <p className="text-[11px] text-[#4A5866] mt-1">
              Automatic retry threshold (2 attempts with 2s backoff) exhausted. The compliance engine halted to prevent inaccurate determinations.
            </p>
            {onRetryAssessment && (
              <button
                type="button"
                onClick={onRetryAssessment}
                className="mt-2.5 inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#C43D3D] text-white hover:bg-[#a83333] transition-colors cursor-pointer"
              >
                Retry Assessment Pipeline
              </button>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Card A: Dormancy Trigger Card */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-xl border border-[#D8DEE4] shadow-xs overflow-hidden transition-all">
        <div className="bg-[#F4F6F8] px-4 py-2.5 border-b border-[#D8DEE4] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <SearchCheck className="w-4 h-4 text-[#0E7C86]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#18242F]">
              (a) Dormancy Trigger Assessment
            </h3>
          </div>
          {isAssessing && activeStep === 1 && (
            <span className="text-[10px] font-semibold text-[#0E7C86] bg-[#0E7C86]/10 px-2 py-0.5 rounded animate-pulse">
              Evaluating...
            </span>
          )}
        </div>

        <div className="p-4">
          {dormancy ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-semibold text-[#18242F]">
                  Dormancy Qualification Status:
                </span>
                {dormancy.isDormant ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-[#E1F5EE] text-[#1D9E75] border border-[#1D9E75]/30">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Dormancy Criteria Satisfied
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-[#E1F5EE] text-[#1D9E75] border border-[#1D9E75]/30">
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    Active Contact Detected (Non-Dormant)
                  </span>
                )}
              </div>

              <div className="p-3 rounded-lg bg-[#F4F6F8] border border-[#D8DEE4] text-xs text-[#18242F] leading-relaxed">
                <span className="font-semibold text-[#4A5866] block text-[11px] uppercase mb-1">
                  Reasoning
                </span>
                {dormancy.reasoning}
              </div>

              {record && (
                <div className="grid grid-cols-2 gap-2 text-[11px] text-[#4A5866] pt-1">
                  <div>
                    <span className="font-medium text-[#18242F]">Last Contact:</span>{' '}
                    {record.lastContactDate}
                  </div>
                  <div>
                    <span className="font-medium text-[#18242F]">Returned Mail:</span>{' '}
                    {record.returnedMail}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-[#4A5866] flex flex-col items-center">
              <SearchCheck className="w-8 h-8 text-[#D8DEE4] mb-2" />
              <span>Awaiting submission to trigger dormancy analysis.</span>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Card B: Due Diligence Verification Card */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-xl border border-[#D8DEE4] shadow-xs overflow-hidden transition-all">
        <div className="bg-[#F4F6F8] px-4 py-2.5 border-b border-[#D8DEE4] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Scale className="w-4 h-4 text-[#0E7C86]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#18242F]">
              (b) Due Diligence Verification
            </h3>
          </div>
          {isAssessing && activeStep === 2 && (
            <span className="text-[10px] font-semibold text-[#0E7C86] bg-[#0E7C86]/10 px-2 py-0.5 rounded animate-pulse">
              Measuring...
            </span>
          )}
        </div>

        <div className="p-4">
          {dueDiligence ? (
            <div className="space-y-4">
              {/* Semicircular Compliance Gauge */}
              <div className="pb-2 border-b border-[#D8DEE4]">
                <ComplianceGauge score={dueDiligence.completenessScore} />
              </div>

              {/* Checklist */}
              <div>
                <h4 className="text-xs font-semibold text-[#18242F] mb-2 flex items-center justify-between">
                  <span>Statutory Diligence Checklist</span>
                  <span className="text-[11px] font-normal text-[#4A5866]">
                    {dueDiligence.checklist.filter((c) => c.met).length} of{' '}
                    {dueDiligence.checklist.length} confirmed
                  </span>
                </h4>

                <div className="space-y-1.5">
                  {dueDiligence.checklist.map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start space-x-2 p-2 rounded text-xs transition-colors ${
                        item.met
                          ? 'bg-[#E1F5EE]/40 text-[#18242F]'
                          : 'bg-[#FBEAEA]/40 text-[#4A5866]'
                      }`}
                    >
                      {item.met ? (
                        <CheckCircle2 className="w-4 h-4 text-[#1D9E75] shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-[#C43D3D] shrink-0 mt-0.5" />
                      )}
                      <span className="leading-snug">{item.item}</span>
                    </div>
                  ))}
                </div>

                {/* Missing steps if any */}
                {dueDiligence.missingSteps && dueDiligence.missingSteps.length > 0 && (
                  <div className="mt-3 p-2.5 rounded-lg bg-[#FAEEDA]/60 border border-[#BA7517]/30 text-xs">
                    <span className="font-semibold text-[#BA7517] block mb-1">
                      Action Required Before Remittance:
                    </span>
                    <ul className="list-disc pl-4 space-y-0.5 text-[#18242F] text-[11px]">
                      {dueDiligence.missingSteps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-[#4A5866] flex flex-col items-center">
              <Scale className="w-8 h-8 text-[#D8DEE4] mb-2" />
              <span>Awaiting due diligence audit scoring.</span>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Card C: State Compliance Card */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-xl border border-[#D8DEE4] shadow-xs overflow-hidden transition-all">
        <div className="bg-[#F4F6F8] px-4 py-2.5 border-b border-[#D8DEE4] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-[#0E7C86]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#18242F]">
              (c) State Compliance & Schedule
            </h3>
          </div>
          {isAssessing && activeStep === 3 && (
            <span className="text-[10px] font-semibold text-[#0E7C86] bg-[#0E7C86]/10 px-2 py-0.5 rounded animate-pulse">
              Consulting State Rules...
            </span>
          )}
        </div>

        <div className="p-4">
          {stateCompliance ? (
            <div className="space-y-3">
              {/* Countdown & Deadline Banner */}
              <div className="flex items-center justify-between p-3 rounded-lg border bg-[#F4F6F8] border-[#D8DEE4]">
                <div>
                  <span className="text-[11px] text-[#4A5866] block font-medium">
                    State Reporting Cutoff
                  </span>
                  <span className="text-xs font-bold text-[#18242F]">
                    {record?.deadline} ({record?.state})
                  </span>
                </div>

                {deadlineBadge && (
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold border ${deadlineBadge.className}`}
                  >
                    <deadlineBadge.icon className="w-3.5 h-3.5 mr-1" />
                    {deadlineBadge.text}
                  </span>
                )}
              </div>

              {/* State specifics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded bg-[#F4F6F8] border border-[#D8DEE4]">
                  <span className="text-[11px] text-[#4A5866] block font-medium">
                    Statutory Dormancy Term:
                  </span>
                  <span className="text-xs font-semibold text-[#18242F]">
                    {stateCompliance.stateDormancyPeriodYears || 3} Years Inactivity
                  </span>
                </div>

                <div className="p-2.5 rounded bg-[#F4F6F8] border border-[#D8DEE4]">
                  <span className="text-[11px] text-[#4A5866] block font-medium">
                    Dormancy Rule Applies:
                  </span>
                  <span className="text-xs font-semibold text-[#1D9E75]">
                    {stateCompliance.dormancyPeriodApplies ? 'Confirmed' : 'Exempt'}
                  </span>
                </div>
              </div>

              {/* Statutory Filing Form/Schedule */}
              <div className="p-2.5 rounded bg-[#F4F6F8] border border-[#D8DEE4] text-xs">
                <span className="text-[11px] text-[#4A5866] block font-medium">
                  Prescribed State Filing Form & Schedule:
                </span>
                <span className="text-xs font-mono font-semibold text-[#0E7C86] block mt-0.5">
                  {stateCompliance.filingReference}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-[#4A5866] flex flex-col items-center">
              <Calendar className="w-8 h-8 text-[#D8DEE4] mb-2" />
              <span>Awaiting state rule & deadline correlation.</span>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Card D: Escheatment Decision Card */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-xl border border-[#D8DEE4] shadow-xs overflow-hidden transition-all">
        <div className="bg-[#F4F6F8] px-4 py-2.5 border-b border-[#D8DEE4] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileCheck2 className="w-4 h-4 text-[#0E7C86]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#18242F]">
              (d) Escheatment Decision & Counsel
            </h3>
          </div>
          {isAssessing && activeStep === 4 && (
            <span className="text-[10px] font-semibold text-[#0E7C86] bg-[#0E7C86]/10 px-2 py-0.5 rounded animate-pulse">
              Synthesizing Decision...
            </span>
          )}
        </div>

        <div className="p-4">
          {decision ? (
            <div className="space-y-3.5">
              {/* Decision Badge */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-semibold text-[#4A5866]">
                  Recommended Compliance Action:
                </span>

                {decision.decision === 'Report & remit' && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-[#E1F5EE] text-[#1D9E75] border border-[#1D9E75]/30 shadow-xs">
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Report & remit
                  </span>
                )}

                {decision.decision === 'Hold for more diligence' && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FAEEDA] text-[#BA7517] border border-[#BA7517]/30 shadow-xs">
                    <AlertTriangle className="w-4 h-4 mr-1.5" />
                    Hold for more diligence
                  </span>
                )}

                {decision.decision === 'Owner located — reverse' && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-[#E1F5EE] text-[#1D9E75] border border-[#1D9E75]/30 shadow-xs">
                    <RotateCcw className="w-4 h-4 mr-1.5" />
                    Owner located — reverse
                  </span>
                )}
              </div>

              {/* 2-3 sentences of Reasoning */}
              <div className="p-3.5 rounded-lg bg-[#F4F6F8] border border-[#D8DEE4] text-xs text-[#18242F] leading-relaxed">
                <span className="font-semibold text-[#4A5866] block text-[11px] uppercase mb-1">
                  Compliance Officer Briefing & Legal Reasoning
                </span>
                <p className="font-medium text-[#18242F]">{decision.reasoning}</p>
              </div>

              {/* Copy Compliance Memo Button */}
              <button
                type="button"
                onClick={handleCopyMemo}
                className="w-full py-2 px-3 border border-[#0E7C86] text-[#0E7C86] hover:bg-[#0E7C86]/5 active:bg-[#0E7C86]/10 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                {copiedMemo ? (
                  <>
                    <Check className="w-4 h-4 text-[#1D9E75]" />
                    <span className="text-[#1D9E75]">Compliance Memo Copied to Clipboard</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy compliance memo</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-[#4A5866] flex flex-col items-center">
              <FileCheck2 className="w-8 h-8 text-[#D8DEE4] mb-2" />
              <span>Awaiting completion of upstream agents to formulate decision.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
