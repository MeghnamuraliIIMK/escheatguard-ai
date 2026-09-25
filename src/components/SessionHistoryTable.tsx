import React from 'react';
import { History, CheckCircle2, AlertTriangle, RotateCcw, Clock, Eye } from 'lucide-react';
import { ProcessedAssessment, DecisionType } from '../types/compliance';

interface SessionHistoryTableProps {
  history: ProcessedAssessment[];
  onSelectAssessment: (assessment: ProcessedAssessment) => void;
  selectedId?: string;
}

export const SessionHistoryTable: React.FC<SessionHistoryTableProps> = ({
  history,
  onSelectAssessment,
  selectedId,
}) => {
  // Decision badge renderer using exact semantic colors
  const renderDecisionBadge = (decision: DecisionType) => {
    switch (decision) {
      case 'Report & remit':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E1F5EE] text-[#1D9E75] border border-[#1D9E75]/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Report & remit
          </span>
        );
      case 'Hold for more diligence':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FAEEDA] text-[#BA7517] border border-[#BA7517]/30">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Hold for more diligence
          </span>
        );
      case 'Owner located — reverse':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E1F5EE] text-[#1D9E75] border border-[#1D9E75]/30">
            <RotateCcw className="w-3 h-3 mr-1" />
            Owner located — reverse
          </span>
        );
    }
  };

  // Deadline status renderer
  const renderDeadlineStatus = (days: number) => {
    if (days < 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#FBEAEA] text-[#C43D3D] border border-[#C43D3D]/30">
          Overdue ({Math.abs(days)}d ago)
        </span>
      );
    } else if (days < 14) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#FBEAEA] text-[#C43D3D] border border-[#C43D3D]/30">
          {days} days left
        </span>
      );
    } else if (days < 30) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#FAEEDA] text-[#BA7517] border border-[#BA7517]/30">
          {days} days left
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#E1F5EE] text-[#1D9E75] border border-[#1D9E75]/30">
          {days} days left
        </span>
      );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#D8DEE4] shadow-xs overflow-hidden">
      {/* Table Header */}
      <div className="bg-[#F4F6F8] px-5 py-3 border-b border-[#D8DEE4] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <History className="w-4 h-4 text-[#0E7C86]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#18242F]">
            Session Assessment History
          </h3>
          {history.length > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[#18242F]/10 text-[#18242F]">
              {history.length} {history.length === 1 ? 'record' : 'records'}
            </span>
          )}
        </div>
        <span className="text-[11px] text-[#4A5866]">
          Chronological session audit log (in-memory)
        </span>
      </div>

      {/* Table Body */}
      {history.length === 0 ? (
        <div className="py-12 px-4 text-center">
          <History className="w-9 h-9 text-[#D8DEE4] mx-auto mb-2" />
          <p className="text-xs font-medium text-[#4A5866]">
            No records processed yet this session.
          </p>
          <p className="text-[11px] text-[#4A5866]/70 mt-1 max-w-sm mx-auto">
            Choose a sample record above or input policyholder details and click &quot;Run compliance assessment&quot;.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#D8DEE4] bg-[#F4F6F8]/80 text-[#4A5866] font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-4">Policyholder</th>
                <th className="py-2.5 px-4">Record Type</th>
                <th className="py-2.5 px-4">Decision</th>
                <th className="py-2.5 px-4">Amount</th>
                <th className="py-2.5 px-4">Deadline Status</th>
                <th className="py-2.5 px-4">Time</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8DEE4]">
              {history.map((item, idx) => {
                const isNewest = idx === 0;
                const isSelected = selectedId === item.id;

                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectAssessment(item)}
                    className={`cursor-pointer transition-colors ${
                      isNewest
                        ? 'bg-[#E1F5EE]/35 hover:bg-[#E1F5EE]/60'
                        : isSelected
                        ? 'bg-[#0E7C86]/10'
                        : 'hover:bg-[#F4F6F8]/70'
                    }`}
                  >
                    {/* Policyholder */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#18242F]">
                        {item.record.policyholderName}
                      </div>
                      <div className="text-[11px] font-mono text-[#4A5866]">
                        {item.record.policyNumber} · {item.record.state}
                      </div>
                    </td>

                    {/* Record Type */}
                    <td className="py-3 px-4 text-[#18242F] font-medium">
                      {item.record.recordType}
                    </td>

                    {/* Decision */}
                    <td className="py-3 px-4">
                      {renderDecisionBadge(item.decision.decision)}
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 font-mono font-semibold text-[#18242F]">
                      ${item.record.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Deadline Status */}
                    <td className="py-3 px-4">
                      {renderDeadlineStatus(item.stateCompliance.daysToDeadline)}
                    </td>

                    {/* Time */}
                    <td className="py-3 px-4 text-[#4A5866] whitespace-nowrap">
                      <div>{item.timeFormatted}</div>
                      <div className="text-[10px] text-[#4A5866]/70">
                        {(item.turnaroundSeconds ?? item.record?.turnaroundSeconds ?? item.elapsedSeconds ?? 0)}s turnaround
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAssessment(item);
                        }}
                        className="inline-flex items-center text-[11px] text-[#0E7C86] font-semibold hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
