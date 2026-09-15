/**
 * Deterministic Red-Flag Detection Engine
 *
 * SAFETY-CRITICAL: This module provides a hard safety net that runs
 * independently of any AI model. It uses pattern matching across
 * English, Hindi, and Marathi to detect life-threatening conditions.
 */

export interface RedFlagResult {
  hasRedFlags: boolean;
  detectedFlags: string[];
  forcedEsi: 1 | 2 | null;
}

// ── Clinical Pattern Definitions ──────────────────────────────────────────

interface ClinicalPattern {
  name: string;
  pattern: RegExp;
  /** If true, forces ESI 1 when matched */
  isEsi1: boolean;
}

const CLINICAL_PATTERNS: ClinicalPattern[] = [
  {
    name: 'Chest pain / Acute Coronary Syndrome indicators',
    pattern:
      /(chest pain|pressure in chest|heart attack|angina|tightness in chest|heaviness in chest|छाती में दर्द|सीने में दर्द|छाती पर दबाव|छातीत दुखणे|छातीत दाब|छाती दुखते|छातीत जडपणा)/i,
    isEsi1: true,
  },
  {
    name: 'Severe respiratory distress / Shortness of breath',
    pattern:
      /(difficulty breathing|shortness of breath|breathless|gasping|cannot breathe|can't breathe|suffocation|सांस लेने में तकलीफ|दम फूलना|सांस फूलना|श्वास घेण्यास त्रास|श्वास कोंडणे|दम लागणे)/i,
    isEsi1: true,
  },
  {
    name: 'Stroke / FAST signs',
    pattern:
      /(face droop|facial drooping|arm weakness|slurred speech|stroke|paralysis|sudden weakness|लकवा|फेशियल पाल्सी|मुंह टेढ़ा होना|बोलने में लड़खड़ाहट|अर्धांगवायू|चेहरा वाकडा|हात कमकुवत|बोलण्यात अडखळणे)/i,
    isEsi1: false,
  },
  {
    name: 'Severe hemorrhage / Uncontrolled bleeding',
    pattern:
      /(severe bleeding|uncontrolled bleed|hemorrhage|arterial bleed|blood spurting|gushing blood|भारी रक्तस्राव|अत्यधिक खून बहना|रक्त बहना रुक नहीं रहा|तीव्र रक्तस्त्राव|अति रक्तस्राव|रक्त थांबत नाही)/i,
    isEsi1: false,
  },
  {
    name: 'Unconsciousness / Unresponsive',
    pattern:
      /(unconscious|passed out|fainted|unresponsive|syncope|collapsed|blacked out|बेहोश|मूर्छित|होश खो बैठना|बेशुद्ध|चक्कर येऊन पडणे|जाणीव नसणे)/i,
    isEsi1: true,
  },
  {
    name: 'Seizure / Convulsions',
    pattern:
      /(seizure|convulsion|fits|epilepsy|twitching involuntarily|दौरे|झटके|मिरगी का दौरा|आकडी|फेफरे|फिट येणे)/i,
    isEsi1: false,
  },
];

// ── Vital Sign Thresholds ─────────────────────────────────────────────────

interface VitalCheck {
  name: string;
  /** Returns true if the vital is in dangerous range */
  check: (vitals: any) => boolean;
  /** If true, forces ESI 1 when triggered */
  isEsi1: boolean;
}

const VITAL_CHECKS: VitalCheck[] = [
  {
    name: 'Critical hypoxemia: SpO2 < 90%',
    check: (v) => {
      const spo2 = parseFloat(v?.spO2 ?? v?.spo2 ?? '');
      return !isNaN(spo2) && spo2 < 90;
    },
    isEsi1: true,
  },
  {
    name: 'Shock / Severe hypotension: Systolic BP < 90 mmHg',
    check: (v) => {
      const sbp = parseFloat(v?.systolicBp ?? v?.systolic_bp ?? v?.systolicBP ?? '');
      return !isNaN(sbp) && sbp < 90;
    },
    isEsi1: true,
  },
  {
    name: 'Dangerous tachycardia: Heart Rate > 130 bpm',
    check: (v) => {
      const hr = parseFloat(v?.heartRate ?? v?.heart_rate ?? v?.hr ?? '');
      return !isNaN(hr) && hr > 130;
    },
    isEsi1: false,
  },
];

// ── Main Detection Function ───────────────────────────────────────────────

/**
 * Scans free-text transcript and vital signs for life-threatening red flags.
 *
 * @param text  Combined patient transcript / chief complaint text
 * @param vitals  Optional vitals object with spO2, systolicBp, heartRate, etc.
 * @returns  RedFlagResult with detected flags and forced ESI level
 */
export function detectRedFlags(text: string, vitals?: any): RedFlagResult {
  const detectedFlags: string[] = [];
  let hasEsi1 = false;
  let hasEsi2 = false;

  // Check clinical patterns against text
  for (const pattern of CLINICAL_PATTERNS) {
    if (pattern.pattern.test(text)) {
      detectedFlags.push(pattern.name);
      if (pattern.isEsi1) {
        hasEsi1 = true;
      } else {
        hasEsi2 = true;
      }
    }
  }

  // Check vital sign thresholds
  if (vitals && typeof vitals === 'object') {
    for (const check of VITAL_CHECKS) {
      if (check.check(vitals)) {
        // Append actual value to the flag name for clarity
        let flagName = check.name;
        if (check.name.includes('SpO2')) {
          const val = vitals?.spO2 ?? vitals?.spo2;
          if (val !== undefined) flagName = `Critical hypoxemia: SpO2 ${val}% (< 90%)`;
        } else if (check.name.includes('Systolic BP')) {
          const val = vitals?.systolicBp ?? vitals?.systolic_bp ?? vitals?.systolicBP;
          if (val !== undefined) flagName = `Shock / Severe hypotension: Systolic BP ${val} mmHg (< 90 mmHg)`;
        } else if (check.name.includes('Heart Rate')) {
          const val = vitals?.heartRate ?? vitals?.heart_rate ?? vitals?.hr;
          if (val !== undefined) flagName = `Dangerous tachycardia: Heart Rate ${val} bpm (> 130 bpm)`;
        }
        detectedFlags.push(flagName);
        if (check.isEsi1) {
          hasEsi1 = true;
        } else {
          hasEsi2 = true;
        }
      }
    }
  }

  const hasRedFlags = detectedFlags.length > 0;
  let forcedEsi: 1 | 2 | null = null;
  if (hasEsi1) {
    forcedEsi = 1;
  } else if (hasEsi2) {
    forcedEsi = 2;
  }

  return { hasRedFlags, detectedFlags, forcedEsi };
}
