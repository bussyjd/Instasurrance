# TypeSafe System One (`jev-1.14.0`) Architecture & Image Capabilities

This document details how **TypeSafe System One (`jev-1.14.0`)** is integrated into `Instasurrance` alongside Google Gemini, including a synopsis of the `jev-1.14.0` release, the `TypeSafe-Danger-Zone-Images: true` header, and the `box` primitive.

---

## 1. Synopsis of TypeSafe `jev-1.14.0` & Image Primitives

### A. What's New in `jev-1.14.0` (System One)
1. **First Multimodal System One Release:** `jev-1.14.0` brings image understanding and spatial grounding directly into System One (`POST https://api.typesafe.ai/v1/systemone`) while keeping sub-second latency (~195ms–300ms).
2. **`box` Primitive (Spatial Grounding):** Returns normalized `[0, 1]` bounding-box coordinates (`{ top, bottom, left, right }`) plus a calibrated `confidence` score for any described visual target inside an image asset.
3. **Full Primitive Support Over Images:** All existing System One primitives (`noul`/`bool`, `choice`, `score`/`rate`, `prob`, `span`) work over image assets in `state` alongside text and JSON.
4. **Speculative Fan-Out (Single-Pass Parallelism):** A single request can evaluate multiple `box`, `noul`, `choice`, and `score` questions in parallel over the same `state` and `assets` payload.
5. **Opt-In Header (`TypeSafe-Danger-Zone-Images: true`):** Image models are enabled per-request by passing the HTTP header `TypeSafe-Danger-Zone-Images: true` and referencing base64 image assets (`png` or `jpg`) in the top-level `assets` map from `state`.

---

## 2. How `Instasurrance` Uses TypeSafe System One

In [server.mjs](../server.mjs), every `/api/chat` turn executes a two-stage pipeline:

### Stage 1: TypeSafe System One (`callTypeSafeSystemOne`)
A single `POST https://api.typesafe.ai/v1/systemone` request with `model: "jev-1.14.0"` evaluates 8 parallel atomic questions (plus 7 visual `box` and benchmark `choice` questions when a 9pt contract scan image is attached):

| Question Key | Primitive | Purpose in Broker Flow |
| :--- | :--- | :--- |
| `is_estimate_ready` | `noul` | Gates the left sidebar's 3 predetermined package suggestions until the user provides company/headcount/policy details or asks for an estimate. |
| `intent_route` | `choice` | Classifies primary turn intent (`package_estimate`, `contract_decode`, `zero_copay_request`, `discount_request`, `hostile_insult`, `general_question`). |
| `hostility_score` | `score` | 3-level rubric (`0..2`) measuring user frustration or hostility to trigger the **Polite De-escalation** guardrail. |
| `wants_zero_copay` | `noul` | Detects requests for `0% copay` / zero deductible to trigger the **3-Day Manual Underwriter SLA Warning**. |
| `wants_discount` | `noul` | Detects requests for arbitrary discounts to trigger the **Regulated Tariff** guardrail. |
| `explains_contract_clauses` | `noul` | Determines whether to surface the 9pt contract clause bounded-box cards. |
| `priority_vip_and_optical` | `score` | Scores how strongly the HR buyer prioritizes high optical limits (`SAR 2,000`), a `60-day` claim window, and VIP hospitals. |
| `priority_budget_saving` | `score` | Scores how strongly the HR buyer prioritizes reducing annual premium spend. |
| `claim_window_box`, `privacy_box`, `optical_box`, `physio_box` | `box` | *(When `TypeSafe-Danger-Zone-Images: true` is active)* Locates Clauses 4.2, 7.1, 9.4, and 11.3 on the scanned 9pt contract image (`sample-contract-scan.png`). |
| `claim_window_benchmark`, `optical_benchmark`, `physio_benchmark` | `choice` | *(When image is attached)* Benchmarks each visual clause against KSA market standards (`ABOVE_STANDARD`, `STANDARD`, `BELOW_STANDARD`). |

### Stage 2: Deterministic Code + Gemini Generation (`callGemini`)
1. **Code Owns the Workflow:** [server.mjs](../server.mjs) combines `priority_vip_and_optical` and `priority_budget_saving` into deterministic match percentages for **SME Gold Plus**, **Business Care Silver**, and **Essential Saver SME**, and locks in the active guardrail state and `estimate_ready` boolean.
2. **Constrained Conversational Reply:** Google Gemini (`gemini-3.5-flash-lite`) receives the locked TypeSafe decision in its prompt context and generates the concise WhatsApp-style markdown reply and structured clause cards.
