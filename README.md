# EscheatGuard

A multi-agent AI compliance decision-support demo for insurance escheatment (unclaimed property) processing.

Built to explore how agentic AI applies to a real regulatory compliance
process — specifically the escheatment reversal workflow I previously
automated manually as a Software Engineer at Cognizant. This demo asks: what
does the same judgment process look like when broken into specialist AI
agents instead of hard-coded logic?

**This is a demonstration tool using entirely synthetic data.** It is not
connected to any real carrier, state database, or policyholder record, and
its output is advisory only — a human compliance officer makes every real
filing or reversal decision.

## How it works

A record moves through four agents in sequence, each building on the last:

| Agent | Checks | Can override |
| --- | --- | --- |
| Dormancy Trigger | Has this record genuinely gone dormant, or was there recent contact? | Recent contact forces a reversal, regardless of any other agent's finding |
| Due Diligence Verification | Were the legally required owner-outreach steps completed and documented? | An incomplete score forces a hold, regardless of the deadline |
| State Compliance | Which state's rules apply, and how close is the reporting deadline? | Flags overdue filings in the final reasoning |
| Escheatment Decision | Combines all three outputs into one of: Report & remit / Hold for more diligence / Owner located — reverse | — |

The interesting design decision is the override logic: the Due Diligence and
State Compliance agents reason independently and know nothing about each
other's findings, but the final Decision agent can override a
risk-appropriate outcome the moment an upstream agent flags a genuine
problem. A well-priced, well-documented record can still be held back
entirely because someone was contacted last month.

## Try it — four built-in test cases

Each sample record in the "Load sample record" dropdown prefills the entire
form and attaches a placeholder supporting document, so you can run it in
one click.

| Sample | What it tests | Expected decision |
| --- | --- | --- |
| (a) Clean dormancy | A straightforward, fully documented case | Report & remit |
| (b) Incomplete due diligence | Due diligence steps are missing or unproven | Hold for more diligence, regardless of deadline |
| (c) Owner located mid-process | Recent contact overriding an otherwise-complete file | Owner located — reverse |
| (d) Overdue, high exposure | A deadline already missed | Report & remit, with the overdue status explicitly named in the reasoning |

## Value and ROI methodology

The dashboard's ROI section is deliberately split into two categories:

- **Measured** — figures computed live from the actual session: records
  processed, decision split, and the real wall-clock time each run took.
- **Projected** — figures built on one explicitly stated assumption (manual
  review averaging 25 minutes per record), never hidden in the calculation.

This split exists so the page never overstates what a synthetic demo can
actually prove.

## Tech stack

React + TypeScript frontend, Node.js/Express backend, Google Gemini API for
the four agent calls. Built in Google AI Studio's Build mode.

## Running locally

```
npm install
cp .env.example .env   # add your own Gemini API key
npm run dev
```

## Disclaimer

All policyholder names, policy numbers, and records in this repository are
synthetic and were generated for demonstration purposes only. No real
carrier, claimant, or state data is used or referenced.

---
Built by Meghna Murali · IIM Kozhikode, PGP-BL
