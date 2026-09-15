export type Language = 'en' | 'hi' | 'mr';

export type Sex = 'male' | 'female' | 'other';

export type ESILevel = 1 | 2 | 3 | 4 | 5;

export interface PatientProfile {
  name: string;
  age: number | string;
  sex: Sex;
  language: Language;
}

export interface Vitals {
  temperature?: number | string; // °F
  heartRate?: number | string;   // bpm
  systolicBp?: number | string;  // mmHg
  diastolicBp?: number | string; // mmHg
  spO2?: number | string;        // %
}

export interface GuidedAnswers {
  onset?: 'sudden' | 'today' | 'few_days' | 'week_plus';
  severity?: number; // 1 to 10
  duration?: string;
  notes?: string;
}

export type BodyRegion = 'head' | 'chest' | 'abdomen' | 'arms' | 'legs' | 'back';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
  quickReplies?: string[];
}

export interface TriageResult {
  esi_level: ESILevel;
  urgency_label: string;
  reasoning: string[];
  red_flags: string[];
  next_action: 'Emergency now' | 'Visit hospital today' | 'Clinic within 48h' | 'Home care';
  home_care_tips: string[];
  confidence: 'low' | 'medium' | 'high';
  evaluated_at?: number;
  forcedByRedFlag?: boolean;
}

export type PatientStatus = 'Waiting' | 'In Treatment' | 'Discharged';

export interface HospitalPatient {
  id: string;
  token: string;
  name: string;
  age: number;
  sex: Sex;
  language: Language;
  chiefComplaint: string;
  esiLevel: ESILevel;
  triageResult: TriageResult;
  vitals: Vitals;
  chatTranscript: ChatMessage[];
  bodyRegions: BodyRegion[];
  arrivalTime: number; // Unix timestamp
  status: PatientStatus;
  waitMinutes?: number;
  assignedDoctor?: string;
  bed?: string;
  isSimulated?: boolean;
}
