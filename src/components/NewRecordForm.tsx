import React, { useRef } from 'react';
import { UploadCloud, FileText, X, Play, Sparkles, AlertCircle } from 'lucide-react';
import { ComplianceRecord, RecordType } from '../types/compliance';

export const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

export interface SamplePreset {
  id: string;
  label: string;
  tag: string;
  record: ComplianceRecord;
}

// Preset dates relative to reference date Sep 2026:
// Clean: 3 yrs ago (2023-09-15), deadline in 45 days (2026-11-09)
// Incomplete: 4 yrs ago (2022-09-10), deadline in 12 days (2026-10-07)
// Owner located: 2 months ago (2026-07-25), deadline in 90 days (2026-12-24)
// Overdue: 6 yrs ago (2020-09-15), deadline 5 days ago (2026-09-20)
export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'clean',
    label: '(a) Clean dormancy — ready to file',
    tag: 'Policy Dividend',
    record: {
      policyholderName: 'Margaret Holt',
      policyNumber: 'LA-88213-M',
      recordType: 'Uncashed dividend check',
      state: 'OH',
      lastContactDate: '2023-09-15',
      returnedMail: 'Yes',
      amount: 1240,
      lettersSent: 3,
      lettersReturned: 3,
      deadline: '2026-11-09',
      attachedFileName: 'returned_mail_notice.pdf',
    },
  },
  {
    id: 'incomplete',
    label: '(b) Incomplete due diligence',
    tag: 'Life & Annuity Proceeds',
    record: {
      policyholderName: 'Robert Nunez',
      policyNumber: 'LA-77410-D',
      recordType: 'Unclaimed death benefit',
      state: 'CA',
      lastContactDate: '2022-09-10',
      returnedMail: 'No',
      amount: 18500,
      lettersSent: 1,
      lettersReturned: 0,
      deadline: '2026-10-07',
      attachedFileName: 'diligence_log_partial.pdf',
    },
  },
  {
    id: 'owner_located',
    label: '(c) Owner located mid-process',
    tag: 'Life & Annuity Proceeds',
    record: {
      policyholderName: 'Priya Chandran',
      policyNumber: 'LA-91002-E',
      recordType: 'Matured endowment',
      state: 'TX',
      lastContactDate: '2026-07-25',
      returnedMail: 'No',
      amount: 6750,
      lettersSent: 2,
      lettersReturned: 0,
      deadline: '2026-12-24',
      attachedFileName: 'policyholder_claim_form.pdf',
    },
  },
  {
    id: 'overdue',
    label: '(d) Overdue, high exposure',
    tag: 'Life & Annuity Proceeds',
    record: {
      policyholderName: 'Frank DeLuca',
      policyNumber: 'LA-65590-P',
      recordType: 'Demutualization proceeds',
      state: 'NY',
      lastContactDate: '2020-09-15',
      returnedMail: 'Yes',
      amount: 42000,
      lettersSent: 3,
      lettersReturned: 3,
      deadline: '2026-09-20',
      attachedFileName: 'final_notice.pdf',
    },
  },
];

interface NewRecordFormProps {
  record: ComplianceRecord;
  onChange: (updated: Partial<ComplianceRecord>) => void;
  onSubmit: () => void;
  isAssessing: boolean;
  selectedPresetId: string;
  onSelectPreset: (presetId: string) => void;
}

export const NewRecordForm: React.FC<NewRecordFormProps> = ({
  record,
  onChange,
  onSubmit,
  isAssessing,
  selectedPresetId,
  onSelectPreset,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived tag at top of card
  const recordTag =
    record.recordType === 'Uncashed dividend check'
      ? 'Policy Dividend'
      : 'Life & Annuity Proceeds';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange({ attachedFileName: file.name });
    }
  };

  const handleRemoveFile = () => {
    onChange({ attachedFileName: undefined });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#D8DEE4] shadow-xs overflow-hidden">
      {/* Top Banner with tag & Preset Selector */}
      <div className="bg-[#F4F6F8] px-5 py-3 border-b border-[#D8DEE4] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#18242F]">
            New Record
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#0E7C86]/10 text-[#0E7C86] border border-[#0E7C86]/30">
            {recordTag}
          </span>
        </div>

        {/* Load Sample Record Dropdown */}
        <div className="flex items-center space-x-2">
          <label htmlFor="sample-preset-select" className="text-xs font-medium text-[#4A5866] whitespace-nowrap">
            Load sample record:
          </label>
          <select
            id="sample-preset-select"
            value={selectedPresetId}
            onChange={(e) => onSelectPreset(e.target.value)}
            className="text-xs font-medium text-[#18242F] bg-white border border-[#D8DEE4] rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0E7C86] focus:border-[#0E7C86]"
          >
            <option value="">-- Choose sample record --</option>
            {SAMPLE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Form Fields */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="p-5 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Policyholder Name */}
          <div>
            <label className="block text-xs font-semibold text-[#18242F] mb-1">
              Policyholder name
            </label>
            <input
              type="text"
              required
              value={record.policyholderName}
              onChange={(e) => onChange({ policyholderName: e.target.value })}
              placeholder="e.g. Margaret Holt"
              className="w-full text-xs text-[#18242F] bg-white border border-[#D8DEE4] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0E7C86] focus:border-[#0E7C86]"
            />
          </div>

          {/* Policy Number */}
          <div>
            <label className="block text-xs font-semibold text-[#18242F] mb-1">
              Policy number
            </label>
            <input
              type="text"
              required
              value={record.policyNumber}
              onChange={(e) => onChange({ policyNumber: e.target.value })}
              placeholder="e.g. LA-88213-M"
              className="w-full text-xs font-mono text-[#18242F] bg-white border border-[#D8DEE4] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0E7C86] focus:border-[#0E7C86]"
            />
          </div>

          {/* Record Type */}
          <div>
            <label className="block text-xs font-semibold text-[#18242F] mb-1">
              Record type
            </label>
            <select
              value={record.recordType}
              onChange={(e) => onChange({ recordType: e.target.value as RecordType })}
              className="w-full text-xs text-[#18242F] bg-white border border-[#D8DEE4] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0E7C86] focus:border-[#0E7C86]"
            >
              <option value="Matured endowment">Matured endowment</option>
              <option value="Uncashed dividend check">Uncashed dividend check</option>
              <option value="Unclaimed death benefit">Unclaimed death benefit</option>
              <option value="Demutualization proceeds">Demutualization proceeds</option>
            </select>
          </div>

          {/* Last Known State */}
          <div>
            <label className="block text-xs font-semibold text-[#18242F] mb-1">
              Last known state
            </label>
            <select
              value={record.state}
              onChange={(e) => onChange({ state: e.target.value })}
              className="w-full text-xs text-[#18242F] bg-white border border-[#D8DEE4] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0E7C86] focus:border-[#0E7C86]"
            >
              {US_STATES.map((st) => (
                <option key={st.code} value={st.code}>
                  {st.name} ({st.code})
                </option>
              ))}
            </select>
          </div>

          {/* Last Contact Date */}
          <div>
            <label className="block text-xs font-semibold text-[#18242F] mb-1">
              Last contact date
            </label>
            <input
              type="date"
              required
              value={record.lastContactDate}
              onChange={(e) => onChange({ lastContactDate: e.target.value })}
              className="w-full text-xs text-[#18242F] bg-white border border-[#D8DEE4] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0E7C86] focus:border-[#0E7C86]"
            />
          </div>

          {/* Returned Mail on File */}
          <div>
            <label className="block text-xs font-semibold text-[#18242F] mb-1">
              Returned mail on file?
            </label>
            <select
              value={record.returnedMail}
              onChange={(e) => onChange({ returnedMail: e.target.value as 'Yes' | 'No' })}
              className="w-full text-xs text-[#18242F] bg-white border border-[#D8DEE4] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0E7C86] focus:border-[#0E7C86]"
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          {/* Amount (USD) */}
          <div>
            <label className="block text-xs font-semibold text-[#18242F] mb-1">
              Amount (USD)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-semibold text-[#4A5866]">
                $
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={record.amount}
                onChange={(e) => onChange({ amount: parseFloat(e.target.value) || 0 })}
                placeholder="1000.00"
                className="w-full text-xs text-[#18242F] bg-white border border-[#D8DEE4] rounded-md pl-7 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0E7C86] focus:border-[#0E7C86]"
              />
            </div>
          </div>

          {/* State Reporting Deadline */}
          <div>
            <label className="block text-xs font-semibold text-[#18242F] mb-1">
              State reporting deadline
            </label>
            <input
              type="date"
              required
              value={record.deadline}
              onChange={(e) => onChange({ deadline: e.target.value })}
              className="w-full text-xs text-[#18242F] bg-white border border-[#D8DEE4] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0E7C86] focus:border-[#0E7C86]"
            />
          </div>

          {/* Due Diligence Letters Sent */}
          <div>
            <label className="block text-xs font-semibold text-[#18242F] mb-1">
              Due diligence letters sent
            </label>
            <input
              type="number"
              min="0"
              required
              value={record.lettersSent}
              onChange={(e) => onChange({ lettersSent: parseInt(e.target.value, 10) || 0 })}
              className="w-full text-xs text-[#18242F] bg-white border border-[#D8DEE4] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0E7C86] focus:border-[#0E7C86]"
            />
          </div>

          {/* Due Diligence Letters Returned Undeliverable */}
          <div>
            <label className="block text-xs font-semibold text-[#18242F] mb-1">
              Due diligence letters returned undeliverable
            </label>
            <input
              type="number"
              min="0"
              required
              value={record.lettersReturned}
              onChange={(e) => onChange({ lettersReturned: parseInt(e.target.value, 10) || 0 })}
              className="w-full text-xs text-[#18242F] bg-white border border-[#D8DEE4] rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0E7C86] focus:border-[#0E7C86]"
            />
          </div>
        </div>

        {/* Attach Supporting File Box */}
        <div className="pt-1">
          <label className="block text-xs font-semibold text-[#18242F] mb-1.5">
            Attach supporting file
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
            className="hidden"
          />

          {record.attachedFileName ? (
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#0E7C86]/30 bg-[#0E7C86]/5 text-xs text-[#18242F]">
              <div className="flex items-center space-x-2 truncate">
                <FileText className="w-4 h-4 text-[#0E7C86] shrink-0" />
                <span className="font-medium truncate font-mono text-[11px]">
                  {record.attachedFileName}
                </span>
                <span className="text-[10px] text-[#4A5866] bg-white px-1.5 py-0.5 rounded border border-[#D8DEE4]">
                  Demo Attached
                </span>
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="text-[#4A5866] hover:text-[#C43D3D] p-1 rounded transition-colors"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#D8DEE4] hover:border-[#0E7C86] rounded-lg p-3 text-center cursor-pointer transition-colors bg-[#F4F6F8]/50 hover:bg-white group"
            >
              <UploadCloud className="w-6 h-6 text-[#4A5866] group-hover:text-[#0E7C86] mx-auto mb-1 transition-colors" />
              <p className="text-xs text-[#18242F] font-medium">
                Click or drag to attach document
              </p>
              <p className="text-[11px] text-[#4A5866] mt-0.5 max-w-sm mx-auto">
                Attach due diligence letter, returned mail notice, or claim form (optional, demo only — files are not sent anywhere).
              </p>
            </div>
          )}
        </div>

        {/* Action Button: Run Compliance Assessment */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isAssessing}
            className="w-full py-2.5 px-4 bg-[#0E7C86] hover:bg-[#0A6068] active:bg-[#084b51] disabled:opacity-60 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            {isAssessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Running 4 Sequential Compliance Agents...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Run compliance assessment</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
