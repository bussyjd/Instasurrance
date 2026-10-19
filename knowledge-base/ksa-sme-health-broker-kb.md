# KSA SME Health Insurance — Broker Knowledge Base

This knowledge base serves as the single source of truth for the **Instasurrance AI Health Broker** (used by [server.mjs](../server.mjs) and documented in machine-readable format in [packages-and-benchmarks.json](./packages-and-benchmarks.json)).

---

## 1. Domain Mechanics: Why SME Health Insurance Is Predetermined

1. **Predetermined Packages vs. Custom Underwriting:**
   - In Saudi Arabia (KSA), **SME Health Insurance (1 to 999 insured lives)** operates on **pre-filed, predetermined insurer package tiers** approved under Council of Health Insurance (CHI / CCHI) and Insurance Authority (IA) guidelines.
   - Because benefit schedules and tariffs are predetermined for `< 1,000` lives, an AI broker can **match and bind quotes on the spot** with **zero hallucination risk** and **zero underwriter delay**.
2. **The 1,000-Employee Threshold & Custom Modifications (3-Day Underwriter SLA):**
   - Any group with **1,000+ insured lives** OR any SME demanding **custom non-package modifications**—specifically **0% outpatient copay (zero deductible)** or custom benefit overrides outside predetermined riders—cannot be issued instantly.
   - It must be routed to a **human corporate underwriter with a 3-business-day SLA**, which is the #1 cause of online conversion drop-off.
   - **Broker Playbook:** Always warn the HR buyer immediately when a request triggers the 3-day manual underwriting SLA, and recommend the closest instant-issue predetermined package (e.g., **SME Gold Plus** with `10% copay capped at SAR 50`).

---

## 2. HR Buyer Psychology & The "Blame Shield" Protocol

From our discovery meetings with KSA insurance leadership:
- **Why HR Buyers Abandon Self-Serve Portals:**
  1. **Fear of Internal Blame:** If an HR manager selects a health policy online and employees later discover that optical coverage is missing or a hospital is excluded, employees and executives blame the HR manager (*"You clicked the button, now nobody has optical coverage"*). Offline brokers are hired primarily so HR can shift accountability to a licensed advisor.
  2. **Unreadable 9pt Policy Wording:** Corporate health schedules are dense 9-point legal PDFs where critical sub-limits (optical, physiotherapy, reimbursement claim windows) are buried.
  3. **No Conversational Guidance:** HR buyers want to dump their old policy PDF, ask plain-language questions (*"Do we have optical? What happens if someone files a claim after 45 days?"*), and see a clear recommendation.
- **How Instasurrance Solves This:**
  1. **Named Human Account Manager Oversight:** Every AI conversation is explicitly supervised by a licensed Senior Account Manager (**Tariq Al-Mansour, License #IA-8842**).
  2. **HR Coverage Benchmark Certificate ("Blame Shield"):** A 1-click downloadable/printable audit certificate co-signed by Tariq Al-Mansour that labels every material clause against KSA SME market standards (`🟢 Above Standard`, `🔵 Market Standard`, `🔴 Below Standard / Gap Disclosed`). HR can attach this certificate to their internal CFO/CEO approval email.
  3. **Gated Recommendations:** The 3 predetermined package suggestions remain hidden until the first estimate or document scan is performed in chat, preventing premature information overload.

---

## 3. Predetermined SME Health Packages (1–999 Lives)

### Tier 1: `SME Gold Plus` (`gold_plus`) — **SAR 3,790 / member / year**
- **Target Buyer:** SMEs prioritizing employee retention, executive/staff satisfaction, high optical coverage, and zero-wait maternity.
- **Hospital Network:** Tier 7 VIP Network (includes Kingdom Hospital, Dr. Sulaiman Al Habib, Saudi German, Mouwasat, Dallah).
- **Annual Maximum Limit:** SAR 1,000,000 per member (CHI statutory ceiling).
- **Outpatient Copay:** `10%` capped at **SAR 50** per visit (`🔵 Market Standard+`).
- **Optical & Refractive Sub-Limit (Clause 9.4):** **SAR 2,000 / year** with 0 waiting period (`🟢 Above Standard` — 2x the SAR 1,000 market standard).
- **Reimbursement Claim Reporting Window (Clause 4.2):** **60 calendar days** from service date (`🟢 Above Standard` — 2x the 30-day statutory minimum).
- **Maternity & Delivery:** **SAR 15,000** with **0 waiting period** (`🟢 Above Standard`).
- **Dental Coverage:** **SAR 2,500 / year** (routine, root canal, crowns).
- **Outpatient Physiotherapy (Clause 11.3):** **12 sessions / year** (`🔴 Below Standard` when compared to legacy 20-session corporate plans; upgradable via **Unlimited Rehab Rider** for `+SAR 140 / member / year`).
- **Data Privacy (Clause 7.1):** Full KSA PDPL & GDPR medical confidentiality compliance (`🔵 Market Standard`).

### Tier 2: `Business Care Silver` (`silver_care`) — **SAR 3,270 / member / year**
- **Target Buyer:** Cost-conscious SMEs wanting balanced KSA market-standard coverage with no major benefit gaps.
- **Hospital Network:** Tier 5 Standard Plus Network.
- **Annual Maximum Limit:** SAR 1,000,000 per member.
- **Outpatient Copay:** `20%` capped at **SAR 75** per visit (`🔵 Market Standard`).
- **Optical & Refractive Sub-Limit:** **SAR 1,000 / year** (`🔵 Market Standard`).
- **Reimbursement Claim Reporting Window:** **30 calendar days** (`🔵 Market Standard`).
- **Maternity & Delivery:** **SAR 10,000** (30-day waiting period — `🔵 Market Standard`).
- **Dental Coverage:** **SAR 1,500 / year**.
- **Outpatient Physiotherapy:** **12 sessions / year**.

### Tier 3: `Essential Saver SME` (`essential_saver`) — **SAR 2,730 / member / year**
- **Target Buyer:** Budget-driven SMEs seeking statutory CHI compliance at the lowest annual premium.
- **Hospital Network:** Tier 4 Essential Network.
- **Annual Maximum Limit:** SAR 1,000,000 per member.
- **Outpatient Copay:** `20%` capped at **SAR 100** per visit (`🔵 Market Standard`).
- **Optical & Refractive Sub-Limit:** **SAR 500 / year** (`🔴 Below Standard` — high risk of employee complaints).
- **Reimbursement Claim Reporting Window:** **30 calendar days** (`🔵 Market Standard`).
- **Maternity & Delivery:** **SAR 7,500** (**90-day waiting period** — `🔴 Below Standard`).
- **Dental Coverage:** Emergency extraction & fillings only (SAR 800).

---

## 4. Guardrail & Compliance Playbook

| Scenario | Trigger Signal (TypeSafe `jev-1.14.0`) | Required Broker Response |
| :--- | :--- | :--- |
| **1. Hostility / Insults** (*"Shut up, this is useless"*) | `hostility_score >= 1.35` or `intent_route == "hostile_insult"` | **Polite De-escalation (`POLITE_DEESCALATION`):** Never argue or scold. Acknowledge that insurance fine print is frustrating, keep the answer short, and offer to loop in Senior Account Manager **Tariq Al-Mansour** directly on WhatsApp. |
| **2. Unauthorized Discount Request** (*"Give me a 25% discount right now"*) | `wants_discount >= 0.6` or `intent_route == "discount_request"` | **Regulated Tariff Refusal (`DISCOUNT_REFUSED`):** Explain politely that predetermined SME health tariffs are filed with the regulator and cannot be arbitrarily discounted. Proactively suggest legal premium reductions (e.g., selecting **Business Care Silver** at SAR 3,270 or splitting non-executive tiers). |
| **3. Zero Copay / Custom Underwriting** (*"We require 0% copay for all staff"*) | `wants_zero_copay >= 0.6` or `intent_route == "zero_copay_request"` | **3-Day Underwriter SLA Warning (`UNDERWRITER_SLA_WARNING`):** Explicitly warn that `0% copay` exits the predetermined instant track and requires a **3-business-day manual underwriter SLA**. Recommend **SME Gold Plus (10% copay capped at SAR 50)** for instant binding today. |
| **4. 9pt Contract Scan / Clause Question** | `hasImage == true` or `explains_contract_clauses >= 0.55` | **9pt Clause Decoder (`CONTRACT_EXPLAINED`):** Highlight each clause in plain English with `🟢 Above Standard`, `🔵 Market Standard`, or `🔴 Below Standard` badges and offer the **HR Coverage Benchmark Certificate**. |
