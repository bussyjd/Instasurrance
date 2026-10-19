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
