export type RecordType =
  | 'Matured endowment'
  | 'Uncashed dividend check'
  | 'Unclaimed death benefit'
  | 'Demutualization proceeds';

export interface ComplianceRecord {
  policyholderName: string;
  policyNumber: string;
  recordType: RecordType;
  state: string;
  lastContactDate: string;
  returnedMail: 'Yes' | 'No';
  amount: number;
  lettersSent: number;
  lettersReturned: number;
  deadline: string;
  attachedFileName?: string;
  clientStartTime?: number;
  turnaroundSeconds?: number;
}

export interface DormancyResult {
  isDormant: boolean;
  reasoning: string;
}

export interface DueDiligenceResult {
  completenessScore: number;
  checklist: Array<{ item: string; met: boolean }>;
  missingSteps: string[];
}

export interface StateComplianceResult {
  daysToDeadline: number;
  dormancyPeriodApplies: boolean;
  filingReference: string;
  stateDormancyPeriodYears?: number;
}

export type DecisionType = 'Report & remit' | 'Hold for more diligence' | 'Owner located — reverse';

export interface DecisionResult {
  decision: DecisionType;
  reasoning: string;
}

export interface ProcessedAssessment {
  id: string;
  timestamp: string;
  timeFormatted: string;
  turnaroundSeconds: number;
  elapsedSeconds: number;
  record: ComplianceRecord;
  dormancy: DormancyResult;
  dueDiligence: DueDiligenceResult;
  stateCompliance: StateComplianceResult;
  decision: DecisionResult;
}

export interface SessionMetrics {
  totalProcessed: number;
  remittedCount: number;
  holdCount: number;
  reverseCount: number;
  remittedPct: number;
  holdPct: number;
  reversePct: number;
  avgProcessingSeconds: number;
  manualBenchmarkMinutes: number;
  reviewTimeAvoidedFormatted: string;
  analystHoursFreed: number;
  recordsPerHour: number;
}

export type PipelineStageStatus = 'pending' | 'active' | 'retrying' | 'complete' | 'error';

export interface PipelineProgress {
  step1: PipelineStageStatus; // Dormancy Trigger
  step2: PipelineStageStatus; // Due Diligence Verification
  step3: PipelineStageStatus; // State Compliance
  step4: PipelineStageStatus; // Escheatment Decision
  retryCount?: number;
  retryMessage?: string;
}
