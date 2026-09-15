import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    } catch (err) {
      console.error("Failed to initialize GoogleGenAI:", err);
    }
  }
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: Date.now(),
  });
});

// Deterministic Red-Flag Detection Helper (Server-side check)
function evaluateRedFlags(text: string, vitals?: any): { hasRedFlags: boolean; flags: string[]; forcedEsi: 1 | 2 | null } {
  const flags: string[] = [];
  const lower = (text || "").toLowerCase();

  // Keyword searches across English, Hindi, Marathi, and transliterated terms
  const patterns: { regex: RegExp; name: string; esi: 1 | 2 }[] = [
    { regex: /(chest pain|angina|pressure in chest|heart attack|छाती में दर्द|छातीत दुखणे|छाती दुखते|छातीत दाब)/i, name: "Chest pain / Acute coronary syndrome symptoms", esi: 1 },
    { regex: /(difficulty breathing|shortness of breath|breathless|gasping|can't breathe|suffocating|सांस लेने में तकलीफ|दम फूलना|श्वास घेण्यास त्रास|श्वास कोंडणे)/i, name: "Severe respiratory distress / Shortness of breath", esi: 1 },
    { regex: /(face droop|arm weakness|slurred speech|stroke|facial drooping|paralysis|लकवा|अर्धांगवायू|चेहरा वाकडा|बोलण्यात अडखळणे)/i, name: "Acute neurological deficit / Stroke signs (FAST criteria)", esi: 1 },
    { regex: /(severe bleeding|hemorrhage|uncontrolled bleed|blood spurting|gushing blood|भारी रक्तस्राव|अति रक्तस्त्राव|तीव्र रक्तस्त्राव)/i, name: "Severe or uncontrolled hemorrhage", esi: 1 },
    { regex: /(unconscious|passed out|fainted|unresponsive|syncope|collapsed|बेहोश|बेशुद्ध|चक्कर येऊन पडणे)/i, name: "Loss of consciousness / Unresponsiveness", esi: 1 },
    { regex: /(seizure|convulsion|fits|epileptic|दौरे|झटके|आकडी|फेफरे)/i, name: "Active or recent seizure / Convulsions", esi: 1 },
  ];

  for (const item of patterns) {
    if (item.regex.test(lower)) {
      flags.push(item.name);
    }
  }

  // Vitals red-flag thresholds
  if (vitals) {
    if (vitals.spO2 !== undefined && vitals.spO2 !== null && Number(vitals.spO2) > 0 && Number(vitals.spO2) < 90) {
      flags.push(`Critical hypoxemia: SpO2 ${vitals.spO2}% (< 90%)`);
    }
    if (vitals.systolicBp !== undefined && vitals.systolicBp !== null && Number(vitals.systolicBp) > 0 && Number(vitals.systolicBp) < 90) {
      flags.push(`Severe hypotension / Shock: Systolic BP ${vitals.systolicBp} mmHg (< 90 mmHg)`);
    }
    if (vitals.heartRate !== undefined && vitals.heartRate !== null && Number(vitals.heartRate) > 130) {
      flags.push(`Critical tachycardia: Heart Rate ${vitals.heartRate} bpm (> 130 bpm)`);
    }
  }

  const hasRedFlags = flags.length > 0;
  // If chest pain, unconsciousness, severe distress, or critical shock vitals -> ESI 1, else ESI 2
  let forcedEsi: 1 | 2 | null = null;
  if (hasRedFlags) {
    const isLevel1 = flags.some(f => 
      f.includes("Chest pain") || 
      f.includes("Loss of consciousness") || 
      f.includes("respiratory distress") || 
      f.includes("SpO2") || 
      f.includes("Systolic BP")
    );
    forcedEsi = isLevel1 ? 1 : 2;
  }

  return { hasRedFlags, flags, forcedEsi };
}

// 1. Interactive Chat Intake Endpoint
app.post("/api/triage/chat", async (req, res) => {
  try {
    const { messages, language = "en", patient, vitals, bodyRegions } = req.body;
    const ai = getGeminiClient();

    // Context summary
    const conversationTranscript = (messages || [])
      .map((m: any) => `${m.sender.toUpperCase()}: ${m.text}`)
      .join("\n");

    const patientContext = `Patient Demographics:
- Name: ${patient?.name || "Patient"}
- Age: ${patient?.age || "Unknown"}
- Sex: ${patient?.sex || "Unknown"}
- Language: ${language}
- Selected body pain regions: ${(bodyRegions || []).join(", ") || "None specified"}
- Vitals entered: ${JSON.stringify(vitals || {})}`;

    // Prompt Gemini for next question
    if (ai) {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `You are Aarogya AI, an expert emergency medical triage intake assistant for India.
${patientContext}

Current conversation so far:
${conversationTranscript}

YOUR SAFETY RULES (MANDATORY):
1. Never give medical diagnoses.
2. Never prescribe medication names or dosages.
3. Always err toward higher urgency when uncertain.
4. Speak ONLY in the patient's chosen language: ${
          language === "hi" ? "Hindi (हिंदी)" : language === "mr" ? "Marathi (मराठी)" : "English"
        }.
5. Ask ONE focused, empathetic follow-up question at a time to determine symptom severity, onset, radiation, or associated red flags.
6. If 3 to 5 questions have already been asked and answered, OR if the patient has clearly described their symptoms with sufficient clinical detail, signal ready_for_assessment: true.
7. Output strictly valid JSON matching this schema:
{
  "next_question": "string (the single follow-up question in the target language)",
  "question_number": number (current follow-up count 1-5),
  "ready_for_assessment": boolean (true if ready to produce final triage),
  "quick_replies": ["string", "string", "string"] (2-4 brief likely answers for tap buttons)
}`,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const responseText = response.text?.trim() || "";
      try {
        const parsed = JSON.parse(responseText);
        return res.json(parsed);
      } catch (parseErr) {
        console.error("Failed to parse Gemini chat response JSON:", responseText);
      }
    }

    // Fallback if no Gemini key or parse error
    const count = (messages || []).filter((m: any) => m.sender === "assistant").length;
    const isComplete = count >= 3;

    let nextQ = "Can you describe when this started and if the pain radiates anywhere?";
    let quickReplies = ["Started suddenly today", "Gradual over 2-3 days", "No radiation", "Radiates to arm/back"];
    if (language === "hi") {
      nextQ = "यह लक्षण कब शुरू हुआ और क्या यह शरीर के किसी अन्य भाग में फैल रहा है?";
      quickReplies = ["आज अचानक शुरू हुआ", "2-3 दिनों से धीरे-धीरे", "कहीं नहीं फैल रहा", "पीठ या हाथ में दर्द"];
    } else if (language === "mr") {
      nextQ = "हे लक्षण कधी सुरू झाले आणि हा त्रास शरीराच्या इतर भागात पसरत आहे का?";
      quickReplies = ["आज अचानक सुरू झाले", "२-३ दिवसांपासून", "इतर कुठेही पसरत नाही", "हात किंवा पाठीत"];
    }

    return res.json({
      next_question: nextQ,
      question_number: count + 1,
      ready_for_assessment: isComplete,
      quick_replies: quickReplies,
    });
  } catch (error: any) {
    console.error("Chat intake error:", error);
    res.status(500).json({ error: error.message || "Failed to process chat" });
  }
});

// 2. Final Triage Assessment Endpoint
app.post("/api/triage/assess", async (req, res) => {
  try {
    const { messages, language = "en", patient, vitals, bodyRegions, guidedAnswers } = req.body;
    
    // 1. Deterministic red-flag check BEFORE Gemini runs
    const allText = [
      (messages || []).map((m: any) => m.text).join(" "),
      guidedAnswers?.notes || "",
      guidedAnswers?.onset || "",
    ].join(" ");

    const preRedFlags = evaluateRedFlags(allText, vitals);

    const ai = getGeminiClient();
    let geminiResult: any = null;

    if (ai) {
      try {
        const prompt = `You are Aarogya AI, the Emergency Severity Index (ESI) triage engine for India.
Evaluate the following emergency triage case and return a strict JSON assessment.

Patient:
- Name: ${patient?.name || "Unknown"}
- Age: ${patient?.age || "Unknown"}
- Sex: ${patient?.sex || "Unknown"}
- Language: ${language}
- Vitals: ${JSON.stringify(vitals || {})}
- Pain body regions: ${(bodyRegions || []).join(", ") || "None"}
- Guided onset: ${guidedAnswers?.onset || "Not specified"}, Severity: ${guidedAnswers?.severity || "N/A"}/10

Transcript:
${(messages || []).map((m: any) => `${m.sender.toUpperCase()}: ${m.text}`).join("\n")}

CRITICAL MEDICAL SAFETY & ESI PROTOCOL RULES:
1. No medical diagnoses (do not state 'You have a myocardial infarction'). Describe as 'Clinical signs concerning for acute coronary syndrome / cardiac etiology'.
2. No medication dosages or specific drug prescriptions.
3. Always err toward higher urgency (lower ESI number) when in doubt.
4. ESI LEVELS:
   - Level 1 (Resuscitation): Immediate life-saving intervention required (cardiac arrest, severe chest pain with diaphoresis/shock, severe respiratory failure, unconsciousness).
   - Level 2 (Emergent): High risk, confused/lethargic/disoriented, severe pain/distress (>7/10), acute stroke symptoms.
   - Level 3 (Urgent): Stable vitals, requires 2+ resources (e.g., persistent high fever, moderate abdominal pain needing IV fluids/labs).
   - Level 4 (Less Urgent): Stable, requires 1 resource (e.g. simple laceration, sprained ankle).
   - Level 5 (Non-urgent): Stable, no resources needed (e.g. rash, small scratch, medication refill).
5. Output response strictly in valid JSON matching this schema:
{
  "esi_level": 1 | 2 | 3 | 4 | 5,
  "urgency_label": "Resuscitation (Immediate)" | "Emergent (Within 15 mins)" | "Urgent (Within 1 hour)" | "Less Urgent" | "Non-urgent",
  "reasoning": ["string", "string", "string"] (max 4 scannable bullet points explaining clinical factors),
  "red_flags": ["string"],
  "next_action": "Emergency now" | "Visit hospital today" | "Clinic within 48h" | "Home care",
  "home_care_tips": ["string", "string"],
  "confidence": "low" | "medium" | "high"
}
Provide all text explanations in ${language === "hi" ? "Hindi (हिंदी)" : language === "mr" ? "Marathi (मराठी)" : "English"}.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        });

        const raw = response.text?.trim() || "";
        geminiResult = JSON.parse(raw);
      } catch (err) {
        console.error("Gemini assessment error:", err);
      }
    }

    // Fallback if Gemini unavailable or failed
    if (!geminiResult) {
      if (preRedFlags.hasRedFlags) {
        geminiResult = {
          esi_level: preRedFlags.forcedEsi || 1,
          urgency_label: preRedFlags.forcedEsi === 1 ? "Resuscitation (Immediate)" : "Emergent (High Risk)",
          reasoning: [
            "Deterministic clinical red flags detected requiring immediate emergency medical evaluation.",
            preRedFlags.flags[0] || "Critical acute symptom presentation.",
            "Vital signs or reported complaints indicate high physiological risk.",
            "Protocol mandates immediate ER stabilization.",
          ],
          red_flags: preRedFlags.flags,
          next_action: "Emergency now",
          home_care_tips: [
            "Do not exert yourself. Sit or lie down in a safe, resting position.",
            "Call 108 emergency ambulance immediately.",
            "Do not consume food, water, or unprescribed medications.",
          ],
          confidence: "high",
        };
      } else {
        const sev = Number(guidedAnswers?.severity || 3);
        const level = sev >= 8 ? 2 : sev >= 5 ? 3 : sev >= 3 ? 4 : 5;
        geminiResult = {
          esi_level: level,
          urgency_label: level <= 2 ? "Emergent" : level === 3 ? "Urgent" : level === 4 ? "Less Urgent" : "Non-urgent",
          reasoning: [
            "No immediate life-threatening red flags detected.",
            `Patient reported pain/distress severity level: ${sev}/10.`,
            "Vitals within acceptable physiological bounds.",
            "Recommend appropriate medical consultation according to triage tier.",
          ],
          red_flags: [],
          next_action: level <= 2 ? "Emergency now" : level === 3 ? "Visit hospital today" : level === 4 ? "Clinic within 48h" : "Home care",
          home_care_tips: [
            "Monitor symptoms closely for any sudden worsening or onset of chest pain or breathlessness.",
            "Maintain hydration and rest.",
          ],
          confidence: "medium",
        };
      }
    }

    // 2. Deterministic red-flag check AFTER Gemini: AI can NEVER downgrade a red-flag case!
    const postRedFlags = evaluateRedFlags(allText + " " + JSON.stringify(geminiResult.red_flags || []), vitals);
    let downgradedPrevented = false;

    if (preRedFlags.hasRedFlags || postRedFlags.hasRedFlags) {
      const allDetectedFlags = Array.from(new Set([...preRedFlags.flags, ...postRedFlags.flags, ...(geminiResult.red_flags || [])]));
      const forcedLevel = (preRedFlags.forcedEsi === 1 || postRedFlags.forcedEsi === 1) ? 1 : 2;

      if (geminiResult.esi_level > forcedLevel) {
        downgradedPrevented = true;
        geminiResult.esi_level = forcedLevel;
        geminiResult.urgency_label = forcedLevel === 1 ? "Resuscitation (Immediate)" : "Emergent (High Risk)";
        geminiResult.next_action = "Emergency now";
        geminiResult.reasoning.unshift(`[SAFETY OVERRIDE] Deterministic red flag detected (${allDetectedFlags[0]}). AI downgrade prevented.`);
      }

      geminiResult.red_flags = allDetectedFlags;
    }

    return res.json({
      triageResult: geminiResult,
      redFlagsDetected: preRedFlags.hasRedFlags || postRedFlags.hasRedFlags,
      downgradedPrevented,
    });
  } catch (err: any) {
    console.error("Assessment error:", err);
    res.status(500).json({ error: err.message || "Triage assessment failed" });
  }
});

// Vite middleware for development & static handling for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Aarogya AI server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
