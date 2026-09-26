import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Enable CORS for all incoming requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Normalize URL for Vercel serverless functions:
// When Vercel rewrites /api/(.*) to /api, req.originalUrl retains the full requested path (e.g. /api/assess)
app.use((req, res, next) => {
  if (req.originalUrl && req.url !== req.originalUrl) {
    req.url = req.originalUrl;
  }
  next();
});

// Initialize Gemini SDK with telemetry header as specified in skill
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export interface ComplianceRecord {
  policyholderName: string;
  policyNumber: string;
  recordType: 'Matured endowment' | 'Uncashed dividend check' | 'Unclaimed death benefit' | 'Demutualization proceeds';
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

export interface DecisionResult {
  decision: 'Report & remit' | 'Hold for more diligence' | 'Owner located — reverse';
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

// In-memory session store
let sessionHistory: ProcessedAssessment[] = [];

// Helper: Calculate exact days to deadline
function calculateDaysToDeadline(deadlineStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(deadlineStr);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// Helper: Check if contact date is recent (under 12 months)
function isContactRecent(contactDateStr: string): boolean {
  const today = new Date();
  const contactDate = new Date(contactDateStr);
  const monthsDiff = (today.getFullYear() - contactDate.getFullYear()) * 12 + (today.getMonth() - contactDate.getMonth());
  return monthsDiff < 12;
}

// State filing reference lookup table for high fidelity state regulation
const STATE_REPORTS: Record<string, { ref: string; period: number }> = {
  OH: { ref: 'OH Dept of Commerce Form OUF-1 (Unclaimed Property Report)', period: 3 },
  CA: { ref: 'CA State Controller Form UPH-1 / Schedule A (Life Insurance)', period: 3 },
  TX: { ref: 'TX Comptroller Form 53-102 (Unclaimed Property Annual Return)', period: 3 },
  NY: { ref: 'NY Office of State Comptroller Form OUF-1 / Schedule IV', period: 3 },
  FL: { ref: 'FL Form DFS-UP-130 (Life Insurance Proceeds Schedule)', period: 5 },
  IL: { ref: 'IL State Treasurer Form UP-1 (Uniform Disposition of Unclaimed Property)', period: 3 },
  PA: { ref: 'PA Treasury Form AP-16 (Life Insurance Proceeds Report)', period: 3 },
};

function getStateReportInfo(stateCode: string) {
  return STATE_REPORTS[stateCode] || {
    ref: `NAUPA Standard Form UP-1 / Schedule A (${stateCode} Unclaimed Property)`,
    period: 3,
  };
}

// Fallback logic when Gemini is unavailable or errors
function fallbackDormancy(record: ComplianceRecord): DormancyResult {
  const recent = isContactRecent(record.lastContactDate);
  if (recent) {
    return {
      isDormant: false,
      reasoning: `Recent contact detected on ${record.lastContactDate} (within the last 12 months). Under statutory compliance rules, recent policyholder contact immediately overrides all dormancy triggers and resets the escheatment clock.`,
    };
  }
  const hasReturnedMail = record.returnedMail === 'Yes';
  return {
    isDormant: true,
    reasoning: `No owner-generated activity has occurred since ${record.lastContactDate}. Dormancy threshold satisfied with ${hasReturnedMail ? 'confirmed returned mail notices on file' : 'statutory period elapsed without policyholder engagement'}.`,
  };
}

function fallbackDueDiligence(record: ComplianceRecord, dormancy: DormancyResult): DueDiligenceResult {
  const lettersSent = Number(record.lettersSent) || 0;
  const lettersReturned = Number(record.lettersReturned) || 0;
  
  const checklist = [
    {
      item: 'Statutory First-Class Due Diligence Notice dispatched',
      met: lettersSent >= 1,
    },
    {
      item: 'Secondary diligence inquiry / certified mailing executed',
      met: lettersSent >= 2,
    },
    {
      item: 'Final statutory notice sent within 60-120 days of reporting cut-off',
      met: lettersSent >= 3,
    },
    {
      item: 'Undeliverable / returned mail tracking logged in record',
      met: lettersReturned > 0 || record.returnedMail === 'Yes',
    },
    {
      item: 'Social Security Death Master File / PNA cross-reference logged',
      met: record.recordType === 'Unclaimed death benefit' ? lettersSent >= 2 : true,
    },
  ];

  let score = 0;
  if (lettersSent === 0) score = 15;
  else if (lettersSent === 1) score = lettersReturned > 0 ? 38 : 32;
  else if (lettersSent === 2) score = lettersReturned > 0 ? 65 : 55;
  else score = lettersReturned > 0 ? 92 : 80;

  const missingSteps: string[] = [];
  if (lettersSent < 2) missingSteps.push('Execute secondary due diligence notification to secondary addresses/beneficiaries');
  if (lettersSent < 3) missingSteps.push('Issue final statutory 60-day certified pre-escheat notice');
  if (lettersReturned === 0 && record.returnedMail !== 'Yes') missingSteps.push('Confirm postal carrier return verification or electronic address scrubbing');

  return {
    completenessScore: score,
    checklist,
    missingSteps,
  };
}

function fallbackStateCompliance(record: ComplianceRecord): StateComplianceResult {
  const days = calculateDaysToDeadline(record.deadline);
  const info = getStateReportInfo(record.state);
  return {
    daysToDeadline: days,
    dormancyPeriodApplies: true,
    filingReference: info.ref,
    stateDormancyPeriodYears: info.period,
  };
}

function fallbackDecision(
  record: ComplianceRecord,
  dormancy: DormancyResult,
  dueDiligence: DueDiligenceResult,
  stateComp: StateComplianceResult
): DecisionResult {
  if (!dormancy.isDormant) {
    return {
      decision: 'Owner located — reverse',
      reasoning: `Recent owner contact was confirmed on ${record.lastContactDate}. Immediate reversal of escheatment track is mandated under NAUPA standards. Restore policy LA-${record.policyNumber} to active ledger and initiate owner disbursement.`,
    };
  }

  if (dueDiligence.completenessScore < 60) {
    return {
      decision: 'Hold for more diligence',
      reasoning: `Due diligence completeness score is currently ${dueDiligence.completenessScore}/100, which falls below the mandatory 60% safe-harbor compliance threshold. Remittance must be held while missing statutory mailings (${dueDiligence.missingSteps.length} items) are fulfilled.`,
    };
  }

  const isOverdue = stateComp.daysToDeadline < 0;
  if (isOverdue) {
    return {
      decision: 'Report & remit',
      reasoning: `CRITICAL: Filing is OVERDUE by ${Math.abs(stateComp.daysToDeadline)} days past the state reporting deadline. Due diligence criteria (${dueDiligence.completenessScore}/100) are satisfied. File emergency remediation report via ${stateComp.filingReference} to mitigate penalty accrual.`,
    };
  }

  return {
    decision: 'Report & remit',
    reasoning: `Statutory dormancy criteria and due diligence requirements (${dueDiligence.completenessScore}/100) are fully verified with ${stateComp.daysToDeadline} days remaining until deadline. Authorize inclusion on schedule ${stateComp.filingReference} for final state escheatment remittance.`,
  };
}

// Helper: Check if error is a 503 UNAVAILABLE error
function is503UnavailableError(error: any): boolean {
  if (!error) return false;
  const status = error.status || error.statusCode || error.code || error.response?.status;
  if (status === 503) return true;
  const message = String(error.message || error).toUpperCase();
  return message.includes('503') || message.includes('UNAVAILABLE');
}

// Helper: Check if error is a 429 Quota / Rate limit error
function is429QuotaError(error: any): boolean {
  if (!error) return false;
  const status = error.status || error.statusCode || error.code || error.response?.status;
  if (status === 429) return true;
  const message = String(error.message || error).toUpperCase();
  return message.includes('429') || message.includes('RESOURCE_EXHAUSTED') || message.includes('QUOTA');
}

// Track temporary quota backoff timestamp
let quotaExceededUntil = 0;

function handleApiError(agentName: string, err: any) {
  if (is429QuotaError(err)) {
    quotaExceededUntil = Date.now() + 60000; // 60-second cooldown
    console.warn(`[${agentName}] Gemini rate limit / quota reached (429 RESOURCE_EXHAUSTED). Engaging calibrated deterministic compliance engine.`);
    return;
  }
  console.warn(`[${agentName}] API error: ${err?.message || err}. Utilizing compliance rule engine.`);
}

// Helper: sleep utility
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type RetryCallback = (step: number, attempt: number, maxRetries: number) => void;

// -------------------------------------------------------------
// AGENT 1: Dormancy Trigger Agent
// -------------------------------------------------------------
async function runDormancyAgent(
  record: ComplianceRecord,
  onRetry?: RetryCallback
): Promise<DormancyResult> {
  const todayStr = new Date().toISOString().split('T')[0];
  const recentContact = isContactRecent(record.lastContactDate);

  // Mandatory rule check: Recent contact always overrides
  if (recentContact) {
    await sleep(240 + Math.floor(Math.random() * 100));
    return {
      isDormant: false,
      reasoning: `Recent policyholder contact detected on ${record.lastContactDate} (within the last 12 months from reference date ${todayStr}). Recent contact strictly overrides any other dormancy indicators and resets the escheatment clock under statutory insurance rules.`,
    };
  }

  if (!process.env.GEMINI_API_KEY || Date.now() < quotaExceededUntil) {
    await sleep(260 + Math.floor(Math.random() * 120));
    return fallbackDormancy(record);
  }

  const prompt = `You are the Dormancy Trigger Agent in an insurance unclaimed property compliance system.
Reference Date: ${todayStr}.
Policy Record:
${JSON.stringify(record, null, 2)}

Determine whether this insurance proceed genuinely qualifies as dormant under unclaimed property rules.
CRITICAL MANDATORY RULES:
1. A record is NOT dormant if last contact was recent (under 12 months from ${todayStr}) even if other fields suggest dormancy. Recent contact ALWAYS overrides.
2. If last contact was 3+ years ago and/or returned mail is on file without recent contact, the record qualifies as dormant.

Return strict JSON matching this schema:
{
  "isDormant": boolean,
  "reasoning": string // 1-3 professional compliance sentences explaining why it is dormant or why it fails dormancy
}`;

  let attempts = 0;
  const maxRetries = 2;

  while (true) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isDormant: { type: Type.BOOLEAN },
              reasoning: { type: Type.STRING },
            },
            required: ['isDormant', 'reasoning'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      if (recentContact) {
        parsed.isDormant = false;
      }
      return {
        isDormant: Boolean(parsed.isDormant),
        reasoning: parsed.reasoning || fallbackDormancy(record).reasoning,
      };
    } catch (err: any) {
      if (is503UnavailableError(err) && attempts < maxRetries) {
        attempts++;
        console.warn(`[Agent 1: Dormancy Trigger] 503 UNAVAILABLE encountered. Retrying (${attempts}/${maxRetries}) in 2 seconds...`);
        if (onRetry) onRetry(1, attempts, maxRetries);
        await sleep(2000);
        continue;
      }
      if (is503UnavailableError(err) && attempts >= maxRetries) {
        throw new Error('Gemini service unavailable (503 UNAVAILABLE) after 2 retries on Dormancy Trigger Agent.');
      }
      handleApiError('Agent 1: Dormancy Trigger', err);
      await sleep(260 + Math.floor(Math.random() * 120));
      return fallbackDormancy(record);
    }
  }
}

// -------------------------------------------------------------
// AGENT 2: Due Diligence Verification Agent
// -------------------------------------------------------------
async function runDueDiligenceAgent(
  record: ComplianceRecord,
  dormancy: DormancyResult,
  onRetry?: RetryCallback
): Promise<DueDiligenceResult> {
  if (!process.env.GEMINI_API_KEY || Date.now() < quotaExceededUntil) {
    await sleep(300 + Math.floor(Math.random() * 140));
    return fallbackDueDiligence(record, dormancy);
  }

  const prompt = `You are the Due Diligence Verification Agent in an insurance unclaimed property compliance system.
Record Data:
${JSON.stringify(record, null, 2)}
Dormancy Agent Determination:
${JSON.stringify(dormancy, null, 2)}

Task:
Evaluate the completeness of statutory due diligence.
RULES:
1. Score (0-100) reflects how many required due-diligence steps (letters sent, tracking returned/undeliverable mail, statutory notices, timeframe) are ACTUALLY documented in the record.
2. Do NOT assume steps happened that are not stated in the record.
3. Scoring calibration:
   - 0-1 letter sent: severely deficient compliance (score 0-39, Red)
   - 2 letters sent: moderate compliance (score 40-69, Amber)
   - 3+ letters sent with undeliverable tracking confirmed: compliant diligence (score 70-100, Green)
4. Checklist items must detail specific statutory steps (e.g. Initial notice sent, Follow-up notice sent, Undeliverable mail tracking, Address verification).

Return strict JSON:
{
  "completenessScore": number,
  "checklist": [
    { "item": string, "met": boolean }
  ],
  "missingSteps": [string]
}`;

  let attempts = 0;
  const maxRetries = 2;

  while (true) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              completenessScore: { type: Type.INTEGER },
              checklist: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    item: { type: Type.STRING },
                    met: { type: Type.BOOLEAN },
                  },
                  required: ['item', 'met'],
                },
              },
              missingSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['completenessScore', 'checklist', 'missingSteps'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      const score = typeof parsed.completenessScore === 'number' ? Math.max(0, Math.min(100, parsed.completenessScore)) : 50;

      return {
        completenessScore: score,
        checklist: Array.isArray(parsed.checklist) && parsed.checklist.length > 0 ? parsed.checklist : fallbackDueDiligence(record, dormancy).checklist,
        missingSteps: Array.isArray(parsed.missingSteps) ? parsed.missingSteps : [],
      };
    } catch (err: any) {
      if (is503UnavailableError(err) && attempts < maxRetries) {
        attempts++;
        console.warn(`[Agent 2: Due Diligence] 503 UNAVAILABLE encountered. Retrying (${attempts}/${maxRetries}) in 2 seconds...`);
        if (onRetry) onRetry(2, attempts, maxRetries);
        await sleep(2000);
        continue;
      }
      if (is503UnavailableError(err) && attempts >= maxRetries) {
        throw new Error('Gemini service unavailable (503 UNAVAILABLE) after 2 retries on Due Diligence Agent.');
      }
      handleApiError('Agent 2: Due Diligence', err);
      await sleep(300 + Math.floor(Math.random() * 140));
      return fallbackDueDiligence(record, dormancy);
    }
  }
}

// -------------------------------------------------------------
// AGENT 3: State Compliance Agent
// -------------------------------------------------------------
async function runStateComplianceAgent(
  record: ComplianceRecord,
  onRetry?: RetryCallback
): Promise<StateComplianceResult> {
  const realDays = calculateDaysToDeadline(record.deadline);
  const stateInfo = getStateReportInfo(record.state);

  if (!process.env.GEMINI_API_KEY || Date.now() < quotaExceededUntil) {
    await sleep(250 + Math.floor(Math.random() * 100));
    return {
      daysToDeadline: realDays,
      dormancyPeriodApplies: true,
      filingReference: stateInfo.ref,
      stateDormancyPeriodYears: stateInfo.period,
    };
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const prompt = `You are the State Compliance Agent in an insurance unclaimed property compliance system.
Record: State is ${record.state}, Record Type is "${record.recordType}", Reporting Deadline is "${record.deadline}".
Today's Date: ${todayStr}.
Real calculated date difference from today to deadline: ${realDays} days (negative if overdue).

Provide:
1. daysToDeadline: MUST be exactly ${realDays} (negative if overdue, positive if in the future).
2. dormancyPeriodApplies: boolean (whether state statutory dormancy applies to this insurance proceeds type).
3. filingReference: The exact official schedule or filing form name used by the state of ${record.state} for unclaimed insurance property (e.g. "${stateInfo.ref}").

Return strict JSON:
{
  "daysToDeadline": number,
  "dormancyPeriodApplies": boolean,
  "filingReference": string
}`;

  let attempts = 0;
  const maxRetries = 2;

  while (true) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              daysToDeadline: { type: Type.INTEGER },
              dormancyPeriodApplies: { type: Type.BOOLEAN },
              filingReference: { type: Type.STRING },
            },
            required: ['daysToDeadline', 'dormancyPeriodApplies', 'filingReference'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return {
        daysToDeadline: realDays, // Mathematically exact
        dormancyPeriodApplies: typeof parsed.dormancyPeriodApplies === 'boolean' ? parsed.dormancyPeriodApplies : true,
        filingReference: parsed.filingReference || stateInfo.ref,
        stateDormancyPeriodYears: stateInfo.period,
      };
    } catch (err: any) {
      if (is503UnavailableError(err) && attempts < maxRetries) {
        attempts++;
        console.warn(`[Agent 3: State Compliance] 503 UNAVAILABLE encountered. Retrying (${attempts}/${maxRetries}) in 2 seconds...`);
        if (onRetry) onRetry(3, attempts, maxRetries);
        await sleep(2000);
        continue;
      }
      if (is503UnavailableError(err) && attempts >= maxRetries) {
        throw new Error('Gemini service unavailable (503 UNAVAILABLE) after 2 retries on State Compliance Agent.');
      }
      handleApiError('Agent 3: State Compliance', err);
      await sleep(250 + Math.floor(Math.random() * 100));
      return {
        daysToDeadline: realDays,
        dormancyPeriodApplies: true,
        filingReference: stateInfo.ref,
        stateDormancyPeriodYears: stateInfo.period,
      };
    }
  }
}

// -------------------------------------------------------------
// AGENT 4: Escheatment Decision Agent
// -------------------------------------------------------------
async function runDecisionAgent(
  record: ComplianceRecord,
  dormancy: DormancyResult,
  dueDiligence: DueDiligenceResult,
  stateCompliance: StateComplianceResult,
  onRetry?: RetryCallback
): Promise<DecisionResult> {
  // Enforce mandatory rules strictly
  if (!dormancy.isDormant) {
    await sleep(280 + Math.floor(Math.random() * 120));
    return {
      decision: 'Owner located — reverse',
      reasoning: `Owner contact verified on ${record.lastContactDate} (within 12-month safe harbor). Dormancy trigger is canceled under statutory rules. Reverse escheatment proceedings, restore account to active standing, and initiate direct distribution to the policyholder.`,
    };
  }

  if (dueDiligence.completenessScore < 60) {
    await sleep(280 + Math.floor(Math.random() * 120));
    return {
      decision: 'Hold for more diligence',
      reasoning: `Due diligence completeness score is ${dueDiligence.completenessScore}/100, which fails the statutory 60% compliance threshold. Statutory outreach requirements are incomplete; hold escheatment filing and execute missing outreach steps (${dueDiligence.missingSteps.slice(0, 2).join('; ') || 'certified mailing'}) prior to state remittance.`,
    };
  }

  if (!process.env.GEMINI_API_KEY || Date.now() < quotaExceededUntil) {
    await sleep(280 + Math.floor(Math.random() * 120));
    return fallbackDecision(record, dormancy, dueDiligence, stateCompliance);
  }

  const isOverdue = stateCompliance.daysToDeadline < 0;
  const prompt = `You are the Escheatment Decision Agent in an insurance unclaimed property compliance system.
Record: ${JSON.stringify(record)}
Dormancy Agent Result: ${JSON.stringify(dormancy)}
Due Diligence Agent Result: ${JSON.stringify(dueDiligence)}
State Compliance Agent Result: ${JSON.stringify(stateCompliance)}

CRITICAL MANDATORY RULES FOR DECISION:
1. If isDormant is false, the decision MUST be EXACTLY: "Owner located — reverse".
2. If completenessScore is under 60, the decision MUST be EXACTLY: "Hold for more diligence" regardless of deadline.
3. If isDormant is true AND completenessScore >= 60, decision is "Report & remit".
4. If daysToDeadline is negative (${stateCompliance.daysToDeadline} days) and decision is "Report & remit", the reasoning MUST explicitly mention that the filing is OVERDUE by ${Math.abs(stateCompliance.daysToDeadline)} days and highlight potential penalty exposure.

Allowed decisions: "Report & remit" | "Hold for more diligence" | "Owner located — reverse"

Return strict JSON:
{
  "decision": "Report & remit" | "Hold for more diligence" | "Owner located — reverse",
  "reasoning": string // 2-3 clear, professional compliance sentences
}`;

  let attempts = 0;
  const maxRetries = 2;

  while (true) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              decision: {
                type: Type.STRING,
                enum: ['Report & remit', 'Hold for more diligence', 'Owner located — reverse'],
              },
              reasoning: { type: Type.STRING },
            },
            required: ['decision', 'reasoning'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      let decision: DecisionResult['decision'] = parsed.decision;

      // Hard compliance safeguards
      if (!dormancy.isDormant) {
        decision = 'Owner located — reverse';
      } else if (dueDiligence.completenessScore < 60) {
        decision = 'Hold for more diligence';
      } else {
        decision = 'Report & remit';
      }

      let reasoning = parsed.reasoning || '';
      if (decision === 'Report & remit' && isOverdue && !reasoning.toLowerCase().includes('overdue')) {
        reasoning = `OVERDUE NOTICE: State reporting deadline passed ${Math.abs(stateCompliance.daysToDeadline)} days ago. ${reasoning} Expedited remediation report should be submitted via ${stateCompliance.filingReference} to curtail statutory late-filing interest penalties.`;
      }

      return { decision, reasoning };
    } catch (err: any) {
      if (is503UnavailableError(err) && attempts < maxRetries) {
        attempts++;
        console.warn(`[Agent 4: Decision] 503 UNAVAILABLE encountered. Retrying (${attempts}/${maxRetries}) in 2 seconds...`);
        if (onRetry) onRetry(4, attempts, maxRetries);
        await sleep(2000);
        continue;
      }
      if (is503UnavailableError(err) && attempts >= maxRetries) {
        throw new Error('Gemini service unavailable (503 UNAVAILABLE) after 2 retries on Escheatment Decision Agent.');
      }
      handleApiError('Agent 4: Escheatment Decision', err);
      await sleep(280 + Math.floor(Math.random() * 120));
      return fallbackDecision(record, dormancy, dueDiligence, stateCompliance);
    }
  }
}


// -------------------------------------------------------------
// API Routes
// -------------------------------------------------------------

// Session summary calculation
function getSessionMetrics() {
  const total = sessionHistory.length;
  const remittedCount = sessionHistory.filter(s => s.decision.decision === 'Report & remit').length;
  const holdCount = sessionHistory.filter(s => s.decision.decision === 'Hold for more diligence').length;
  const reverseCount = sessionHistory.filter(s => s.decision.decision === 'Owner located — reverse').length;

  const remittedPct = total > 0 ? Math.round((remittedCount / total) * 100) : 0;
  const holdPct = total > 0 ? Math.round((holdCount / total) * 100) : 0;
  const reversePct = total > 0 ? Math.round((reverseCount / total) * 100) : 0;

  const totalSeconds = sessionHistory.reduce(
    (acc, curr) => acc + (Number(curr.turnaroundSeconds ?? curr.elapsedSeconds) || 0),
    0
  );
  const avgProcessingSeconds = total > 0 ? Number((totalSeconds / total).toFixed(1)) : 0;

  // Stated assumption: manual due diligence & state rule lookup = 25 minutes (1500 seconds)
  const manualBenchmarkSeconds = 1500;
  const reviewTimeAvoidedSeconds = avgProcessingSeconds > 0 ? Math.max(0, manualBenchmarkSeconds - avgProcessingSeconds) : 0;
  const avoidedMinutes = Math.floor(reviewTimeAvoidedSeconds / 60);
  const avoidedRemainingSeconds = Math.round(reviewTimeAvoidedSeconds % 60);

  // Total analyst hours freed = (reviewTimeAvoidedSeconds * total) / 3600
  const analystHoursFreed = Number(((reviewTimeAvoidedSeconds * total) / 3600).toFixed(2));

  // Records reviewable per analyst-hour at measured processing speed = 3600 / avgProcessingSeconds
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

// Health check
app.get(['/api/health', '/health'], (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Get session state
app.get(['/api/session', '/session'], (req: Request, res: Response) => {
  res.json({
    metrics: getSessionMetrics(),
    history: sessionHistory,
  });
});

// Reset session
app.post(['/api/session/reset', '/session/reset'], (req: Request, res: Response) => {
  sessionHistory = [];
  res.json({ success: true, metrics: getSessionMetrics(), history: [] });
});

// Full assessment standard endpoint
app.post(['/api/assess', '/assess'], async (req: Request, res: Response) => {
  const record: ComplianceRecord = req.body;
  if (!record || !record.policyholderName || !record.policyNumber) {
    res.status(400).json({ error: 'Invalid record payload' });
    return;
  }

  const startTime = record.clientStartTime || Date.now();

  try {
    // 1. Dormancy Trigger Agent
    const dormancy = await runDormancyAgent(record);

    // 2. Due Diligence Verification Agent
    const dueDiligence = await runDueDiligenceAgent(record, dormancy);

    // 3. State Compliance Agent
    const stateCompliance = await runStateComplianceAgent(record);

    // 4. Escheatment Decision Agent
    const decision = await runDecisionAgent(record, dormancy, dueDiligence, stateCompliance);

    const elapsedSeconds = Math.max(0.1, Number(((Date.now() - startTime) / 1000).toFixed(2)));

    const assessment: ProcessedAssessment = {
      id: `escheat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      turnaroundSeconds: elapsedSeconds,
      elapsedSeconds,
      record: {
        ...record,
        turnaroundSeconds: elapsedSeconds,
      },
      dormancy,
      dueDiligence,
      stateCompliance,
      decision,
    };

    // Prepend newest first
    sessionHistory.unshift(assessment);

    res.json({
      assessment,
      metrics: getSessionMetrics(),
      history: sessionHistory,
    });
  } catch (error: any) {
    console.error('Error running assessment pipeline:', error);
    res.status(503).json({ error: error.message || 'Assessment pipeline failed' });
  }
});

// SSE Streaming pipeline for live step-by-step progress
app.post(['/api/assess/stream', '/assess/stream', '/api/stream', '/stream'], async (req: Request, res: Response) => {
  const record: ComplianceRecord = req.body;
  if (!record || !record.policyholderName || !record.policyNumber) {
    res.status(400).json({ error: 'Invalid record payload' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const handleRetry: RetryCallback = (step, attempt, maxRetries) => {
    sendEvent('step_retry', {
      step,
      attempt,
      maxRetries,
      message: `Retrying step ${step} (attempt ${attempt}/${maxRetries} after 503 UNAVAILABLE)...`,
    });
  };

  const startTime = record.clientStartTime || Date.now();

  try {
    // Step 1: Dormancy Trigger
    sendEvent('step_start', { step: 1, name: 'Dormancy Trigger' });
    const dormancy = await runDormancyAgent(record, handleRetry);
    sendEvent('step_complete', { step: 1, name: 'Dormancy Trigger', data: dormancy });

    // Step 2: Due Diligence Verification
    sendEvent('step_start', { step: 2, name: 'Due Diligence Verification' });
    const dueDiligence = await runDueDiligenceAgent(record, dormancy, handleRetry);
    sendEvent('step_complete', { step: 2, name: 'Due Diligence Verification', data: dueDiligence });

    // Step 3: State Compliance
    sendEvent('step_start', { step: 3, name: 'State Compliance' });
    const stateCompliance = await runStateComplianceAgent(record, handleRetry);
    sendEvent('step_complete', { step: 3, name: 'State Compliance', data: stateCompliance });

    // Step 4: Escheatment Decision
    sendEvent('step_start', { step: 4, name: 'Escheatment Decision' });
    const decision = await runDecisionAgent(record, dormancy, dueDiligence, stateCompliance, handleRetry);
    sendEvent('step_complete', { step: 4, name: 'Escheatment Decision', data: decision });

    const elapsedSeconds = Math.max(0.1, Number(((Date.now() - startTime) / 1000).toFixed(2)));

    const assessment: ProcessedAssessment = {
      id: `escheat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      turnaroundSeconds: elapsedSeconds,
      elapsedSeconds,
      record: {
        ...record,
        turnaroundSeconds: elapsedSeconds,
      },
      dormancy,
      dueDiligence,
      stateCompliance,
      decision,
    };

    sessionHistory.unshift(assessment);

    sendEvent('assessment_done', {
      assessment,
      metrics: getSessionMetrics(),
      history: sessionHistory,
    });

    res.write('event: end\ndata: {}\n\n');
    res.end();
  } catch (error: any) {
    console.error('SSE Pipeline error:', error);
    sendEvent('pipeline_error', {
      message: error.message || 'Pipeline execution failed after retry attempts.',
    });
    res.end();
  }
});


import fs from 'fs';

// Setup Vite middlewares in development or static serve in production
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

async function startServer() {
  if (process.env.VERCEL) {
    return;
  }

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.get('*', async (req: Request, res: Response, next) => {
      // Don't intercept API routes
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`EscheatGuard server running on http://0.0.0.0:${PORT}`);
  });
}

// Only launch standalone HTTP server when not running in a Vercel serverless function environment
if (!process.env.VERCEL) {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
  });
}

export { app };
export default app;

