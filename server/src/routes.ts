/**
 * Express Route Definitions for Aarogya AI Backend
 *
 * All endpoints validate input and return clean JSON errors.
 * Triage endpoints enforce deterministic red-flag safety checks
 * that can NEVER be overridden by AI results.
 */

import type { Express, Request, Response } from 'express';
import { getDb } from './db.js';
import { detectRedFlags } from './redflags.js';
import { geminiChat, geminiTriage } from './gemini.js';

// ── Helpers ───────────────────────────────────────────────────────────────

/** Safe JSON parse with fallback */
function safeParse(str: string, fallback: any = {}): any {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/** Convert a snake_case DB row to a camelCase patient object */
function rowToPatient(row: any): any {
  return {
    id: row.id,
    token: row.token,
    name: row.name,
    age: row.age,
    sex: row.sex,
    language: row.language,
    chiefComplaint: row.chief_complaint,
    vitals: safeParse(row.vitals, {}),
    bodyRegions: safeParse(row.body_regions, []),
    transcript: safeParse(row.transcript, []),
    esiLevel: row.esi_level,
    triageResult: safeParse(row.triage_result, {}),
    status: row.status,
    waitMinutes: row.wait_minutes,
    assignedDoctor: row.assigned_doctor,
    bed: row.bed,
    isSimulated: Boolean(row.is_simulated),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Map ESI level to urgency label */
function esiToLabel(esi: number): string {
  switch (esi) {
    case 1: return 'Resuscitation (Immediate)';
    case 2: return 'Emergent (High Risk)';
    case 3: return 'Urgent (Within 1 Hour)';
    case 4: return 'Less Urgent (Clinic / OPD)';
    case 5: return 'Non-Urgent (Routine Care)';
    default: return 'Unknown';
  }
}

/** Map ESI level to next action */
function esiToAction(esi: number): string {
  switch (esi) {
    case 1:
    case 2: return 'Emergency now';
    case 3: return 'Visit hospital today';
    case 4: return 'Clinic within 48h';
    case 5: return 'Home care';
    default: return 'Visit hospital today';
  }
}

// ── Route Registration ────────────────────────────────────────────────────

export function registerRoutes(app: Express): void {

  // ── Health Check ──────────────────────────────────────────────────────
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      timestamp: Date.now(),
    });
  });

  // ── Chat (Follow-up Question Generation) ──────────────────────────────
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const { messages, language, patient, vitals, bodyRegions } = req.body;

      // Validation
      if (!Array.isArray(messages)) {
        res.status(400).json({ error: 'messages must be an array' });
        return;
      }
      if (!language || typeof language !== 'string') {
        res.status(400).json({ error: 'language must be a string' });
        return;
      }

      // Try Gemini
      const result = await geminiChat({ messages, language, patient, vitals, bodyRegions });

      if (result) {
        res.json(result);
        return;
      }

      // Fallback: count assistant messages to determine question progression
      const assistantCount = messages.filter(
        (m: any) => m.sender === 'assistant' || m.role === 'assistant'
      ).length;

      const fallbackQuestions: Record<string, string[]> = {
        en: [
          'Can you describe your main symptom in more detail?',
          'When did this start, and has it been getting worse?',
          'Do you have any other symptoms like fever, nausea, or dizziness?',
          'Do you have any pre-existing medical conditions or allergies?',
          'Are you currently taking any medications?',
          'On a scale of 1-10, how would you rate your pain or discomfort?',
        ],
        hi: [
          'अपने मुख्य लक्षण के बारे में विस्तार से बताएं।',
          'यह कब शुरू हुआ और क्या यह बिगड़ रहा है?',
          'क्या आपको बुखार, मतली या चक्कर जैसी कोई अन्य समस्या है?',
          'क्या आपको पहले से कोई बीमारी या एलर्जी है?',
          'क्या आप कोई दवा ले रहे हैं?',
          '1-10 के पैमाने पर अपने दर्द को कितना बताएंगे?',
        ],
        mr: [
          'तुमच्या मुख्य त्रासाबद्दल सविस्तर सांगा.',
          'हे कधी सुरू झाले आणि वाढत आहे का?',
          'ताप, मळमळ किंवा चक्कर अशी इतर लक्षणे आहेत का?',
          'तुम्हाला आधीपासून काही आजार किंवा अ‍ॅलर्जी आहे का?',
          'सध्या कोणती औषधे घेत आहात?',
          '1-10 पैकी तुमचा त्रास किती आहे?',
        ],
      };

      const langQuestions = fallbackQuestions[language] || fallbackQuestions.en;
      const qIndex = Math.min(assistantCount, langQuestions.length - 1);

      res.json({
        next_question: langQuestions[qIndex],
        question_number: assistantCount + 1,
        ready_for_assessment: assistantCount >= 5,
        quick_replies: language === 'hi'
          ? ['हाँ', 'नहीं', 'थोड़ा', 'बहुत ज़्यादा']
          : language === 'mr'
            ? ['होय', 'नाही', 'थोडे', 'खूप जास्त']
            : ['Yes', 'No', 'A little', 'Very much'],
      });
    } catch (err) {
      console.error('[POST /api/chat] Error:', err);
      res.status(500).json({ error: 'Chat processing failed' });
    }
  });

  // ── Triage Assessment ─────────────────────────────────────────────────
  app.post('/api/triage', async (req: Request, res: Response) => {
    try {
      const { messages, language, patient, vitals, bodyRegions, guidedAnswers } = req.body;

      // Validation
      if (!Array.isArray(messages)) {
        res.status(400).json({ error: 'messages must be an array' });
        return;
      }

      // Combine all text for red-flag scanning
      const combinedText = messages
        .map((m: any) => m.text || m.content || '')
        .join(' ')
        + (patient?.chiefComplaint ? ' ' + patient.chiefComplaint : '')
        + (patient?.chief_complaint ? ' ' + patient.chief_complaint : '');

      // ── PRE-CHECK: Deterministic red flags ──
      const preCheck = detectRedFlags(combinedText, vitals);

      // ── Gemini triage ──
      const geminiResult = await geminiTriage({
        messages,
        language: language || 'en',
        patient,
        vitals,
        bodyRegions,
        guidedAnswers,
      });

      let esiLevel: number;
      let urgencyLabel: string;
      let reasoning: string[];
      let redFlags: string[];
      let nextAction: string;
      let homeCareTips: string[];
      let confidence: string;
      let forcedByRedFlag = false;

      if (geminiResult) {
        // Start with Gemini's assessment
        esiLevel = geminiResult.esi_level;
        urgencyLabel = geminiResult.urgency_label;
        reasoning = geminiResult.reasoning || [];
        redFlags = geminiResult.red_flags || [];
        nextAction = geminiResult.next_action || esiToAction(esiLevel);
        homeCareTips = geminiResult.home_care_tips || [];
        confidence = geminiResult.confidence || 'medium';

        // ── POST-CHECK: Re-scan patient text + Gemini identified red_flags ──
        const postCheck = detectRedFlags(combinedText + ' ' + redFlags.join(' '), vitals);

        // Merge red flags from preCheck and Gemini's explicit red flags
        const allFlags = new Set([
          ...preCheck.detectedFlags,
          ...postCheck.detectedFlags,
          ...redFlags,
        ]);
        redFlags = Array.from(allFlags);

        // Determine the most urgent forced ESI
        const forcedLevels = [preCheck.forcedEsi, postCheck.forcedEsi].filter(
          (l): l is 1 | 2 => l !== null
        );
        const strictestForced = forcedLevels.length > 0
          ? Math.min(...forcedLevels) as 1 | 2
          : null;

        // CRITICAL: Override if AI gave a less urgent level than red flags demand
        if (strictestForced !== null && esiLevel > strictestForced) {
          esiLevel = strictestForced;
          urgencyLabel = esiToLabel(esiLevel);
          nextAction = esiToAction(esiLevel);
          forcedByRedFlag = true;
          reasoning.push(
            `Deterministic Red Flag Override: ESI forced to ${esiLevel} due to detected life-threatening indicators.`
          );
        } else if (allFlags.size > 0) {
          forcedByRedFlag = true;
        }
      } else {
        // Gemini failed entirely — build result from red flags alone
        if (preCheck.hasRedFlags && preCheck.forcedEsi) {
          esiLevel = preCheck.forcedEsi;
          forcedByRedFlag = true;
        } else if (preCheck.hasRedFlags) {
          esiLevel = 2;
          forcedByRedFlag = true;
        } else {
          // No red flags, no AI — conservative default
          esiLevel = 3;
        }

        urgencyLabel = esiToLabel(esiLevel);
        reasoning = preCheck.hasRedFlags
          ? [`Deterministic red-flag detection identified: ${preCheck.detectedFlags.join('; ')}.`]
          : ['AI triage unavailable. Assigned ESI 3 as conservative default. Please see a clinician.'];
        redFlags = preCheck.detectedFlags;
        nextAction = esiToAction(esiLevel);
        homeCareTips = esiLevel <= 2
          ? ['Seek immediate emergency care', 'Do not delay treatment']
          : ['Visit your nearest hospital or clinic', 'Monitor symptoms closely'];
        confidence = preCheck.hasRedFlags ? 'high' : 'low';
      }

      res.json({
        esi_level: esiLevel,
        urgency_label: urgencyLabel,
        reasoning,
        red_flags: redFlags,
        next_action: nextAction,
        home_care_tips: homeCareTips,
        confidence,
        evaluated_at: Date.now(),
        forcedByRedFlag,
      });
    } catch (err) {
      console.error('[POST /api/triage] Error:', err);
      res.status(500).json({ error: 'Triage processing failed' });
    }
  });

  // ── Create Patient ────────────────────────────────────────────────────
  app.post('/api/patients', (req: Request, res: Response) => {
    try {
      const {
        token, name, age, sex, language,
        chiefComplaint, esiLevel, triageResult,
        vitals, chatTranscript, bodyRegions,
      } = req.body;

      // Validation
      if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'name is required and must be a string' });
        return;
      }
      if (age === undefined || age === null || typeof age !== 'number') {
        res.status(400).json({ error: 'age is required and must be a number' });
        return;
      }
      if (!['male', 'female', 'other'].includes(sex)) {
        res.status(400).json({ error: "sex must be 'male', 'female', or 'other'" });
        return;
      }
      if (!esiLevel || esiLevel < 1 || esiLevel > 5) {
        res.status(400).json({ error: 'esiLevel must be between 1 and 5' });
        return;
      }

      const id = `pt-${Date.now()}`;
      const db = getDb();

      const stmt = db.prepare(`
        INSERT INTO patients (
          id, token, name, age, sex, language, chief_complaint,
          vitals, body_regions, transcript, esi_level, triage_result,
          status, wait_minutes, assigned_doctor, bed, is_simulated
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        )
      `);

      stmt.run(
        id,
        token || `AR-${Date.now() % 10000}`,
        name,
        age,
        sex,
        language || 'en',
        chiefComplaint || '',
        JSON.stringify(vitals || {}),
        JSON.stringify(bodyRegions || []),
        JSON.stringify(chatTranscript || []),
        esiLevel,
        JSON.stringify(triageResult || {}),
        'Waiting',
        0,
        null,
        null,
        0
      );

      // Fetch the created row to return
      const created = db.prepare('SELECT * FROM patients WHERE id = ?').get(id) as any;
      res.status(201).json(rowToPatient(created));
    } catch (err) {
      console.error('[POST /api/patients] Error:', err);
      res.status(500).json({ error: 'Failed to create patient' });
    }
  });

  // ── Get Queue ─────────────────────────────────────────────────────────
  app.get('/api/queue', (_req: Request, res: Response) => {
    try {
      const db = getDb();
      const rows = db
        .prepare('SELECT * FROM patients ORDER BY esi_level ASC, created_at ASC')
        .all() as any[];

      res.json(rows.map(rowToPatient));
    } catch (err) {
      console.error('[GET /api/queue] Error:', err);
      res.status(500).json({ error: 'Failed to fetch queue' });
    }
  });

  // ── Update Patient Status ─────────────────────────────────────────────
  app.patch('/api/patients/:id/status', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['Waiting', 'In Treatment', 'Discharged'].includes(status)) {
        res.status(400).json({
          error: "status must be 'Waiting', 'In Treatment', or 'Discharged'",
        });
        return;
      }

      const db = getDb();

      const existing = db.prepare('SELECT id FROM patients WHERE id = ?').get(id);
      if (!existing) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }

      db.prepare(
        "UPDATE patients SET status = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(status, id);

      res.json({ success: true, id, status });
    } catch (err) {
      console.error('[PATCH /api/patients/:id/status] Error:', err);
      res.status(500).json({ error: 'Failed to update status' });
    }
  });

  // ── Stats ─────────────────────────────────────────────────────────────
  app.get('/api/stats', (_req: Request, res: Response) => {
    try {
      const db = getDb();

      const total = (
        db.prepare('SELECT COUNT(*) as count FROM patients').get() as any
      ).count;

      const critical = (
        db.prepare(
          "SELECT COUNT(*) as count FROM patients WHERE esi_level <= 2 AND status != 'Discharged'"
        ).get() as any
      ).count;

      const waiting = (
        db.prepare(
          "SELECT COUNT(*) as count FROM patients WHERE status = 'Waiting'"
        ).get() as any
      ).count;

      const inTreatment = (
        db.prepare(
          "SELECT COUNT(*) as count FROM patients WHERE status = 'In Treatment'"
        ).get() as any
      ).count;

      // Average wait: use wait_minutes for waiting patients, fallback to computed from created_at
      const avgResult = db.prepare(
        "SELECT AVG(CASE WHEN wait_minutes > 0 THEN wait_minutes ELSE CAST((julianday('now') - julianday(created_at)) * 1440 AS INTEGER) END) as avg FROM patients WHERE status = 'Waiting'"
      ).get() as any;

      const avgWaitMinutes = Math.round(avgResult?.avg || 0);

      res.json({
        total,
        critical,
        waiting,
        inTreatment,
        avgWaitMinutes,
      });
    } catch (err) {
      console.error('[GET /api/stats] Error:', err);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });
}
