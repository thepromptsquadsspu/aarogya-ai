/**
 * Gemini AI Client Wrapper
 *
 * Provides structured chat and triage calls to Google's Gemini model.
 * All calls are wrapped in try/catch — on any failure, callers
 * fall back to deterministic logic.
 */

import { GoogleGenAI } from '@google/genai';

const MODEL = 'gemini-3.6-flash';

let client: GoogleGenAI | null = null;

/**
 * Returns a GoogleGenAI client instance, or null if no API key is configured.
 */
export function getGeminiClient(): GoogleGenAI | null {
  if (!client && process.env.GEMINI_API_KEY) {
    client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return client;
}

/**
 * Execute an async operation with automatic retry on transient errors (503/429).
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2, baseDelay = 800): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, baseDelay * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

// ── Chat (Follow-up Question Generation) ──────────────────────────────────

export interface ChatResult {
  next_question: string;
  question_number: number;
  ready_for_assessment: boolean;
  quick_replies: string[];
}

export async function geminiChat(params: {
  messages: any[];
  language: string;
  patient?: any;
  vitals?: any;
  bodyRegions?: string[];
}): Promise<ChatResult | null> {
  const ai = getGeminiClient();
  if (!ai) return null;

  const { messages, language, patient, vitals, bodyRegions } = params;

  const languageLabel =
    language === 'hi' ? 'Hindi' : language === 'mr' ? 'Marathi' : 'English';

  const systemPrompt = `You are Aarogya AI, a medical triage intake assistant used in Indian emergency departments.
Your role is to ask focused clinical questions to gather enough information for an ESI (Emergency Severity Index) triage assessment.

RULES:
- Respond in ${languageLabel}.
- Ask ONE clear, focused question at a time.
- Follow up on the patient's chief complaint with relevant clinical questions (onset, severity, associated symptoms, medical history, allergies, medications).
- After gathering sufficient information (typically 4-6 exchanges), set ready_for_assessment to true.
- Provide 2-4 quick reply suggestions the patient can tap.
- Be empathetic but concise.
- Never diagnose — only gather information.

PATIENT CONTEXT:
${patient ? `Name: ${patient.name || 'Unknown'}, Age: ${patient.age || 'Unknown'}, Sex: ${patient.sex || 'Unknown'}` : 'No patient info provided.'}
${vitals ? `Vitals: ${JSON.stringify(vitals)}` : ''}
${bodyRegions && bodyRegions.length > 0 ? `Affected body regions: ${bodyRegions.join(', ')}` : ''}

Return ONLY valid JSON with this exact schema:
{
  "next_question": "string — the next question to ask the patient",
  "question_number": number,
  "ready_for_assessment": boolean,
  "quick_replies": ["string", ...]
}`;

  const contents: any[] = [
    { role: 'user', parts: [{ text: systemPrompt }] },
  ];

  // Add conversation history
  for (const msg of messages) {
    const role = msg.sender === 'assistant' ? 'model' : 'user';
    contents.push({
      role: role as 'user' | 'model',
      parts: [{ text: msg.text || msg.content || '' }],
    });
  }

  // Final instruction
  contents.push({
    role: 'user' as const,
    parts: [{ text: 'Based on the conversation above, generate the next question as JSON.' }],
  });

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      })
    );

    const text = response.text;
    if (!text) return null;

    const parsed = JSON.parse(text) as ChatResult;
    return parsed;
  } catch (err) {
    console.error('[Gemini Chat] Error:', err);
    return null;
  }
}

// ── Triage Assessment ─────────────────────────────────────────────────────

export interface TriageResult {
  esi_level: number;
  urgency_label: string;
  reasoning: string[];
  red_flags: string[];
  next_action: string;
  home_care_tips: string[];
  confidence: string;
}

export async function geminiTriage(params: {
  messages: any[];
  language: string;
  patient?: any;
  vitals?: any;
  bodyRegions?: string[];
  guidedAnswers?: any;
}): Promise<TriageResult | null> {
  const ai = getGeminiClient();
  if (!ai) return null;

  const { messages, language, patient, vitals, bodyRegions, guidedAnswers } = params;

  const languageLabel =
    language === 'hi' ? 'Hindi' : language === 'mr' ? 'Marathi' : 'English';

  const systemPrompt = `You are Aarogya AI Triage Engine — an ESI-compliant medical triage system for Indian emergency departments.

Analyze the patient conversation below and produce a triage assessment.

ESI LEVELS:
- ESI 1 — Resuscitation (Immediate): Life-threatening, requires immediate intervention (cardiac arrest, respiratory failure, unconsciousness, active seizure, massive hemorrhage).
- ESI 2 — Emergent (High Risk): High-risk situation, confused/lethargic/disoriented, severe pain/distress, vitals in danger zone.
- ESI 3 — Urgent (Within 1 Hour): Requires 2+ hospital resources (labs, imaging, IV fluids, specialty consult). Stable vitals.
- ESI 4 — Less Urgent (Clinic/OPD): Requires 1 resource (single X-ray, single lab test, simple procedure).
- ESI 5 — Non-Urgent (Routine Care): Requires 0 resources; examination only, simple wound care, prescription refill.

PATIENT CONTEXT:
${patient ? `Name: ${patient.name || 'Unknown'}, Age: ${patient.age || 'Unknown'}, Sex: ${patient.sex || 'Unknown'}` : 'No patient info provided.'}
${vitals ? `Vitals: ${JSON.stringify(vitals)}` : 'No vitals recorded.'}
${bodyRegions && bodyRegions.length > 0 ? `Affected body regions: ${bodyRegions.join(', ')}` : ''}
${guidedAnswers ? `Guided intake answers: ${JSON.stringify(guidedAnswers)}` : ''}

SAFETY RULES:
- If ANY life-threatening red flag is present in the patient, ESI must be 1 or 2.
- Err on the side of caution for pediatric (< 12yo) and geriatric (> 65yo) patients.
- In "red_flags", include ONLY active red flags actually detected in this patient. If none, return an empty array [].

Return ONLY valid JSON with this exact schema:
{
  "esi_level": number (1-5),
  "urgency_label": "string",
  "reasoning": ["string", ...],
  "red_flags": ["string", ...],
  "next_action": "string — one of: 'Emergency now', 'Visit hospital today', 'Clinic within 48h', 'Home care'",
  "home_care_tips": ["string", ...],
  "confidence": "string — one of: 'high', 'medium', 'low'"
}`;

  const contents: any[] = [
    { role: 'user', parts: [{ text: systemPrompt }] },
  ];

  // Add conversation transcript
  for (const msg of messages) {
    const role = msg.sender === 'assistant' ? 'model' : 'user';
    contents.push({
      role: role as 'user' | 'model',
      parts: [{ text: msg.text || msg.content || '' }],
    });
  }

  // Final instruction
  contents.push({
    role: 'user' as const,
    parts: [
      {
        text: `Now perform the ESI triage assessment based on everything above. Respond in ${languageLabel} for the reasoning and tips, but keep JSON keys in English. Return JSON only.`,
      },
    ],
  });

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      })
    );

    const text = response.text;
    if (!text) return null;

    const parsed = JSON.parse(text) as TriageResult;
    return parsed;
  } catch (err) {
    console.error('[Gemini Triage] Error:', err);
    return null;
  }
}
