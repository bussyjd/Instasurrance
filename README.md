# Instasurrance — WhatsApp-Style SME Health AI Broker MVP

A standalone, zero-dependency WhatsApp-style AI broker prototype for KSA SME Health Insurance, combining **TypeSafe System One (`jev-1.14.0`)** for fast, deterministic decisions/bounding-box localization with **Google Gemini** for conversational responses.

## Features

- **WhatsApp-Style Split Interface (`index.html`)**:
  - Auto-captured WhatsApp name and phone number; HR only provides a work email and drops their old contract/census.
  - **First-Estimate Gate**: Predetermined package suggestions stay hidden in the left sidebar until a first estimate is triggered in chat.
  - **HR "Blame Shield" Certificate**: Co-signed by a named human Senior Account Manager (*Tariq Al-Mansour*) benchmarking every clause as **🟢 Above Standard**, **🔵 Market Standard**, or **🔴 Below Standard / Coverage Gap**.
- **TypeSafe `jev-1.14.0` + `Box` + Gemini Backend (`server.mjs`)**:
  - Runs parallel System One primitives (`noul`, `choice`, `score`, and `box` with `TypeSafe-Danger-Zone-Images: true`) on every turn to gate estimates, score predetermined packages (`SME Gold Plus`, `Business Care Silver`, `Essential Saver SME`), enforce guardrails (3-day underwriter SLA warning on `0% copay`, regulated tariff discount refusal, polite de-escalation on hostility), and locate 9pt contract clauses on scanned pages.
  - Tracks live token usage and session cost in the top telemetry bar.

## Repository Contents: Transcripts, Docs & Knowledge Base

### 1. Meeting Transcripts (`transcripts/`)
- [`transcripts/2026-10-15_meeting-1_ibrahim-jd-peter_briefing.md`](transcripts/2026-10-15_meeting-1_ibrahim-jd-peter_briefing.md) (`.json` also included) — Full Wispr Flow executive summary and verbatim transcript of **Meeting 1: AI-Powered Fast Insurance Quotations** (Ibrahim Itani, Jean-Daniel BUSSY, Peter Milan Trapp).
- [`transcripts/2026-10-15_meeting-2_peter-jd_prototype-scoping.md`](transcripts/2026-10-15_meeting-2_peter-jd_prototype-scoping.md) (`.json` also included) — Full Wispr Flow executive summary and verbatim transcript of **Meeting 2: WhatsApp AI Insurance Broker Prototype Scoping** (Peter Milan Trapp & Jean-Daniel BUSSY).

### 2. Product & Technical Documents (`docs/`)
- [`docs/PRODUCT_AND_PROTOTYPE_PLAN.md`](docs/PRODUCT_AND_PROTOTYPE_PLAN.md) — Synthesis of both discovery meetings, UX architecture, color palette tokens, and product requirements.
- [`docs/TYPESAFE_SYSTEM_ONE_ARCHITECTURE.md`](docs/TYPESAFE_SYSTEM_ONE_ARCHITECTURE.md) — Deep dive into TypeSafe `jev-1.14.0`, `TypeSafe-Danger-Zone-Images: true`, `box` spatial grounding, and parallel speculative fan-out judgments.
- [`docs/SAMPLE_OLD_POLICY_AND_CENSUS.md`](docs/SAMPLE_OLD_POLICY_AND_CENSUS.md) — Sample expiring policy schedule, 84-employee SME census fixture, and verbatim 9pt contract clauses.

### 3. Domain Knowledge Base (`knowledge-base/`)
- [`knowledge-base/ksa-sme-health-broker-kb.md`](knowledge-base/ksa-sme-health-broker-kb.md) — KSA SME Health Insurance domain rules, predetermined package tiers (1–999 lives), 3-day manual underwriting SLA triggers, HR "Blame Shield" protocol, and guardrail playbooks.
- [`knowledge-base/packages-and-benchmarks.json`](knowledge-base/packages-and-benchmarks.json) — Machine-readable JSON schema of the 3 predetermined SME packages, KSA market benchmarks, and 9pt contract clause definitions.

## Quick Start

1. Copy `.env.example` to `.env` and fill in your API keys:
   ```bash
   cp .env.example .env
   ```
2. Start the server:
   ```bash
   node server.mjs
   ```
3. Open `http://localhost:3030` in your browser.
