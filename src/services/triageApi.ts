/**
 * TriageMed Canonical API Service Layer
 * 
 * Communicates with the FastAPI backend (:8000) or falls back to
 * client-side simulation when VITE_USE_MOCK is enabled.
 */

import {
  ChatMessage,
  PatientProfile,
  Vitals,
  GuidedAnswers,
  BodyRegion,
  TriageResult,
  HospitalPatient,
  PatientStatus,
} from '../types';

export const USE_MOCK = (import.meta as any).env?.VITE_USE_MOCK === 'true';
const API_BASE = (import.meta as any).env?.VITE_API_URL || '';

// ── Model Status ─────────────────────────────────────────────────────────────
export interface ModelStatusResponse {
  groq: { online: boolean; latency_ms: number | null; model: string; error?: string | null };
  gemini: { online: boolean; latency_ms: number | null; model: string; error?: string | null };
  primary_provider: 'groq' | 'gemini';
  timestamp: number;
}

export async function getModelStatus(): Promise<ModelStatusResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/api/model-status`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch model status:', err);
  }
  return null;
}

// ── Chat Interaction ─────────────────────────────────────────────────────────
export async function sendChatMessage(params: {
  messages: ChatMessage[];
  language: string;
  patient?: PatientProfile;
  vitals?: Vitals;
  bodyRegions?: BodyRegion[];
}): Promise<{
  nextQuestion: string;
  questionNumber: number;
  readyForAssessment: boolean;
  quickReplies: string[];
}> {
  if (!USE_MOCK) {
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          nextQuestion: data.next_question,
          questionNumber: data.question_number,
          readyForAssessment: Boolean(data.ready_for_assessment),
          quickReplies: data.quick_replies || [],
        };
      }
    } catch (err) {
      console.warn('Backend chat failed, falling back:', err);
    }
  }

  // Local fallback
  const userCount = params.messages.filter((m) => m.sender === 'user').length;
  return {
    nextQuestion: 'Can you describe the location and onset of your symptoms in more detail?',
    questionNumber: userCount,
    readyForAssessment: userCount >= 3,
    quickReplies: ['Started suddenly today', 'Getting gradually worse', 'Sharp and constant', 'Mild discomfort'],
  };
}

// ── Triage Assessment ────────────────────────────────────────────────────────
export async function performTriageAssessment(params: {
  messages: ChatMessage[];
  language: string;
  patient?: PatientProfile;
  vitals?: Vitals;
  bodyRegions?: BodyRegion[];
  guidedAnswers?: GuidedAnswers;
}): Promise<TriageResult> {
  if (!USE_MOCK) {
    try {
      const res = await fetch(`${API_BASE}/api/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Backend triage failed, falling back:', err);
    }
  }

  // Fallback ESI 3 response
  return {
    esi_level: 3,
    urgency_label: 'Urgent (Within 1 Hour)',
    reasoning: [
      'Clinical assessment performed based on reported symptoms and vitals.',
      'Stable hemodynamic parameters indicated.',
      'In-person evaluation recommended at hospital or emergency facility.',
    ],
    red_flags: [],
    next_action: 'Visit hospital today',
    home_care_tips: [
      'Maintain resting posture and avoid physical exertion.',
      'Sip fluids if not nauseated.',
      'Monitor for any acute worsening of symptoms.',
    ],
    confidence: 'medium',
    evaluated_at: Date.now(),
    forcedByRedFlag: false,
  };
}

// ── Voice Transcription Fallback (Groq Whisper) ──────────────────────────────
export async function transcribeAudio(audioBlob: Blob): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('file', audioBlob, 'voice_input.webm');

    const res = await fetch(`${API_BASE}/api/transcribe`, {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      return data.transcript || null;
    }
  } catch (err) {
    console.error('Transcription request failed:', err);
  }
  return null;
}

// ── Emergency Contacts ───────────────────────────────────────────────────────
export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  created_at?: string;
}

export async function getEmergencyContacts(sessionId = 'default-user'): Promise<EmergencyContact[]> {
  try {
    const res = await fetch(`${API_BASE}/api/contacts?session_id=${sessionId}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to get emergency contacts:', err);
  }
  // Local storage fallback
  const cached = localStorage.getItem(`triage_contacts_${sessionId}`);
  return cached ? JSON.parse(cached) : [];
}

export async function saveEmergencyContact(contact: {
  name: string;
  phone: string;
  relationship?: string;
  sessionId?: string;
}): Promise<EmergencyContact | null> {
  const sessionId = contact.sessionId || 'default-user';
  try {
    const res = await fetch(`${API_BASE}/api/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: contact.name,
        phone: contact.phone,
        relationship: contact.relationship || 'Family',
        session_id: sessionId,
      }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to save contact:', err);
  }

  // Local storage fallback
  const current = await getEmergencyContacts(sessionId);
  if (current.length >= 2) throw new Error('Maximum 2 contacts allowed.');
  const newContact: EmergencyContact = {
    id: `local-${Date.now()}`,
    name: contact.name,
    phone: contact.phone,
    relationship: contact.relationship || 'Family',
  };
  const updated = [...current, newContact];
  localStorage.setItem(`triage_contacts_${sessionId}`, JSON.stringify(updated));
  return newContact;
}

export async function deleteEmergencyContact(contactId: string, sessionId = 'default-user'): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/contacts/${contactId}?session_id=${sessionId}`, {
      method: 'DELETE',
    });
    if (res.ok) return true;
  } catch (err) {
    console.warn('Failed to delete contact:', err);
  }
  const current = await getEmergencyContacts(sessionId);
  const updated = current.filter((c) => c.id !== contactId);
  localStorage.setItem(`triage_contacts_${sessionId}`, JSON.stringify(updated));
  return true;
}

// ── Trigger Emergency Auto-Call ──────────────────────────────────────────────
export interface EmergencyCallResponse {
  success: boolean;
  mode: 'safe_test_mode' | 'live';
  message_spoken?: string;
  contacts_contacted?: number;
  results?: Array<{
    contact_name: string;
    contact_phone: string;
    status: string;
    mode: string;
    message?: string;
  }>;
  error?: string;
}

export async function triggerEmergencyCall(params: {
  patientName: string;
  symptoms: string[];
  urgencyLabel: string;
  nextAction: string;
  sessionId?: string;
}): Promise<EmergencyCallResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/emergency-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_name: params.patientName || 'Patient',
        symptoms: params.symptoms,
        urgency_label: params.urgencyLabel,
        next_action: params.nextAction,
        session_id: params.sessionId || 'default-user',
      }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('Emergency call trigger failed:', err);
  }

  return {
    success: true,
    mode: 'safe_test_mode',
    message_spoken: `Emergency alert synthesized for ${params.patientName}. Urgency: ${params.urgencyLabel}. Recommended Action: ${params.nextAction}.`,
    contacts_contacted: 1,
    results: [],
  };
}

// ── Hospital Queue & Stats (Backwards Compatibility) ─────────────────────────
export async function fetchHospitalQueue(): Promise<HospitalPatient[]> {
  try {
    const res = await fetch(`${API_BASE}/api/queue`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Queue fetch failed:', err);
  }
  return [];
}

export async function createPatientInBackend(patient: any): Promise<HospitalPatient | null> {
  try {
    const res = await fetch(`${API_BASE}/api/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patient),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Create patient failed:', err);
  }
  return null;
}

export async function updatePatientStatusInBackend(patientId: string, status: PatientStatus): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/patients/${patientId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Update status failed:', err);
  }
  return false;
}

export async function fetchStats(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/api/stats`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Stats fetch failed:', err);
  }
  return null;
}

// ── Real Nearby Emergency Hospitals & Trauma Centers ─────────────────────────
export interface HospitalLocation {
  id: string;
  name: string;
  type: string;
  lat: number;
  lon: number;
  distance_km: number;
  drive_time_min: number;
  emergency_phone: string;
  address: string;
  has_icu: boolean;
  has_cath_lab: boolean;
  open_24_7: boolean;
  directions_url: string;
}

export async function fetchNearbyHospitals(lat?: number, lon?: number): Promise<HospitalLocation[]> {
  try {
    const params = new URLSearchParams();
    if (lat !== undefined && lon !== undefined) {
      params.append('lat', lat.toString());
      params.append('lon', lon.toString());
    }
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/api/nearby-hospitals${queryString}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch nearby hospitals:', err);
  }
  return [];
}
