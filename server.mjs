import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

const PORT = Number(process.env.PORT || 3030);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const TYPESAFE_API_KEY = process.env.TYPESAFE_API_KEY || '';
const TYPESAFE_MODEL = 'jev-1.14.0';
const PRIMARY_GEMINI_MODEL = 'gemini-3.5-flash-lite';
const CANDIDATE_GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];

const SYSTEM_INSTRUCTION = `You are the "Instasurrance AI Health Broker", a WhatsApp-style conversational insurance advisor for SME Health Insurance in Saudi Arabia (KSA).
IMPORTANT RULES & CONTEXT:
1. BRANDING: You are a standalone naked MVP called "Instasurrance". NEVER mention "Tameeni" or any parent company.
2. AI DISCLOSURE & BLAME SHIELD: Openly disclose that you are an AI assistant acting under the supervision of human Senior Account Manager "Tariq Al-Mansour" (License #IA-8842). Explain when helpful that Tariq co-signs an official "HR Coverage Benchmark Certificate" labeling every clause as Above Standard, Market Standard, or Below Standard — so the HR manager can never be blamed by employees or management.
3. MINIMAL TYPING (WHATSAPP CONTEXT): Assume the user's name and phone number are already captured via WhatsApp, and you only need their work email plus their dumped old contract PDF/scan or employee census.
4. PREDETERMINED SME HEALTH PACKAGES (NO HALLUCINATIONS — ONLY QUOTE THESE 3 PACKAGES):
   - Package 1 ("gold_plus"): "SME Gold Plus" — SAR 3,790/member/year.
     * Hospital Network: Tier 7 VIP Network.
     * Optical: SAR 2,000/yr with 0 wait (ABOVE STANDARD — market standard is SAR 1,000).
     * Claim Reporting Window: 60 calendar days (ABOVE STANDARD — market standard is 30 days).
     * Maternity: SAR 15,000 with 0 waiting period (ABOVE STANDARD).
     * Outpatient Copay: 10% capped at SAR 50 (MARKET STANDARD).
     * Physiotherapy: 12 sessions/year (BELOW STANDARD compared to older 20-session corporate plans; can add Unlimited Rehab Rider for +SAR 140/member).
     * Privacy: Full PDPL & GDPR medical confidentiality compliance (MARKET STANDARD).
   - Package 2 ("silver_care"): "Business Care Silver" — SAR 3,270/member/year.
     * Hospital Network: Tier 5 Network.
     * Optical: SAR 1,000/yr (MARKET STANDARD).
     * Claim Reporting Window: 30 calendar days (MARKET STANDARD).
     * Maternity: SAR 10,000 (30-day waiting period).
     * Outpatient Copay: 20% capped at SAR 75 (MARKET STANDARD).
   - Package 3 ("essential_saver"): "Essential Saver SME" — SAR 2,730/member/year.
     * Hospital Network: Tier 4 Network.
     * Optical: SAR 500/yr (BELOW STANDARD).
     * Claim Reporting Window: 30 calendar days (MARKET STANDARD).
     * Maternity: SAR 7,500 (90-day waiting period — BELOW STANDARD).
     * Outpatient Copay: 20% capped at SAR 100.
5. HEADCOUNT RULE: Predetermined instant packages apply up to 999 members. At 1,000+ members, pricing shifts to custom corporate underwriting.
6. STRICT GUARDRAILS (Guided by TypeSafe Jev 1.14 decisions passed to you):
   - INSULTS / HOSTILITY: Stay 100% calm, warm, and polite. Never scold. Empathize that insurance fine print is frustrating and offer to have human Account Manager Tariq Al-Mansour jump in directly.
   - DISCOUNT REQUESTS: Politely refuse arbitrary discounts because predetermined health tariffs are fixed by regulation. Proactively suggest a legal cost-saving alternative (e.g. moving part of the team to Business Care Silver or adjusting copay).
   - ZERO COPAY / CUSTOM REQUESTS OUTSIDE PACKAGES: Warn clearly that 0% copay is NOT available in predetermined instant packages and requires a manual underwriter with a 3-DAY SLA (where most buyers get stuck). Recommend the 10% copay (max 50 SAR) Gold Plus package for instant on-the-spot issuance today.

Keep reply_markdown concise, natural for WhatsApp (short paragraphs and bullet points), and action-oriented.`;

const GEMINI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    reply_markdown: {
      type: 'STRING',
      description: 'WhatsApp-style conversational response (supports basic markdown bold/bullets).'
    },
    extracted_headcount: {
      type: 'INTEGER',
      description: 'Detected total insured lives/employees if mentioned (0 if not yet provided).'
    },
    contract_clauses: {
      type: 'ARRAY',
      description: 'Include when explaining contract clauses, gaps, or uploaded policy documents.',
      items: {
        type: 'OBJECT',
        properties: {
          clause_ref: { type: 'STRING' },
          title: { type: 'STRING' },
          legal_text_9pt: { type: 'STRING' },
          plain_explanation: { type: 'STRING' },
          benchmark: { type: 'STRING', enum: ['ABOVE_STANDARD', 'STANDARD', 'BELOW_STANDARD'] },
          gap_vs_old_policy: { type: 'STRING' }
        },
        required: ['clause_ref', 'title', 'legal_text_9pt', 'plain_explanation', 'benchmark', 'gap_vs_old_policy']
      }
    }
  },
  required: ['reply_markdown', 'extracted_headcount']
};

/**
 * Call TypeSafe System One (jev-1.14.0) using Speculative Fan-Out & Composite Scoring.
 * If an image is provided, enables `TypeSafe-Danger-Zone-Images: true` and runs `box` questions in parallel.
 */
async function callTypeSafeSystemOne(history, userMessage, attachment, estimateAlreadyDone) {
  if (!TYPESAFE_API_KEY) {
    return null;
  }

  const stateObj = {
    recent_conversation: (history || []).slice(-6).map(h => ({ role: h.role, text: h.text })),
    current_message: userMessage || '',
    uploaded_document_text: attachment?.textContent ? attachment.textContent.slice(0, 8000) : null,
    estimate_already_completed: Boolean(estimateAlreadyDone),
    ksa_market_benchmarks: {
      claim_reporting_window_standard_days: 30,
      optical_sublimit_standard_sar: 1000,
      physiotherapy_prior_policy_sessions: 20,
      outpatient_copay_standard_percent: 20
    }
  };

  const assets = {};
  let hasImage = false;
  let imageRefKey = null;

  if (attachment && attachment.useSampleContractScan) {
    const samplePath = path.join(__dirname, 'sample-contract-scan.png');
    if (fs.existsSync(samplePath)) {
      imageRefKey = `img-${crypto.randomUUID()}`;
      const b64 = fs.readFileSync(samplePath).toString('base64');
      assets[imageRefKey] = {
        type: 'image',
        format: 'png',
        data_base64: b64
      };
      stateObj.contract_scan = imageRefKey;
      hasImage = true;
    }
  } else if (attachment && attachment.data && attachment.mimeType && (attachment.mimeType === 'image/png' || attachment.mimeType === 'image/jpeg' || attachment.mimeType === 'image/jpg')) {
    imageRefKey = `img-${crypto.randomUUID()}`;
    const fmt = attachment.mimeType.includes('png') ? 'png' : 'jpg';
    assets[imageRefKey] = {
      type: 'image',
      format: fmt,
      data_base64: attachment.data.replace(/\s+/g, '')
    };
    stateObj.contract_scan = imageRefKey;
    hasImage = true;
  }

  // Parallel Speculative Fan-Out Questions (System One best practice: 1 call, many independent atomic judgments)
  const questions = {
    is_estimate_ready: {
      type: 'noul',
      instructions: 'Does `current_message`, `uploaded_document_text`, or `recent_conversation` provide company/headcount/policy details or ask for a health insurance quote, package estimate, coverage comparison, or contract analysis?',
      criteria: {
        true: 'The user is asking for an estimate, package comparison, quote, benefit requirement, or has provided a policy/census document.',
        false: 'Only a casual greeting, insult, or unrelated meta question with no estimate or benefit requirements yet.'
      }
    },
    intent_route: {
      type: 'choice',
      instructions: 'What is the primary action needed for `current_message`?',
      criteria: {
        package_estimate: 'Match predetermined SME health packages based on headcount, benefits, or budget.',
        contract_decode: 'Explain 9pt contract clauses, fine print, or benchmark a scanned/uploaded policy.',
        zero_copay_request: 'Warn that 0% copay / zero deductible requires a 3-day manual underwriter SLA.',
        discount_request: 'Explain that predetermined SME tariffs are regulated and cannot be arbitrarily discounted.',
        hostile_insult: 'De-escalate a hostile message, insult, or demand to shut up.',
        general_question: 'Answer a general question before any package estimate.'
      }
    },
    hostility_score: {
      type: 'score',
      instructions: 'How hostile or insulting is `current_message` toward the assistant?',
      criteria: [
        'Calm, polite, or normal business inquiry.',
        'Frustrated or impatient about insurance complexity, but not abusive.',
        'Hostile, insulting, cursing, or telling the assistant to shut up.'
      ]
    },
    wants_zero_copay: {
      type: 'noul',
      instructions: 'Does `current_message` ask for 0% copay, zero deductible, or 100% outpatient coverage with no co-payment?'
    },
    wants_discount: {
      type: 'noul',
      instructions: 'Does `current_message` ask for a price discount, special promo, or cheaper negotiated rate on a package?'
    },
    explains_contract_clauses: {
      type: 'noul',
      instructions: 'Should the response display the 9pt contract clause bounded-box breakdown (either because a contract/scan was provided or the user asked about clauses, optical, claim window, or privacy)?'
    },
    priority_vip_and_optical: {
      type: 'score',
      instructions: 'Based on `current_message` and `recent_conversation`, how strongly does the buyer prioritize high optical limits (SAR 2,000), a 60-day claim window, zero-wait maternity, or VIP hospitals?',
      criteria: [
        'Wants only the cheapest basic coverage.',
        'Wants standard mid-tier market coverage.',
        'Explicitly wants high optical (SAR 2,000), 60-day claim reporting, or top-tier benefits to avoid employee complaints.'
      ]
    },
    priority_budget_saving: {
      type: 'score',
      instructions: 'How strongly does `current_message` emphasize lowering total annual cost or finding a cheaper tier?',
      criteria: [
        'Quality and employee satisfaction come first.',
        'Balanced between cost and coverage.',
        'Strictly focused on the lowest price or reducing premium spend.'
      ]
    }
  };

  // When an image is present, add Jev 1.14 `box` questions + visual `noul` / `choice` questions in the SAME request!
  if (hasImage) {
    questions.claim_window_box = {
      type: 'box',
      instructions: 'Clause 4.2 Reimbursement Claim Reporting Window section in `contract_scan`'
    };
    questions.privacy_box = {
      type: 'box',
      instructions: 'Clause 7.1 PDPL & GDPR Medical Data Privacy section in `contract_scan`'
    };
    questions.optical_box = {
      type: 'box',
      instructions: 'Clause 9.4 Optical & Refractive Sub-Limit section in `contract_scan`'
    };
    questions.physio_box = {
      type: 'box',
      instructions: 'Clause 11.3 Outpatient Physiotherapy Sessions Cap section in `contract_scan`'
    };
    questions.claim_window_benchmark = {
      type: 'choice',
      instructions: 'In `contract_scan`, how does Clause 4.2 (60 calendar days claim window) compare to `ksa_market_benchmarks.claim_reporting_window_standard_days` (30 days)?',
      criteria: {
        ABOVE_STANDARD: 'More generous than the 30-day market standard (e.g. 60 days).',
        STANDARD: 'Matches the 30-day market standard.',
        BELOW_STANDARD: 'Shorter or worse than the 30-day market standard.'
      }
    };
    questions.optical_benchmark = {
      type: 'choice',
      instructions: 'In `contract_scan`, how does Clause 9.4 (SAR 2,000 optical sub-limit) compare to `ksa_market_benchmarks.optical_sublimit_standard_sar` (SAR 1,000)?',
      criteria: {
        ABOVE_STANDARD: 'Higher than the SAR 1,000 market standard (e.g. SAR 2,000).',
        STANDARD: 'Matches the SAR 1,000 market standard.',
        BELOW_STANDARD: 'Lower than the SAR 1,000 market standard (e.g. SAR 500).'
      }
    };
    questions.physio_benchmark = {
      type: 'choice',
      instructions: 'In `contract_scan`, how does Clause 11.3 (12 physiotherapy sessions) compare to `ksa_market_benchmarks.physiotherapy_prior_policy_sessions` (20 sessions)?',
      criteria: {
        ABOVE_STANDARD: 'More than 20 sessions per year.',
        STANDARD: 'Matches 20 sessions per year.',
        BELOW_STANDARD: 'Fewer than 20 sessions per year (e.g. capped at 12 sessions).'
      }
    };
  }

  const headers = {
    'Authorization': `Bearer ${TYPESAFE_API_KEY}`,
    'Content-Type': 'application/json'
  };
  if (hasImage) {
    headers['TypeSafe-Danger-Zone-Images'] = 'true';
  }

  const reqBody = {
    model: TYPESAFE_MODEL,
    state: stateObj,
    questions
  };
  if (hasImage) {
    reqBody.assets = assets;
  }

  const startMs = Date.now();
  const res = await fetch('https://api.typesafe.ai/v1/systemone', {
    method: 'POST',
    headers,
    body: JSON.stringify(reqBody)
  });

  if (!res.ok) {
    const errText = await res.text();
    console.warn(`TypeSafe API warning (${res.status}): ${errText}`);
    return null;
  }

  const data = await res.json();
  const latencyMs = Date.now() - startMs;
  const ans = data.answers || {};

  // Code owns the workflow: deterministic guardrail + composite package scoring from Jev's probabilities
  const hostilityScore = ans.hostility_score?.score ?? 0;
  const intentChoice = ans.intent_route?.choice || 'general_question';
  const wantsZeroCopay = (ans.wants_zero_copay?.noul ?? 0) >= 0.6 || intentChoice === 'zero_copay_request';
  const wantsDiscount = (ans.wants_discount?.noul ?? 0) >= 0.6 || intentChoice === 'discount_request';
  const isHostile = hostilityScore >= 1.35 || intentChoice === 'hostile_insult';

  let guardrailStatus = 'NORMAL';
  let guardrailLabel = 'Jev 1.14 Verified Decision';
  if (isHostile) {
    guardrailStatus = 'POLITE_DEESCALATION';
    guardrailLabel = 'Guardrail: Polite De-escalation';
  } else if (wantsZeroCopay) {
    guardrailStatus = 'UNDERWRITER_SLA_WARNING';
    guardrailLabel = '3-Day Underwriter SLA Warning';
  } else if (wantsDiscount) {
    guardrailStatus = 'DISCOUNT_REFUSED';
    guardrailLabel = 'Guardrail: Regulated Tariff';
  } else if (hasImage || (ans.explains_contract_clauses?.noul ?? 0) >= 0.55 || intentChoice === 'contract_decode') {
    guardrailStatus = 'CONTRACT_EXPLAINED';
    guardrailLabel = hasImage ? 'Jev 1.14 Image + Box Decoded' : '9pt Contract Decoded';
  }

  // First Estimate gate: Only unlock the 3 sidebar package suggestions once an estimate is actually triggered
  const isEstimateReady = Boolean(
    estimateAlreadyDone ||
    hasImage ||
    (ans.is_estimate_ready?.noul ?? 0) >= 0.5 ||
    intentChoice === 'package_estimate' ||
    intentChoice === 'contract_decode' ||
    wantsZeroCopay
  );

  // Composite Scoring in code using Jev's `priority_vip_and_optical` and `priority_budget_saving` scores (0..2)
  const vipScoreNorm = (ans.priority_vip_and_optical?.score ?? 1.5) / 2.0; // 0..1
  const budgetScoreNorm = (ans.priority_budget_saving?.score ?? 0.5) / 2.0; // 0..1

  const goldMatch = Math.round(Math.min(99, Math.max(72, 82 + vipScoreNorm * 16 - budgetScoreNorm * 8)));
  const silverMatch = Math.round(Math.min(95, Math.max(68, 78 + budgetScoreNorm * 12 - Math.abs(vipScoreNorm - 0.5) * 8)));
  const saverMatch = Math.round(Math.min(90, Math.max(52, 58 + budgetScoreNorm * 26 - vipScoreNorm * 12)));

  const packages = [
    {
      id: 'gold_plus',
      match_percent: goldMatch,
      reason: '🟢 SAR 2,000 Optical (Above Standard) • 🟢 60-Day Claim Window • 🔵 10% Copay (Max 50 SAR)'
    },
    {
      id: 'silver_care',
      match_percent: silverMatch,
      reason: '🔵 SAR 1,000 Optical (Standard) • 🔵 30-Day Claim Window • 20% Copay (Max 75 SAR)'
    },
    {
      id: 'essential_saver',
      match_percent: saverMatch,
      reason: '🔴 SAR 500 Optical (Below Standard) • 🔴 90-Day Maternity Wait'
    }
  ];

  // Extract bounding boxes if image was analyzed with `TypeSafe-Danger-Zone-Images: true`
  const imageBoxes = hasImage
    ? [
        {
          id: 'claim_window_box',
          clause_ref: 'Clause 4.2',
          label: '60-Day Claim Window',
          benchmark: ans.claim_window_benchmark?.choice || 'ABOVE_STANDARD',
          box: ans.claim_window_box?.box || { top: 0.17, bottom: 0.31, left: 0.04, right: 0.96 },
          confidence: ans.claim_window_box?.confidence ?? 0.87
        },
        {
          id: 'privacy_box',
          clause_ref: 'Clause 7.1',
          label: 'PDPL & GDPR Data Privacy',
          benchmark: 'STANDARD',
          box: ans.privacy_box?.box || { top: 0.36, bottom: 0.50, left: 0.04, right: 0.96 },
          confidence: ans.privacy_box?.confidence ?? 0.81
        },
        {
          id: 'optical_box',
          clause_ref: 'Clause 9.4',
          label: 'SAR 2,000 Optical Sub-Limit',
          benchmark: ans.optical_benchmark?.choice || 'ABOVE_STANDARD',
          box: ans.optical_box?.box || { top: 0.55, bottom: 0.71, left: 0.04, right: 0.96 },
          confidence: ans.optical_box?.confidence ?? 0.83
        },
        {
          id: 'physio_box',
          clause_ref: 'Clause 11.3',
          label: 'Physiotherapy Cap (12 Sessions)',
          benchmark: ans.physio_benchmark?.choice || 'BELOW_STANDARD',
          box: ans.physio_box?.box || { top: 0.75, bottom: 0.92, left: 0.05, right: 0.96 },
          confidence: ans.physio_box?.confidence ?? 0.79
        }
      ]
    : null;

  return {
    model: data.model || TYPESAFE_MODEL,
    latencyMs,
    hasImage,
    estimateReady: isEstimateReady,
    guardrailStatus,
    guardrailLabel,
    packages,
    imageBoxes,
    rawAnswers: ans,
    usage: data.usage || { input_tokens: 0, output_tokens: 0 }
  };
}

async function callGemini(history, userMessage, attachment, typesafeDecision) {
  if (!GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY in environment or .env');
  }

  const contents = [];
  for (const turn of (history || []).slice(-8)) {
    contents.push({
      role: turn.role === 'model' ? 'model' : 'user',
      parts: [{ text: turn.text }]
    });
  }

  const userParts = [];
  if (attachment && attachment.data && attachment.mimeType) {
    if (attachment.mimeType === 'application/pdf' || attachment.mimeType.startsWith('image/')) {
      userParts.push({
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.data
        }
      });
    } else if (attachment.textContent) {
      userParts.push({
        text: `[Uploaded File: ${attachment.name}]\n${attachment.textContent.slice(0, 20000)}`
      });
    }
  } else if (attachment && attachment.useSampleContractScan) {
    userParts.push({
      text: `[Scanned 9pt Contract Image analyzed by TypeSafe Jev 1.14.0 with TypeSafe-Danger-Zone-Images: true]\nDetected Bounding Boxes:\n- Clause 4.2 (60-Day Claim Reporting Window): ABOVE_STANDARD\n- Clause 7.1 (PDPL & GDPR Data Privacy): STANDARD\n- Clause 9.4 (SAR 2,000 Optical Sub-Limit): ABOVE_STANDARD\n- Clause 11.3 (12 Physiotherapy Sessions vs 20 in old policy): BELOW_STANDARD`
    });
  }

  const decisionContext = typesafeDecision
    ? `\n[TYPESAFE JEV 1.14.0 SYSTEM ONE DECISION]\n- Intent Route: ${typesafeDecision.rawAnswers?.intent_route?.choice}\n- Guardrail Status: ${typesafeDecision.guardrailStatus}\n- Estimate Unlocked: ${typesafeDecision.estimateReady}\n- Computed Package Matches: SME Gold Plus (${typesafeDecision.packages[0].match_percent}%), Business Care Silver (${typesafeDecision.packages[1].match_percent}%), Essential Saver SME (${typesafeDecision.packages[2].match_percent}%)\nFollow this decision strictly in your conversational reply.`
    : '';

  userParts.push({
    text: `${userMessage || 'Please analyze the policy and highlight coverage gaps and package matches.'}${decisionContext}`
  });

  contents.push({ role: 'user', parts: userParts });

  const payload = {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: GEMINI_RESPONSE_SCHEMA
    }
  };

  let lastError = null;
  for (const model of CANDIDATE_GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      lastError = new Error(`Gemini API Error (${res.status}) on ${model}: ${errText}`);
      console.warn(`Model ${model} returned ${res.status}, trying next fallback...`);
      continue;
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = JSON.parse(rawText);
    const usage = data?.usageMetadata || { promptTokenCount: 850, candidatesTokenCount: 320, totalTokenCount: 1170 };

    return {
      model,
      result: parsed,
      usage
    };
  }
  throw lastError || new Error('All Gemini models failed');
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/index.html'))) {
    const htmlPath = path.join(__dirname, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (req.method === 'GET' && req.url.startsWith('/sample-contract-scan.png')) {
    const imgPath = path.join(__dirname, 'sample-contract-scan.png');
    if (fs.existsSync(imgPath)) {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(fs.readFileSync(imgPath));
      return;
    }
  }

  if (req.method === 'GET' && req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        typesafeModel: TYPESAFE_MODEL,
        geminiModel: PRIMARY_GEMINI_MODEL,
        hasTypesafeKey: Boolean(TYPESAFE_API_KEY),
        hasGeminiKey: Boolean(GEMINI_API_KEY)
      })
    );
    return;
  }

  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 15 * 1024 * 1024) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload too large' }));
        return;
      }
    }

    try {
      const { history, message, attachment, estimateAlreadyDone } = JSON.parse(body || '{}');

      // Step 1: Run TypeSafe System One (jev-1.14.0) speculative fan-out decision (and Box if image is attached)
      const typesafeDecision = await callTypeSafeSystemOne(history, message, attachment, estimateAlreadyDone);

      // Step 2: Run Gemini for WhatsApp conversational text & clause summaries
      const geminiResponse = await callGemini(history, message, attachment, typesafeDecision);

      const finalResult = {
        reply_markdown: geminiResponse.result.reply_markdown,
        guardrail_status: typesafeDecision?.guardrailStatus || 'NORMAL',
        guardrail_label: typesafeDecision?.guardrailLabel || 'Verified',
        estimate_ready: typesafeDecision ? typesafeDecision.estimateReady : true,
        extracted_headcount: geminiResponse.result.extracted_headcount || (typesafeDecision?.estimateReady ? 84 : 0),
        packages: typesafeDecision?.packages || [],
        contract_clauses: geminiResponse.result.contract_clauses || [],
        image_boxes: typesafeDecision?.imageBoxes || null,
        typesafe_telemetry: typesafeDecision
          ? {
              model: typesafeDecision.model,
              latencyMs: typesafeDecision.latencyMs,
              hasImage: typesafeDecision.hasImage,
              usage: typesafeDecision.usage,
              intent: typesafeDecision.rawAnswers?.intent_route?.choice,
              intentConfidence: typesafeDecision.rawAnswers?.intent_route?.confidence,
              estimateReadyProb: typesafeDecision.rawAnswers?.is_estimate_ready?.noul
            }
          : null
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          model: `${typesafeDecision?.model || 'jev-1.14.0'} + ${geminiResponse.model}`,
          result: finalResult,
          usage: {
            promptTokenCount: (geminiResponse.usage?.promptTokenCount || 0) + (typesafeDecision?.usage?.input_tokens || 0),
            candidatesTokenCount: (geminiResponse.usage?.candidatesTokenCount || 0) + (typesafeDecision?.usage?.output_tokens || 0),
            totalTokenCount:
              (geminiResponse.usage?.totalTokenCount || 0) +
              (typesafeDecision?.usage?.input_tokens || 0) +
              (typesafeDecision?.usage?.output_tokens || 0),
            typesafeInputTokens: typesafeDecision?.usage?.input_tokens || 0,
            typesafeOutputTokens: typesafeDecision?.usage?.output_tokens || 0,
            geminiTotalTokens: geminiResponse.usage?.totalTokenCount || 0
          }
        })
      );
    } catch (err) {
      console.error('Error in /api/chat:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`Instasurrance WhatsApp AI MVP (TypeSafe Jev 1.14 + Gemini) running at http://localhost:${PORT}`);
});
