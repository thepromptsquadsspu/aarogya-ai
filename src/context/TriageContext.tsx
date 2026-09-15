import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  BodyRegion,
  ChatMessage,
  GuidedAnswers,
  HospitalPatient,
  Language,
  PatientProfile,
  PatientStatus,
  TriageResult,
  Vitals,
  AppView,
} from '../types';
import {
  getInitialHospitalPatients,
  performTriageAssessment,
  fetchHospitalQueue,
  createPatientInBackend,
  updatePatientStatusInBackend,
  USE_MOCK,
} from '../services/api';

interface CurrentIntakeState {
  profile: PatientProfile;
  vitals: Vitals;
  guided: GuidedAnswers;
  bodyRegions: BodyRegion[];
  chatMessages: ChatMessage[];
  triageResult: TriageResult | null;
  step: 'onboarding' | 'intake' | 'result';
  isAssessing: boolean;
  hasSentToHospital: boolean;
  hospitalToken: string;
}

interface TriageContextType {
  view: AppView;
  setView: (v: AppView) => void;
  hospitalQueue: HospitalPatient[];
  updatePatientStatus: (patientId: string, status: PatientStatus) => void;
  sendCurrentPatientToHospital: () => HospitalPatient;
  currentIntake: CurrentIntakeState;
  setLanguage: (lang: Language) => void;
  setProfile: (profile: Partial<PatientProfile>) => void;
  setVitals: (vitals: Partial<Vitals>) => void;
  setGuided: (guided: Partial<GuidedAnswers>) => void;
  toggleBodyRegion: (region: BodyRegion) => void;
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  addChatMessage: (msg: ChatMessage) => void;
  setTriageResult: (result: TriageResult | null) => void;
  setStep: (step: 'onboarding' | 'intake' | 'result') => void;
  resetPatient: () => void;
  triggerTriageCalculation: () => Promise<void>;
  runDemoScenario: (scenarioId: 'chest_pain' | 'fever' | 'cut') => Promise<void>;
  selectedPatientForDetail: HospitalPatient | null;
  setSelectedPatientForDetail: (pt: HospitalPatient | null) => void;
}

const defaultProfile: PatientProfile = {
  name: '',
  age: '',
  sex: 'male',
  language: 'en',
};

const defaultVitals: Vitals = {
  temperature: '',
  heartRate: '',
  systolicBp: '',
  diastolicBp: '',
  spO2: '',
};

const defaultGuided: GuidedAnswers = {
  onset: 'today',
  severity: 5,
  duration: 'A few hours',
  notes: '',
};

const TriageContext = createContext<TriageContextType | undefined>(undefined);

export const TriageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [view, setView] = useState<AppView>('landing');
  const [hospitalQueue, setHospitalQueue] = useState<HospitalPatient[]>(() =>
    USE_MOCK ? getInitialHospitalPatients() : []
  );
  const [selectedPatientForDetail, setSelectedPatientForDetail] = useState<HospitalPatient | null>(null);

  // Fetch hospital queue from backend on mount and poll when on hospital view
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadQueue = useCallback(async () => {
    try {
      const queue = await fetchHospitalQueue();
      setHospitalQueue(queue);
    } catch (err) {
      console.warn('Queue fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    if (USE_MOCK) return;
    // Initial fetch
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (USE_MOCK) return;
    if (view === 'hospital') {
      // Poll every 5 seconds when on hospital dashboard
      pollingRef.current = setInterval(loadQueue, 5000);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [view, loadQueue]);

  const [currentIntake, setCurrentIntake] = useState<CurrentIntakeState>({
    profile: { ...defaultProfile },
    vitals: { ...defaultVitals },
    guided: { ...defaultGuided },
    bodyRegions: [],
    chatMessages: [],
    triageResult: null,
    step: 'onboarding',
    isAssessing: false,
    hasSentToHospital: false,
    hospitalToken: '',
  });

  // Sort hospital queue: ESI level ascending (1 is highest priority), then arrival time ascending (earliest first)
  const sortedHospitalQueue = useMemo(() => {
    return [...hospitalQueue].sort((a, b) => {
      if (a.esiLevel !== b.esiLevel) {
        return a.esiLevel - b.esiLevel;
      }
      return a.arrivalTime - b.arrivalTime;
    });
  }, [hospitalQueue]);

  const updatePatientStatus = (patientId: string, status: PatientStatus) => {
    setHospitalQueue((prev) =>
      prev.map((pt) => (pt.id === patientId ? { ...pt, status } : pt))
    );
    if (selectedPatientForDetail && selectedPatientForDetail.id === patientId) {
      setSelectedPatientForDetail((prev) => (prev ? { ...prev, status } : null));
    }
    // Sync with backend
    if (!USE_MOCK) {
      updatePatientStatusInBackend(patientId, status).catch((err) =>
        console.warn('Backend status update failed:', err)
      );
    }
  };

  const setLanguage = (language: Language) => {
    setCurrentIntake((prev) => ({
      ...prev,
      profile: { ...prev.profile, language },
    }));
  };

  const setProfile = (profile: Partial<PatientProfile>) => {
    setCurrentIntake((prev) => ({
      ...prev,
      profile: { ...prev.profile, ...profile },
    }));
  };

  const setVitals = (vitals: Partial<Vitals>) => {
    setCurrentIntake((prev) => ({
      ...prev,
      vitals: { ...prev.vitals, ...vitals },
    }));
  };

  const setGuided = (guided: Partial<GuidedAnswers>) => {
    setCurrentIntake((prev) => ({
      ...prev,
      guided: { ...prev.guided, ...guided },
    }));
  };

  const toggleBodyRegion = (region: BodyRegion) => {
    setCurrentIntake((prev) => {
      const exists = prev.bodyRegions.includes(region);
      return {
        ...prev,
        bodyRegions: exists
          ? prev.bodyRegions.filter((r) => r !== region)
          : [...prev.bodyRegions, region],
      };
    });
  };

  const setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>> = (action) => {
    setCurrentIntake((prev) => ({
      ...prev,
      chatMessages: typeof action === 'function' ? action(prev.chatMessages) : action,
    }));
  };

  const addChatMessage = (msg: ChatMessage) => {
    setCurrentIntake((prev) => ({
      ...prev,
      chatMessages: [...prev.chatMessages, msg],
    }));
  };

  const setTriageResult = (result: TriageResult | null) => {
    setCurrentIntake((prev) => ({
      ...prev,
      triageResult: result,
    }));
  };

  const setStep = (step: 'onboarding' | 'intake' | 'result') => {
    setCurrentIntake((prev) => ({
      ...prev,
      step,
    }));
  };

  const resetPatient = () => {
    setCurrentIntake({
      profile: { ...defaultProfile },
      vitals: { ...defaultVitals },
      guided: { ...defaultGuided },
      bodyRegions: [],
      chatMessages: [],
      triageResult: null,
      step: 'onboarding',
      isAssessing: false,
      hasSentToHospital: false,
      hospitalToken: '',
    });
  };

  const triggerTriageCalculation = async () => {
    setCurrentIntake((prev) => ({ ...prev, isAssessing: true }));
    try {
      const result = await performTriageAssessment({
        messages: currentIntake.chatMessages,
        language: currentIntake.profile.language,
        patient: currentIntake.profile,
        vitals: currentIntake.vitals,
        bodyRegions: currentIntake.bodyRegions,
        guidedAnswers: currentIntake.guided,
      });

      const tokenNum = Math.floor(100 + Math.random() * 900);
      const token = `AR-${tokenNum}`;

      setCurrentIntake((prev) => ({
        ...prev,
        triageResult: result,
        hospitalToken: token,
        isAssessing: false,
        step: 'result',
      }));
    } catch (err) {
      console.error('Triage calculation error:', err);
      setCurrentIntake((prev) => ({ ...prev, isAssessing: false }));
    }
  };

  const sendCurrentPatientToHospital = (): HospitalPatient => {
    const chief =
      currentIntake.chatMessages.find((m) => m.sender === 'user')?.text ||
      currentIntake.guided.notes ||
      'Symptom intake triage request';

    const token = currentIntake.hospitalToken || `AR-${Math.floor(100 + Math.random() * 900)}`;

    const newPt: HospitalPatient = {
      id: `pt-${Date.now()}`,
      token,
      name: currentIntake.profile.name || 'Anonymous Patient',
      age: Number(currentIntake.profile.age) || 30,
      sex: currentIntake.profile.sex,
      language: currentIntake.profile.language,
      chiefComplaint: chief,
      esiLevel: currentIntake.triageResult?.esi_level || 3,
      triageResult: currentIntake.triageResult!,
      vitals: currentIntake.vitals,
      chatTranscript: currentIntake.chatMessages,
      bodyRegions: currentIntake.bodyRegions,
      arrivalTime: Date.now(),
      status: 'Waiting',
      waitMinutes: 0,
      isSimulated: false,
    };

    setHospitalQueue((prev) => [newPt, ...prev]);
    setCurrentIntake((prev) => ({
      ...prev,
      hasSentToHospital: true,
      hospitalToken: token,
    }));

    // Persist to backend
    if (!USE_MOCK) {
      createPatientInBackend({
        token,
        name: newPt.name,
        age: newPt.age,
        sex: newPt.sex,
        language: newPt.language,
        chiefComplaint: newPt.chiefComplaint,
        esiLevel: newPt.esiLevel,
        triageResult: newPt.triageResult,
        vitals: newPt.vitals,
        chatTranscript: newPt.chatTranscript,
        bodyRegions: newPt.bodyRegions,
      }).then((created) => {
        if (created) {
          // Update with server-assigned ID
          setHospitalQueue((prev) =>
            prev.map((pt) => (pt.id === newPt.id ? { ...pt, id: created.id } : pt))
          );
        }
      }).catch((err) => console.warn('Backend patient create failed:', err));
    }

    return newPt;
  };

  // One-click demo scenario execution
  const runDemoScenario = async (scenarioId: 'chest_pain' | 'fever' | 'cut') => {
    resetPatient();
    const now = Date.now();

    if (scenarioId === 'chest_pain') {
      // 58M chest pain + sweating → ESI 1
      const profile: PatientProfile = {
        name: 'Ramachandran Iyer',
        age: 58,
        sex: 'male',
        language: 'en',
      };
      const vitals: Vitals = {
        temperature: 98.4,
        heartRate: 134,
        systolicBp: 86,
        diastolicBp: 56,
        spO2: 91,
      };
      const guided: GuidedAnswers = {
        onset: 'sudden',
        severity: 9,
        duration: '45 minutes',
        notes: 'Crushing retrosternal chest pain with diaphoresis',
      };
      const bodyRegions: BodyRegion[] = ['chest', 'arms'];
      const chatMessages: ChatMessage[] = [
        {
          id: 'sc1-m1',
          sender: 'assistant',
          text: 'Namaste Ramachandran. Aarogya AI is here to assist with your medical triage. What symptoms are you experiencing?',
          timestamp: now - 30000,
        },
        {
          id: 'sc1-m2',
          sender: 'user',
          text: 'Severe crushing chest pain started 45 minutes ago. Heavy sweating and pain going into my left arm.',
          timestamp: now - 25000,
        },
        {
          id: 'sc1-m3',
          sender: 'assistant',
          text: 'Is the chest discomfort spreading to your neck or jaw? Are you feeling breathless or lightheaded?',
          timestamp: now - 20000,
        },
        {
          id: 'sc1-m4',
          sender: 'user',
          text: 'Yes, feeling very lightheaded, gasping for breath and nauseous.',
          timestamp: now - 15000,
        },
      ];

      const triageRes: TriageResult = {
        esi_level: 1,
        urgency_label: 'Resuscitation (Immediate)',
        reasoning: [
          'CRITICAL RED FLAG: Acute Coronary Syndrome indicators with hemodynamic shock (Systolic BP 86 mmHg).',
          'Dangerous tachycardia (HR 134 bpm) + profuse cold diaphoresis.',
          'Deterministic safety engine forced Level 1: Immediate life-saving resuscitation required.',
          'Paramedics / Emergency room cath lab readiness activated.',
        ],
        red_flags: [
          'Chest pain / Acute Coronary Syndrome indicators',
          'Shock / Severe hypotension: Systolic BP 86 mmHg (< 90 mmHg)',
          'Dangerous tachycardia: Heart Rate 134 bpm (> 130 bpm)',
        ],
        next_action: 'Emergency now',
        home_care_tips: [
          'Cease all movement immediately. Sit upright or in a semi-reclined resting position.',
          'Call 108 Emergency Ambulance service right away.',
          'Do not take food, water, or exertion.',
        ],
        confidence: 'high',
        evaluated_at: now,
        forcedByRedFlag: true,
      };

      setCurrentIntake({
        profile,
        vitals,
        guided,
        bodyRegions,
        chatMessages,
        triageResult: triageRes,
        step: 'result',
        isAssessing: false,
        hasSentToHospital: false,
        hospitalToken: 'AR-581',
      });
    } else if (scenarioId === 'fever') {
      // 6F fever 102°F for 2 days → ESI 3
      const profile: PatientProfile = {
        name: 'Aarohi Patil',
        age: 6,
        sex: 'female',
        language: 'en',
      };
      const vitals: Vitals = {
        temperature: 102.4,
        heartRate: 112,
        systolicBp: 102,
        diastolicBp: 66,
        spO2: 98,
      };
      const guided: GuidedAnswers = {
        onset: 'few_days',
        severity: 6,
        duration: '2 days',
        notes: 'Persistent high fever 102.4°F with chills and mild lethargy',
      };
      const bodyRegions: BodyRegion[] = ['head'];
      const chatMessages: ChatMessage[] = [
        {
          id: 'sc2-m1',
          sender: 'assistant',
          text: 'Hello. How can we help Aarohi today? Please describe her symptoms.',
          timestamp: now - 30000,
        },
        {
          id: 'sc2-m2',
          sender: 'user',
          text: 'She has had continuous high fever of 102°F for the past 2 days with chills and loss of appetite.',
          timestamp: now - 25000,
        },
        {
          id: 'sc2-m3',
          sender: 'assistant',
          text: 'Is she drinking water, and are there any rashes, neck stiffness, or vomiting?',
          timestamp: now - 20000,
        },
        {
          id: 'sc2-m4',
          sender: 'user',
          text: 'Drinking small sips of water. No vomiting or stiff neck, but very cranky and warm.',
          timestamp: now - 15000,
        },
      ];

      const triageRes: TriageResult = {
        esi_level: 3,
        urgency_label: 'Urgent (Within 1 Hour)',
        reasoning: [
          'Pediatric febrile illness with persistent temperature 102.4°F for 48 hours.',
          'Stable respiratory status and intact neurological signs, no convulsions or stiff neck.',
          'Requires 2+ hospital resources: Complete blood count (CBC/Dengue/Malaria screening) and clinical pediatric exam.',
          'Recommend hospital outpatient or urgent pediatric evaluation today.',
        ],
        red_flags: [],
        next_action: 'Visit hospital today',
        home_care_tips: [
          'Provide oral fluids (ORS, water, coconut water) to maintain hydration.',
          'Use lukewarm sponging on forehead and limbs if fever is high.',
          'Seek immediate emergency care if child becomes unresponsive, vomits repeatedly, or develops breathing distress.',
        ],
        confidence: 'high',
        evaluated_at: now,
      };

      setCurrentIntake({
        profile,
        vitals,
        guided,
        bodyRegions,
        chatMessages,
        triageResult: triageRes,
        step: 'result',
        isAssessing: false,
        hasSentToHospital: false,
        hospitalToken: 'AR-603',
      });
    } else if (scenarioId === 'cut') {
      // 24M small cut on finger → ESI 5
      const profile: PatientProfile = {
        name: 'Arjun Mehta',
        age: 24,
        sex: 'male',
        language: 'en',
      };
      const vitals: Vitals = {
        temperature: 98.6,
        heartRate: 72,
        systolicBp: 118,
        diastolicBp: 76,
        spO2: 99,
      };
      const guided: GuidedAnswers = {
        onset: 'today',
        severity: 2,
        duration: '1 hour ago',
        notes: 'Superficial 1cm knife cut on left index finger, bleeding controlled',
      };
      const bodyRegions: BodyRegion[] = ['arms'];
      const chatMessages: ChatMessage[] = [
        {
          id: 'sc3-m1',
          sender: 'assistant',
          text: 'Namaste Arjun. What injury or symptom would you like to assess?',
          timestamp: now - 30000,
        },
        {
          id: 'sc3-m2',
          sender: 'user',
          text: 'Got a small kitchen knife cut on my left index finger while chopping vegetables. Bleeding has stopped.',
          timestamp: now - 25000,
        },
        {
          id: 'sc3-m3',
          sender: 'assistant',
          text: 'Can you bend your finger fully without numbness, and is the cut deep enough to see fat or bone?',
          timestamp: now - 20000,
        },
        {
          id: 'sc3-m4',
          sender: 'user',
          text: 'Yes, I can move it normally. Sensation is fine and it looks very superficial.',
          timestamp: now - 15000,
        },
      ];

      const triageRes: TriageResult = {
        esi_level: 5,
        urgency_label: 'Non-Urgent (Home Care / First Aid)',
        reasoning: [
          'Superficial minor skin laceration with spontaneous hemostasis.',
          'Zero emergency hospital resources indicated; first-aid wound wash and dressing sufficient.',
          'Completely normal physiological vitals and intact motor/sensory function.',
          'Low infectious risk if cleaned promptly.',
        ],
        red_flags: [],
        next_action: 'Home care',
        home_care_tips: [
          'Wash wound under cool running water with mild antibacterial soap for 2-3 minutes.',
          'Apply an over-the-counter antiseptic ointment and a clean adhesive bandage.',
          'Verify that your Tetanus toxoid booster is up to date (within past 5 years).',
        ],
        confidence: 'high',
        evaluated_at: now,
      };

      setCurrentIntake({
        profile,
        vitals,
        guided,
        bodyRegions,
        chatMessages,
        triageResult: triageRes,
        step: 'result',
        isAssessing: false,
        hasSentToHospital: false,
        hospitalToken: 'AR-245',
      });
    }
  };

  return (
    <TriageContext.Provider
      value={{
        view,
        setView,
        hospitalQueue: sortedHospitalQueue,
        updatePatientStatus,
        sendCurrentPatientToHospital,
        currentIntake,
        setLanguage,
        setProfile,
        setVitals,
        setGuided,
        toggleBodyRegion,
        setChatMessages,
        addChatMessage,
        setTriageResult,
        setStep,
        resetPatient,
        triggerTriageCalculation,
        runDemoScenario,
        selectedPatientForDetail,
        setSelectedPatientForDetail,
      }}
    >
      {children}
    </TriageContext.Provider>
  );
};

export const useTriage = () => {
  const context = useContext(TriageContext);
  if (!context) {
    throw new Error('useTriage must be used within a TriageProvider');
  }
  return context;
};
