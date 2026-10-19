# Sample Legacy Policy & 84-Employee Census (Test Fixture)

Use this document (or the built-in **"Drop Old Policy + 84-Staff Census"** and **"Scan 9pt Contract Image"** buttons in the UI) to test gap analysis, 9pt contract clause decoding, and predetermined SME package matching.

---

## 1. Company & HR Contact Profile

- **Company Name:** Al-Noor Logistics & Trading LLC (Riyadh, KSA)
- **CR Number:** `1010849201`
- **HR Contact:** Sara Al-Harbi (`sara.hr@alnoor-logistics.sa`)
- **Total Insured Lives:** `84` (62 Employees + 22 Dependents — eligible for Predetermined SME Instant Packages since `< 1,000` lives)

---

## 2. Expiring Policy Summary (Legacy Insurer Policy #POL-2025-9941)

| Benefit / Clause | Expiring Policy Terms | KSA SME Market Benchmark | Status on SME Gold Plus |
| :--- | :--- | :--- | :--- |
| **Annual Aggregate Limit** | SAR 1,000,000 / person | SAR 1,000,000 (CHI Minimum) | 🔵 **Market Standard** (SAR 1,000,000) |
| **Hospital Network** | Tier 6 Network | Tier 5–7 Network | 🟢 **Above Standard** (Tier 7 VIP Network) |
| **Clause 4.2 — Reimbursement Claim Window** | 30 Calendar Days | 30 Calendar Days | 🟢 **Above Standard** (**60 Calendar Days**) |
| **Clause 7.1 — Medical Data Privacy** | Standard Confidentiality | KSA PDPL & GDPR | 🔵 **Market Standard** (Full PDPL + GDPR) |
| **Clause 9.4 — Optical & Lenses Sub-Limit** | SAR 400 / year (Employee complaints!) | SAR 1,000 / year | 🟢 **Above Standard** (**SAR 2,000 / year, 0 Wait**) |
| **Clause 11.3 — Outpatient Physiotherapy** | 20 Sessions / year | 12–15 Sessions / year | 🔴 **Below Standard** (**12 Sessions / year** — *Add Unlimited Rehab Rider for +SAR 140/member*) |
| **Outpatient Consultation Copay** | 20% capped at SAR 100 | 20% capped at SAR 75–100 | 🟢 **Above Standard** (**10% capped at SAR 50**) |
| **Maternity Sub-Limit** | SAR 10,000 (60-day wait) | SAR 10,000 (30-day wait) | 🟢 **Above Standard** (**SAR 15,000, 0-day wait**) |

---

## 3. Verbatim 9pt Contract Clauses (Scanned in `sample-contract-scan.png`)

### Clause 4.2 — Reimbursement Claim Reporting Window
> *"The Insured Member or Policyholder may submit out-of-network emergency or authorized reimbursement claims within sixty (60) calendar days from the date of medical discharge or service delivery, exceeding the statutory thirty (30) day market minimum."*
- **Classification:** 🟢 `ABOVE_STANDARD` (60 days vs. 30-day KSA market standard)

### Clause 7.1 — KSA PDPL & GDPR Medical Data Privacy
> *"All member health declarations, diagnostic codes (ICD-10), and NPHIES claim records are encrypted and processed strictly under the Saudi Personal Data Protection Law (PDPL) and EU GDPR medical confidentiality standards. Individual diagnoses are never disclosed to the Employer/HR."*
- **Classification:** 🔵 `STANDARD` (Mandatory statutory protection)

### Clause 9.4 — Optical & Refractive Sub-Limit
> *"Coverage includes prescription spectacles, frames, and corrective contact lenses up to SAR 2,000 per insured member per policy year with zero waiting period and zero co-payment at network optical providers (KSA SME market benchmark: SAR 1,000)."*
- **Classification:** 🟢 `ABOVE_STANDARD` (SAR 2,000 vs. SAR 1,000 market benchmark — directly resolves HR optical complaints)

### Clause 11.3 — Outpatient Physiotherapy Sessions Cap
> *"Medically necessary outpatient physiotherapy and rehabilitation is limited to twelve (12) sessions per policy year per member upon specialist referral (Note: Prior policy covered 20 sessions/year; optional Unlimited Rehab Rider available at +SAR 140/member)."*
- **Classification:** 🔴 `BELOW_STANDARD` (Coverage gap compared to expiring 20-session corporate plan)
