import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AgentPipeline } from './components/AgentPipeline';
import { NewRecordForm, SAMPLE_PRESETS } from './components/NewRecordForm';
import { ResultsColumn } from './components/ResultsColumn';
import { SessionHistoryTable } from './components/SessionHistoryTable';
import { ValueAndRoi } from './components/ValueAndRoi';
import { Footer } from './components/Footer';
import {
  ComplianceRecord,
  DormancyResult,
  DueDiligenceResult,
  StateComplianceResult,
  DecisionResult,
  ProcessedAssessment,
  SessionMetrics,
  PipelineProgress,
} from './types/compliance';

const INITIAL_METRICS: SessionMetrics = {
  totalProcessed: 0,
  remittedCount: 0,
  holdCount: 0,
  reverseCount: 0,
  remittedPct: 0,
  holdPct: 0,
  reversePct: 0,
  avgProcessingSeconds: 0,
  manualBenchmarkMinutes: 25,
  reviewTimeAvoidedFormatted: '25m 00s',
  analystHoursFreed: 0,
  recordsPerHour: 0,
};

const INITIAL_PROGRESS: PipelineProgress = {
  step1: 'pending',
  step2: 'pending',
  step3: 'pending',
  step4: 'pending',
};

function computeSessionMetrics(historyList: ProcessedAssessment[]): SessionMetrics {
  const total = historyList.length;
  const remittedCount = historyList.filter((s) => s.decision.decision === 'Report & remit').length;
  const holdCount = historyList.filter((s) => s.decision.decision === 'Hold for more diligence').length;
  const reverseCount = historyList.filter((s) => s.decision.decision === 'Owner located — reverse').length;

  const remittedPct = total > 0 ? Math.round((remittedCount / total) * 100) : 0;
  const holdPct = total > 0 ? Math.round((holdCount / total) * 100) : 0;
  const reversePct = total > 0 ? Math.round((reverseCount / total) * 100) : 0;

  const totalSeconds = historyList.reduce(
    (acc, curr) => acc + (Number(curr.turnaroundSeconds ?? curr.record?.turnaroundSeconds ?? curr.elapsedSeconds) || 0),
    0
  );
  const avgProcessingSeconds = total > 0 ? Number((totalSeconds / total).toFixed(1)) : 0;

  const manualBenchmarkSeconds = 1500;
  const reviewTimeAvoidedSeconds = avgProcessingSeconds > 0 ? Math.max(0, manualBenchmarkSeconds - avgProcessingSeconds) : 0;
  const avoidedMinutes = Math.floor(reviewTimeAvoidedSeconds / 60);
  const avoidedRemainingSeconds = Math.round(reviewTimeAvoidedSeconds % 60);
  const analystHoursFreed = Number(((reviewTimeAvoidedSeconds * total) / 3600).toFixed(2));
  const recordsPerHour = avgProcessingSeconds > 0 ? Math.round(3600 / avgProcessingSeconds) : 0;

  return {
    totalProcessed: total,
    remittedCount,
    holdCount,
    reverseCount,
    remittedPct,
    holdPct,
    reversePct,
    avgProcessingSeconds,
    manualBenchmarkMinutes: 25,
    reviewTimeAvoidedFormatted: `${avoidedMinutes}m ${avoidedRemainingSeconds}s`,
    analystHoursFreed,
    recordsPerHour,
  };
}

export default function App() {
  // Initialize with Sample Preset (a) "Clean dormancy — ready to file" so demo is ready in one click
  const defaultPreset = SAMPLE_PRESETS[0];
  const [record, setRecord] = useState<ComplianceRecord>({ ...defaultPreset.record });
  const [selectedPresetId, setSelectedPresetId] = useState<string>(defaultPreset.id);

  // Active Assessment State
  const [dormancy, setDormancy] = useState<DormancyResult | null>(null);
  const [dueDiligence, setDueDiligence] = useState<DueDiligenceResult | null>(null);
  const [stateCompliance, setStateCompliance] = useState<StateComplianceResult | null>(null);
  const [decision, setDecision] = useState<DecisionResult | null>(null);

  // Pipeline Status
  const [isAssessing, setIsAssessing] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [progress, setProgress] = useState<PipelineProgress>(INITIAL_PROGRESS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Session Data
  const [metrics, setMetrics] = useState<SessionMetrics>(INITIAL_METRICS);
  const [history, setHistory] = useState<ProcessedAssessment[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | undefined>(undefined);

  // Fetch initial session state if any
  useEffect(() => {
    fetch('/api/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.metrics) setMetrics(data.metrics);
        if (Array.isArray(data.history)) setHistory(data.history);
      })
      .catch((err) => {
        console.warn('Could not fetch initial session state:', err);
      });
  }, []);

  // Handle Preset selection
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const found = SAMPLE_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setRecord({ ...found.record });
      // Reset current results preview for fresh run
      setDormancy(null);
      setDueDiligence(null);
      setStateCompliance(null);
      setDecision(null);
      setProgress(INITIAL_PROGRESS);
      setSelectedHistoryId(undefined);
    }
  };

  // Handle record field edits
  const handleRecordChange = (updated: Partial<ComplianceRecord>) => {
    setRecord((prev) => ({ ...prev, ...updated }));
  };

  // Run assessment pipeline
  const handleRunAssessment = async () => {
    if (isAssessing) return;

    // Capture the start time fresh at the moment "Run compliance assessment" is clicked
    // (a local variable inside that function, not component state that persists across runs)
    const runStartTime = performance.now();
    const runStartDate = Date.now();

    setIsAssessing(true);
    setActiveStep(1);
    setErrorMessage(null);
    setProgress({
      step1: 'active',
      step2: 'pending',
      step3: 'pending',
      step4: 'pending',
      retryMessage: undefined,
    });

    // Reset active result cards
    setDormancy(null);
    setDueDiligence(null);
    setStateCompliance(null);
    setDecision(null);
    setSelectedHistoryId(undefined);

    try {
      // Use SSE stream for progressive animations
      const response = await fetch('/api/assess/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...record, clientStartTime: runStartDate }),
      });

      if (!response.ok || !response.body) {
        // Fallback to non-streaming standard POST
        await runStandardAssessment(runStartTime);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const eventStr of events) {
          if (!eventStr.trim()) continue;
          const lines = eventStr.split('\n');
          let eventName = '';
          let eventData: any = null;

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventName = line.substring(7).trim();
            } else if (line.startsWith('data: ')) {
              try {
                eventData = JSON.parse(line.substring(6).trim());
              } catch {
                // ignore json error
              }
            }
          }

          if (eventName === 'step_start') {
            const stepNum = eventData?.step;
            setActiveStep(stepNum);
            if (stepNum === 1) {
              setProgress((p) => ({ ...p, step1: 'active', retryMessage: undefined }));
            } else if (stepNum === 2) {
              setProgress((p) => ({ ...p, step2: 'active', retryMessage: undefined }));
            } else if (stepNum === 3) {
              setProgress((p) => ({ ...p, step3: 'active', retryMessage: undefined }));
            } else if (stepNum === 4) {
              setProgress((p) => ({ ...p, step4: 'active', retryMessage: undefined }));
            }
          } else if (eventName === 'step_retry') {
            const stepNum = eventData?.step;
            const attempt = eventData?.attempt;
            const maxRetries = eventData?.maxRetries;
            const retryMsg = `Retrying step ${stepNum} (attempt ${attempt}/${maxRetries} after 503 UNAVAILABLE)...`;
            if (stepNum === 1) {
              setProgress((p) => ({ ...p, step1: 'retrying', retryMessage: retryMsg }));
            } else if (stepNum === 2) {
              setProgress((p) => ({ ...p, step2: 'retrying', retryMessage: retryMsg }));
            } else if (stepNum === 3) {
              setProgress((p) => ({ ...p, step3: 'retrying', retryMessage: retryMsg }));
            } else if (stepNum === 4) {
              setProgress((p) => ({ ...p, step4: 'retrying', retryMessage: retryMsg }));
            }
          } else if (eventName === 'step_complete') {
            const stepNum = eventData?.step;
            if (stepNum === 1) {
              setDormancy(eventData.data);
              setProgress((p) => ({ ...p, step1: 'complete', step2: 'active', retryMessage: undefined }));
              setActiveStep(2);
            } else if (stepNum === 2) {
              setDueDiligence(eventData.data);
              setProgress((p) => ({ ...p, step2: 'complete', step3: 'active', retryMessage: undefined }));
              setActiveStep(3);
            } else if (stepNum === 3) {
              setStateCompliance(eventData.data);
              setProgress((p) => ({ ...p, step3: 'complete', step4: 'active', retryMessage: undefined }));
              setActiveStep(4);
            } else if (stepNum === 4) {
              setDecision(eventData.data);
              setProgress((p) => ({ ...p, step4: 'complete', retryMessage: undefined }));
              setActiveStep(0);
            }
          } else if (eventName === 'assessment_done') {
            // Calculate elapsed turnaround time for this finished record run
            const elapsedMs = performance.now() - runStartTime;
            const recordTurnaround = Math.max(0.1, Number((elapsedMs / 1000).toFixed(2)));

            const newAssessmentEntry: ProcessedAssessment = {
              ...eventData.assessment,
              turnaroundSeconds: recordTurnaround,
              elapsedSeconds: recordTurnaround,
              record: {
                ...eventData.assessment.record,
                turnaroundSeconds: recordTurnaround,
              },
            };

            setSelectedHistoryId(newAssessmentEntry.id);

            // Store that exact number as a plain field on that record's own history entry,
            // added to the history array once and never recalculated afterward.
            setHistory((prevHistory) => {
              const withoutCurrent = prevHistory.filter((item) => item.id !== newAssessmentEntry.id);
              const nextHistory = [newAssessmentEntry, ...withoutCurrent];
              setMetrics(computeSessionMetrics(nextHistory));
              return nextHistory;
            });
          } else if (eventName === 'pipeline_error') {
            setErrorMessage(eventData?.message || 'Pipeline execution failed after retry attempts.');
            setProgress((p) => {
              const currentStep = activeStep || 1;
              return {
                ...p,
                [`step${currentStep}`]: 'error',
                retryMessage: undefined,
              };
            });
          }
        }
      }
    } catch (error: any) {
      console.error('Error during streaming assessment, executing standard fallback:', error);
      await runStandardAssessment(runStartTime);
    } finally {
      setIsAssessing(false);
      setActiveStep(0);
    }
  };

  // Fallback direct POST endpoint
  const runStandardAssessment = async (runStartTime: number) => {
    try {
      const response = await fetch('/api/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...record, clientStartTime: Date.now() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error || 'Assessment failed after 503 retries.');
        setProgress((p) => ({ ...p, step1: 'error' }));
        return;
      }
      const elapsedMs = performance.now() - runStartTime;
      const recordTurnaround = Math.max(0.1, Number((elapsedMs / 1000).toFixed(2)));

      if (data.assessment) {
        const newAssessmentEntry: ProcessedAssessment = {
          ...data.assessment,
          turnaroundSeconds: recordTurnaround,
          elapsedSeconds: recordTurnaround,
          record: {
            ...data.assessment.record,
            turnaroundSeconds: recordTurnaround,
          },
        };

        setDormancy(newAssessmentEntry.dormancy);
        setDueDiligence(newAssessmentEntry.dueDiligence);
        setStateCompliance(newAssessmentEntry.stateCompliance);
        setDecision(newAssessmentEntry.decision);
        setProgress({
          step1: 'complete',
          step2: 'complete',
          step3: 'complete',
          step4: 'complete',
        });
        setSelectedHistoryId(newAssessmentEntry.id);

        setHistory((prevHistory) => {
          const withoutCurrent = prevHistory.filter((item) => item.id !== newAssessmentEntry.id);
          const nextHistory = [newAssessmentEntry, ...withoutCurrent];
          setMetrics(computeSessionMetrics(nextHistory));
          return nextHistory;
        });
      }
    } catch (err: any) {
      console.error('Standard assessment failed:', err);
      setErrorMessage(err.message || 'Network error encountered during compliance assessment.');
    }
  };

  // Select historical assessment to inspect
  const handleSelectHistoryAssessment = (item: ProcessedAssessment) => {
    setSelectedHistoryId(item.id);
    setRecord({ ...item.record });
    setDormancy(item.dormancy);
    setDueDiligence(item.dueDiligence);
    setStateCompliance(item.stateCompliance);
    setDecision(item.decision);
    setProgress({
      step1: 'complete',
      step2: 'complete',
      step3: 'complete',
      step4: 'complete',
    });
  };

  // Reset in-memory session
  const handleResetSession = async () => {
    try {
      const res = await fetch('/api/session/reset', { method: 'POST' });
      const data = await res.json();
      setMetrics(data.metrics || INITIAL_METRICS);
      setHistory([]);
      setDormancy(null);
      setDueDiligence(null);
      setStateCompliance(null);
      setDecision(null);
      setProgress(INITIAL_PROGRESS);
      setSelectedHistoryId(undefined);
    } catch (err) {
      console.error('Failed to reset session:', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F8] text-[#18242F] font-sans antialiased">
      {/* 1. Header with Dark Navy background & 4 Live Stat Cards */}
      <Header metrics={metrics} onResetSession={handleResetSession} />

      {/* 2. Compliance Agent Pipeline Horizontal Strip */}
      <AgentPipeline progress={progress} isAssessing={isAssessing} />

      {/* 3. Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Two-Column Section: Form (Left) & Progressive Results (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: New Record Form */}
          <div className="lg:col-span-6 xl:col-span-5">
            <NewRecordForm
              record={record}
              onChange={handleRecordChange}
              onSubmit={handleRunAssessment}
              isAssessing={isAssessing}
              selectedPresetId={selectedPresetId}
              onSelectPreset={handleSelectPreset}
            />
          </div>

          {/* Right Column: Progressive 4-Agent Results */}
          <div className="lg:col-span-6 xl:col-span-7">
            <ResultsColumn
              dormancy={dormancy}
              dueDiligence={dueDiligence}
              stateCompliance={stateCompliance}
              decision={decision}
              record={record}
              isAssessing={isAssessing}
              activeStep={activeStep}
              errorMessage={errorMessage}
              onRetryAssessment={handleRunAssessment}
            />
          </div>
        </div>

        {/* 4. Session History Audit Log Table */}
        <SessionHistoryTable
          history={history}
          onSelectAssessment={handleSelectHistoryAssessment}
          selectedId={selectedHistoryId}
        />

        {/* 5. Value and ROI Analytics */}
        <ValueAndRoi metrics={metrics} />
      </main>

      {/* 6. Footer */}
      <Footer />
    </div>
  );
}
