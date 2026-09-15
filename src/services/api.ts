import {
  ChatMessage,
  ESILevel,
  GuidedAnswers,
  HospitalPatient,
  Language,
  PatientProfile,
  PatientStatus,
  TriageResult,
  Vitals,
  BodyRegion,
} from '../types';

// REQUIRED: Controlled via VITE_USE_MOCK env var (true = old mock, false = real backend)
export const USE_MOCK = (import.meta as any).env?.VITE_USE_MOCK === 'true';

export * from './triageApi';

const API_BASE = ''; // Vite proxy handles /api -> backend

/**
 * Deterministic Red-Flag Detection Engine.
 * MUST run BEFORE and AFTER AI evaluation.
 * The AI can NEVER downgrade a case flagged by this engine.
 */
export function detectRedFlags(
  text: string,
  vitals?: Vitals
): { hasRedFlags: boolean; detectedFlags: string[]; forcedEsi: 1 | 2 | null } {
  const flags: string[] = [];
  const lower = (text || '').toLowerCase();

  // Keyword criteria across English, Hindi, Marathi, and Hinglish
  const clinicalPatterns: { pattern: RegExp; label: string; level: 1 | 2 }[] = [
    {
      pattern: /(chest pain|pressure in chest|heart attack|angina|tightness in chest|heaviness in chest|छाती में दर्द|सीने में दर्द|छाती पर दबाव|छातीत दुखणे|छातीत दाब|छाती दुखते|छातीत जडपणा)/i,
      label: 'Chest pain / Acute Coronary Syndrome indicators',
      level: 1,
    },
    {
      pattern: /(difficulty breathing|shortness of breath|breathless|gasping|cannot breathe|can't breathe|suffocation|सांस लेने में तकलीफ|दम फूलना|सांस फूलना|श्वास घेण्यास त्रास|श्वास कोंडणे|दम लागणे)/i,
      label: 'Severe respiratory distress / Shortness of breath',
      level: 1,
    },
    {
      pattern: /(face droop|facial drooping|arm weakness|slurred speech|stroke|paralysis|sudden weakness|लकवा|फेशियल पाल्सी|मुंह टेढ़ा होना|बोलने में लड़खड़ाहट|अर्धांगवायू|चेहरा वाकडा|हात कमकुवत|बोलण्यात अडखळणे)/i,
      label: 'Stroke signs / Acute Neurological Deficit (FAST criteria)',
      level: 1,
    },
    {
      pattern: /(severe bleeding|uncontrolled bleed|hemorrhage|arterial bleed|blood spurting|gushing blood|भारी रक्तस्राव|अत्यधिक खून बहना|रक्त बहना रुक नहीं रहा|तीव्र रक्तस्त्राव|अति रक्तस्राव|रक्त थांबत नाही)/i,
      label: 'Severe or uncontrolled hemorrhage',
      level: 1,
    },
    {
      pattern: /(unconscious|passed out|fainted|unresponsive|syncope|collapsed|blacked out|बेहोश|मूर्छित|होश खो बैठना|बेशुद्ध|चक्कर येऊन पडणे|जाणीव नसणे)/i,
      label: 'Loss of consciousness / Unresponsiveness',
      level: 1,
    },
    {
      pattern: /(seizure|convulsion|fits|epilepsy|twitching involuntarily|दौरे|झटके|मिरगी का दौरा|आकडी|फेफरे|फिट येणे)/i,
      label: 'Active or recent seizure / Convulsions',
      level: 1,
    },
  ];

  for (const item of clinicalPatterns) {
    if (item.pattern.test(lower)) {
      flags.push(item.label);
    }
  }

  // Objective physiological vitals red flags
  if (vitals) {
    const spo2 = Number(vitals.spO2);
    if (!isNaN(spo2) && spo2 > 0 && spo2 < 90) {
      flags.push(`Critical hypoxemia: SpO2 ${spo2}% (< 90%)`);
    }

    const sysBp = Number(vitals.systolicBp);
    if (!isNaN(sysBp) && sysBp > 0 && sysBp < 90) {
      flags.push(`Shock / Severe hypotension: Systolic BP ${sysBp} mmHg (< 90 mmHg)`);
    }

    const hr = Number(vitals.heartRate);
    if (!isNaN(hr) && hr > 130) {
      flags.push(`Dangerous tachycardia: Heart Rate ${hr} bpm (> 130 bpm)`);
    }
  }

  const hasRedFlags = flags.length > 0;
  let forcedEsi: 1 | 2 | null = null;
  if (hasRedFlags) {
    const isLevel1 = flags.some(
      (f) =>
        f.includes('Chest pain') ||
        f.includes('Loss of consciousness') ||
        f.includes('respiratory distress') ||
        f.includes('Critical hypoxemia') ||
        f.includes('Shock / Severe hypotension')
    );
    forcedEsi = isLevel1 ? 1 : 2;
  }

  return { hasRedFlags, detectedFlags: flags, forcedEsi };
}

/**
 * Send interactive message to Triage Intake AI.
 * Handles server-side Gemini API or intelligent mock simulation.
 */
export async function sendChatMessage(params: {
  messages: ChatMessage[];
  language: Language;
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
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (response.ok) {
        const data = await response.json();
        return {
          nextQuestion: data.next_question,
          questionNumber: data.question_number,
          readyForAssessment: Boolean(data.ready_for_assessment),
          quickReplies: data.quick_replies || [],
        };
      }
    } catch (err) {
      console.warn('Backend chat API failed, falling back to mock engine:', err);
    }
  }

  // High-fidelity Mock Clinical Engine (Simulates Gemini reasoning)
  await new Promise((r) => setTimeout(r, 650)); // natural conversational latency

  const assistantCount = params.messages.filter((m) => m.sender === 'assistant').length;
  const userText = params.messages
    .filter((m) => m.sender === 'user')
    .map((m) => m.text)
    .join(' ')
    .toLowerCase();

  const lang = params.language || 'en';

  // Check if 3-4 questions reached
  const isComplete = assistantCount >= 3;

  if (isComplete) {
    const finalPrompts: Record<Language, { q: string; replies: string[] }> = {
      en: {
        q: 'Thank you. I have gathered enough information to calculate your triage score. Are there any other medical conditions or medications we should know?',
        replies: ['None', 'Diabetic / High BP', 'Asthma', 'Heart disease history'],
      },
      hi: {
        q: 'धन्यवाद। हमने आवश्यक जानकारी एकत्रित कर ली है। क्या आपको पहले से कोई अन्य बीमारी (जैसे शुगर, बीपी) या दवाएं चल रही हैं?',
        replies: ['कोई नहीं', 'शुगर / हाई बीपी', 'अस्थमा / दमा', 'हृदय रोग का इतिहास'],
      },
      mr: {
        q: 'धन्यवाद. आम्ही पुरेशी माहिती गोळा केली आहे. आपल्याला आधीचा काही आजार (जसे की मधुमेह, बीपी) किंवा चालू औषधे आहेत का?',
        replies: ['काही नाही', 'मधुमेह / उच्च रक्तदाब', 'दम्याचा त्रास', 'हृदयरोग इतिहास'],
      },
    };

    return {
      nextQuestion: finalPrompts[lang].q,
      questionNumber: assistantCount + 1,
      readyForAssessment: true,
      quickReplies: finalPrompts[lang].replies,
    };
  }

  // Question 1: Severity & Character
  if (assistantCount === 0) {
    if (userText.includes('chest') || userText.includes('छाती')) {
      const qChest: Record<Language, { q: string; replies: string[] }> = {
        en: {
          q: 'Is the chest discomfort spreading to your left arm, jaw, neck, or back? Are you feeling cold sweats or nausea?',
          replies: ['Spreading to left arm & jaw', 'Heavy sweating / Diaphoresis', 'Just center chest', 'No sweating or radiation'],
        },
        hi: {
          q: 'क्या छाती का दर्द आपके बाएं हाथ, जबड़े या पीठ की तरफ फैल रहा है? क्या आपको ठंडा पसीना या उल्टी जैसा महसूस हो रहा है?',
          replies: ['बाएं हाथ और जबड़े में फैल रहा है', 'बहुत पसीना आ रहा है', 'सिर्फ छाती के बीच में', 'पसीना नहीं है'],
        },
        mr: {
          q: 'छातीत होणारा त्रास डाव्या हाताकडे, जबड्याकडे किंवा पाठीकडे पसरत आहे का? सोबत गार घाम किंवा मळमळ जाणवत आहे का?',
          replies: ['डाव्या हातात व जबड्यात पसरतोय', 'खूप घाम येतोय', 'फक्त छातीच्या मध्यभागी', 'घाम किंवा मळमळ नाही'],
        },
      };
      return {
        nextQuestion: qChest[lang].q,
        questionNumber: 1,
        readyForAssessment: false,
        quickReplies: qChest[lang].replies,
      };
    }

    if (userText.includes('fever') || userText.includes('बुखार') || userText.includes('ताप')) {
      const qFever: Record<Language, { q: string; replies: string[] }> = {
        en: {
          q: 'How high has the fever been, and are you experiencing chills, vomiting, neck stiffness, or rash?',
          replies: ['102°F or higher', 'Mild 99-100°F', 'Chills and body ache', 'Vomiting / Unable to keep fluids'],
        },
        hi: {
          q: 'बुखार कितना तेज है? क्या आपको कंपकंपी, उल्टी, गर्दन में अकड़न या त्वचा पर कोई लाल दाने हैं?',
          replies: ['102°F या उससे अधिक', 'हल्का 99-100°F', 'ठंड और बदन दर्द', 'उल्टी हो रही है'],
        },
        mr: {
          q: 'ताप किती भरला आहे? आपल्याला थंडी वाजून येणे, उलटी, मान आखडणे किंवा अंगावर पुरळ उठणे असा त्रास आहे का?',
          replies: ['१०२°F किंवा जास्त', 'कमी ताप ९९-१००°F', 'थंडी वाजून अंगदुखी', 'उलटीचा त्रास होतोय'],
        },
      };
      return {
        nextQuestion: qFever[lang].q,
        questionNumber: 1,
        readyForAssessment: false,
        quickReplies: qFever[lang].replies,
      };
    }

    const qGeneral1: Record<Language, { q: string; replies: string[] }> = {
      en: {
        q: 'When exactly did this start, and would you describe the pain or discomfort as sharp, dull, throbbing, or burning?',
        replies: ['Started suddenly (< 1 hr ago)', 'Started today morning', 'Dull constant ache', 'Sharp / Throbbing'],
      },
      hi: {
        q: 'यह समस्या ठीक कब शुरू हुई, और क्या यह दर्द तेज, हल्का, जलन जैसा या चुभने वाला है?',
        replies: ['अचानक शुरू हुआ (< 1 घंटा)', 'आज सुबह से', 'हल्का लगातार दर्द', 'तेज / चुभने वाला'],
      },
      mr: {
        q: 'हा त्रास नक्की कधी सुरू झाला आणि वेदना कशा प्रकारच्या आहेत - तीव्र, मंद, जळजळणाऱ्या की टोचणाऱ्या?',
        replies: ['अचानक सुरू झाला (< १ तास)', 'आज सकाळपासून', 'मंद सतत दुखणे', 'तीव्र टोचणाऱ्या'],
      },
    };
    return {
      nextQuestion: qGeneral1[lang].q,
      questionNumber: 1,
      readyForAssessment: false,
      quickReplies: qGeneral1[lang].replies,
    };
  }

  // Question 2: Daily function, breathing & distress
  if (assistantCount === 1) {
    const qGeneral2: Record<Language, { q: string; replies: string[] }> = {
      en: {
        q: 'Are you experiencing any shortness of breath, dizziness, or difficulty standing and speaking?',
        replies: ['Yes, dizzy and breathless', 'Slight breathlessness', 'Can walk and speak normally', 'Feeling very weak'],
      },
      hi: {
        q: 'क्या आपको सांस फूलना, चक्कर आना, या खड़े होने और बात करने में कोई कठिनाई हो रही है?',
        replies: ['हां, चक्कर और सांस फूल रही है', 'हल्की सांस फूल रही है', 'सामान्य रूप से बोल पा रहे हैं', 'काफी कमजोरी महसूस हो रही है'],
      },
      mr: {
        q: 'आपल्याला धाप लागणे, चक्कर येणे, किंवा उभे राहण्यास आणि बोलण्यास त्रास होत आहे का?',
        replies: ['होय, चक्कर व धाप लागतेय', 'किंचित दम लागतोय', 'सामान्यपणे बोलू व चालू शकतो', 'खूप अशक्तपणा जाणवतोय'],
      },
    };
    return {
      nextQuestion: qGeneral2[lang].q,
      questionNumber: 2,
      readyForAssessment: false,
      quickReplies: qGeneral2[lang].replies,
    };
  }

  // Question 3: Medication taken & progress
  const qGeneral3: Record<Language, { q: string; replies: string[] }> = {
    en: {
      q: 'Have you taken any home remedies, paracetamol, or prescribed medication, and did it provide any relief?',
      replies: ['Took paracetamol, no relief', 'Took painkiller, slight relief', 'No medication taken yet', 'Symptoms worsening rapidly'],
    },
    hi: {
      q: 'क्या आपने कोई घरेलू उपाय, पैरासिटामोल या कोई दवा ली है, और क्या उससे कोई आराम मिला?',
      replies: ['पैरासिटामोल ली, आराम नहीं मिला', 'दवा ली, थोड़ा आराम है', 'अभी तक कोई दवा नहीं ली', 'लक्षण तेजी से बिगड़ रहे हैं'],
    },
    mr: {
      q: 'आपण काही घरगुती उपाय, पॅरासिटामॉल किंवा औषध घेतले आहे का, आणि त्याने काही आराम पडला का?',
      replies: ['पॅरासिटामॉल घेतली, आराम नाही', 'औषध घेतले, किंचित आराम', 'अजून कोणतेही औषध घेतलेले नाही', 'त्रास वेगाने वाढतोय'],
    },
  };

  return {
    nextQuestion: qGeneral3[lang].q,
    questionNumber: 3,
    readyForAssessment: true,
    quickReplies: qGeneral3[lang].replies,
  };
}

/**
 * Perform Triage Assessment (ESI 1-5).
 * Enforces: Red-flag check BEFORE and AFTER.
 * AI can NEVER downgrade a red-flag case!
 */
export async function performTriageAssessment(params: {
  messages: ChatMessage[];
  language: Language;
  patient?: PatientProfile;
  vitals?: Vitals;
  bodyRegions?: BodyRegion[];
  guidedAnswers?: GuidedAnswers;
}): Promise<TriageResult> {
  const combinedTranscript = [
    params.messages.map((m) => m.text).join(' '),
    params.guidedAnswers?.notes || '',
    params.guidedAnswers?.onset || '',
  ].join(' ');

  // 1. Deterministic red flag check BEFORE
  const preCheck = detectRedFlags(combinedTranscript, params.vitals);

  let result: TriageResult | null = null;

  if (!USE_MOCK) {
    try {
      const response = await fetch(`${API_BASE}/api/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (response.ok) {
        const data = await response.json();
        result = data;
      }
    } catch (err) {
      console.warn('Backend triage API error, utilizing deterministic local engine:', err);
    }
  }

  // Local Clinical Rule Engine (Used when USE_MOCK = true or backend fallback)
  if (!result) {
    await new Promise((r) => setTimeout(r, 800)); // triage calculation delay

    const lower = combinedTranscript.toLowerCase();
    const severity = Number(params.guidedAnswers?.severity || 4);
    const lang = params.language || 'en';

    if (preCheck.hasRedFlags) {
      const forcedLevel = preCheck.forcedEsi || 1;
      const isLevel1 = forcedLevel === 1;

      const descriptions: Record<Language, { label: string; bullets: string[]; nextAction: any; tips: string[] }> = {
        en: {
          label: isLevel1 ? 'Resuscitation (Immediate)' : 'Emergent (High Risk)',
          bullets: [
            `CRITICAL RED FLAG DETECTED: ${preCheck.detectedFlags[0] || 'High-risk clinical presentation'}.`,
            'High likelihood of acute life-threatening decompensation requiring immediate medical resuscitation.',
            'Physiological parameters or reported symptoms meet Emergency Severity Index (ESI) Level 1/2 criteria.',
            'Immediate hospital bed allocation and telemetry monitoring required.',
          ],
          nextAction: 'Emergency now',
          tips: [
            'Stop all physical exertion immediately. Sit upright or lie on your back in a comfortable position.',
            'Keep calm. Do not consume food, water, or unprescribed home medications.',
            'Have someone stay beside you and unlock the entrance for paramedics.',
          ],
        },
        hi: {
          label: isLevel1 ? 'अति-आपातकालीन (तत्काल उपचार)' : 'आपातकालीन (उच्च जोखिम)',
          bullets: [
            `गंभीर खतरे के संकेत (Red Flag): ${preCheck.detectedFlags[0] || 'तीव्र चिकित्सीय जोखिम'}।`,
            'तत्काल जीवन-रक्षक चिकित्सीय हस्तक्षेप (Resuscitation) की आवश्यकता है।',
            'ईएसआई (ESI) प्रोटोकॉल के अनुसार इसे स्तर 1/2 में वर्गीकृत किया गया है।',
            'बिना किसी देरी के नजदीकी अस्पताल के इमरजेंसी वार्ड में जाएं।',
          ],
          nextAction: 'Emergency now',
          tips: [
            'तुरंत आराम की स्थिति में बैठें या लेटें। किसी भी प्रकार की शारीरिक मेहनत न करें।',
            'शांत रहें। बिना डॉक्टर की सलाह के कोई गोली या पानी न लें।',
            'तुरंत 108 एम्बुलेंस को कॉल करें और किसी परिजन को पास रखें।',
          ],
        },
        mr: {
          label: isLevel1 ? 'अति-तातडीचे (त्वरित उपचार)' : 'तातडीचे (उच्च धोका)',
          bullets: [
            `धोक्याचे लक्षण (Red Flag) आढळले: ${preCheck.detectedFlags[0] || 'गंभीर वैद्यकीय लक्षणे'}.`,
            'रुग्णाला त्वरित जीवरक्षक वैद्यकीय उपचारांची (Emergency Triage) गरज आहे.',
            'ईएसआय (ESI) निकषानुसार ही लेव्हल १/२ ची स्थिती आहे.',
            'तातडीने जवळच्या हॉस्पिटलच्या अपघात विभागात (Casualty) दाखल व्हावे.',
          ],
          nextAction: 'Emergency now',
          tips: [
            'कोणतेही शारीरिक कष्ट करू नका. त्वरित शांत बसून किंवा झोपून राहा.',
            'घाबरू नका. डॉक्टरांच्या सल्ल्याशिवाय कोणतेही औषध किंवा पाणी पिऊ नका.',
            '१०८ रुग्णवाहिकेला तात्काळ संपर्क साधा.',
          ],
        },
      };

      const trans = descriptions[lang] || descriptions.en;
      result = {
        esi_level: forcedLevel,
        urgency_label: trans.label,
        reasoning: trans.bullets,
        red_flags: preCheck.detectedFlags,
        next_action: trans.nextAction,
        home_care_tips: trans.tips,
        confidence: 'high',
        evaluated_at: Date.now(),
        forcedByRedFlag: true,
      };
    } else if (lower.includes('fever') || lower.includes('बुखार') || lower.includes('ताप') || severity >= 6) {
      // ESI 3: Urgent (Needs 2+ resources, stable vitals)
      const isUrgentFever = lower.includes('102') || severity >= 7;
      const trans: Record<Language, { label: string; bullets: string[]; tips: string[] }> = {
        en: {
          label: 'Urgent (Within 1 Hour)',
          bullets: [
            'Systemic symptom complex requiring hospital clinical evaluation and diagnostic laboratory/imaging resources.',
            'Vital signs are currently stable, but continuous fever or moderate discomfort requires medical intervention.',
            'Anticipated clinical resources: Complete blood count (CBC), urine analysis, or oral/IV hydration.',
            'Follow up with emergency physician today.',
          ],
          tips: [
            'Keep hydrated with clean water, ORS (oral rehydration solution), or light broth.',
            'Rest in a well-ventilated room with light clothing.',
            'Monitor temperature every 3-4 hours; seek emergency care immediately if temperature exceeds 104°F or confusion occurs.',
          ],
        },
        hi: {
          label: 'जरूरी (1 घंटे के भीतर)',
          bullets: [
            'लक्षणों की गंभीरता के कारण अस्पताल में डॉक्टर द्वारा जांच और परीक्षण (लैब टेस्ट) की जरूरत है।',
            'महत्वपूर्ण संकेत (Vitals) अभी स्थिर हैं, लेकिन बुखार या दर्द के लिए चिकित्सकीय सहायता आवश्यक है।',
            'संभावित संसाधन: खून की जांच, यूरिन टेस्ट या आईवी ड्रिप।',
            'आज ही नजदीकी अस्पताल या क्लीनिक में संपर्क करें।',
          ],
          tips: [
            'ओआरएस (ORS) और स्वच्छ पानी पीकर शरीर में पानी की कमी न होने दें।',
            'हवादार कमरे में आराम करें।',
            'हर 3-4 घंटे में थर्मामीटर से तापमान जांचें; यदि दौरा पड़े या सांस फूले तो तुरंत 108 पर कॉल करें।',
          ],
        },
        mr: {
          label: 'तातडीचे (१ तासाच्या आत)',
          bullets: [
            'लक्षणे पाहता रुग्णालयात वैद्यकीय तपासणी आणि प्रयोगशाळा चाचण्यांची (Blood/Urine tests) आवश्यकता आहे.',
            'सध्या रुग्णाचे व्हायटल्स स्थिर आहेत, परंतु त्रास कमी करण्यासाठी डॉक्टरांचा सल्ला आवश्यक आहे.',
            'रुग्णाने आजच दवाखान्यात जाऊन डॉक्टरांना दाखवावे.',
          ],
          tips: [
            'ओआरएस (ORS) आणि पुरेसे पाणी पिऊन शरीरातील पाण्याचे प्रमाण टिकवून ठेवा.',
            'ताप दर ३-४ तासांनी मोजा आणि नोंद ठेवा.',
            'त्रास वाढल्यास त्वरित जवळच्या दवाखान्यात जा.',
          ],
        },
      };

      const t = trans[lang] || trans.en;
      result = {
        esi_level: 3,
        urgency_label: t.label,
        reasoning: t.bullets,
        red_flags: [],
        next_action: isUrgentFever ? 'Visit hospital today' : 'Clinic within 48h',
        home_care_tips: t.tips,
        confidence: 'high',
        evaluated_at: Date.now(),
      };
    } else if (lower.includes('sprain') || lower.includes('ankle') || lower.includes('cut') || severity >= 3) {
      // ESI 4 or 5
      const isCut = lower.includes('cut') || lower.includes('finger') || lower.includes('wound');
      const level: ESILevel = isCut ? 5 : 4;

      const trans: Record<Language, { label: string; bullets: string[]; nextAction: any; tips: string[] }> = {
        en: {
          label: level === 4 ? 'Less Urgent (Clinic / OPD)' : 'Non-Urgent (Routine Care)',
          bullets: [
            'Localized superficial presentation with normal physiological baseline.',
            `Predicted resource requirements: ${level === 4 ? 'Single diagnostic resource (e.g. simple x-ray or dressing)' : 'No hospital emergency resources needed'}.`,
            'Stable vital signs with low acute progression risk.',
            'Appropriate for outpatient primary care clinic or routine dressing.',
          ],
          nextAction: level === 4 ? 'Clinic within 48h' : 'Home care',
          tips: [
            'Keep the affected area clean, dry, and elevated if swollen.',
            'Apply gentle pressure with clean gauze for small superficial abrasions.',
            'Check that your Tetanus toxoid (TT) vaccination is up to date within the last 5 years.',
          ],
        },
        hi: {
          label: level === 4 ? 'कम जरूरी (ओपीडी / क्लीनिक)' : 'गैर-आपातकालीन (घरेलू प्राथमिक उपचार)',
          bullets: [
            'लक्षण सामान्य हैं और शरीर के मुख्य अंग पूरी तरह सुरक्षित हैं।',
            'अस्पताल के आपातकालीन संसाधनों की आवश्यकता नहीं है; सामान्य ओपीडी या प्राथमिक चिकित्सा पर्याप्त है।',
            'महत्वपूर्ण संकेत (Vitals) पूरी तरह सामान्य हैं।',
          ],
          nextAction: level === 4 ? 'Clinic within 48h' : 'Home care',
          tips: [
            'चोट वाली जगह को साफ और सूखा रखें।',
            'हल्की चोट पर साफ पट्टी या बैंडेज लगाएं।',
            'यदि पिछले ५ वर्षों में टिटनेस का टीका नहीं लगा है, तो डॉक्टर से लगवाएं।',
          ],
        },
        mr: {
          label: level === 4 ? 'कमी तातडीचे (ओपीडी)' : 'सामान्य (घरगुती प्राथमिक काळजी)',
          bullets: [
            'लक्षणे प्राथमिक स्वरूपाची असून रुग्णाची प्रकृती पूर्णपणे स्थिर आहे.',
            'मोठ्या आपत्कालीन उपचारांची गरज नाही; प्राथमिक तपासणी किंवा मलमपट्टी पुरेशी आहे.',
            'व्हायटल्स सामान्य मर्यादेत आहेत.',
          ],
          nextAction: level === 4 ? 'Clinic within 48h' : 'Home care',
          tips: [
            'जखमेची जागा स्वच्छ आणि कोरडी ठेवा.',
            'साफ कापूस किंवा पट्टीने मलमपट्टी करा.',
            'धनुर्वात (Tetanus) लस घेतलेली नसल्यास नजीकच्या दवाखान्यात जाऊन घ्या.',
          ],
        },
      };

      const t = trans[lang] || trans.en;
      result = {
        esi_level: level,
        urgency_label: t.label,
        reasoning: t.bullets,
        red_flags: [],
        next_action: t.nextAction,
        home_care_tips: t.tips,
        confidence: 'high',
        evaluated_at: Date.now(),
      };
    } else {
      // Default ESI 4
      result = {
        esi_level: 4,
        urgency_label: 'Less Urgent (Primary Care)',
        reasoning: [
          'Stable clinical presentation with no life-threatening physiological red flags.',
          'Expected clinical intervention requires minimal emergency department resources.',
          'Safe for scheduled evaluation at a primary healthcare center (PHC) or clinic.',
        ],
        red_flags: [],
        next_action: 'Clinic within 48h',
        home_care_tips: [
          'Rest and monitor your condition for any change in symptoms.',
          'Stay hydrated and avoid heavy physical exertion.',
        ],
        confidence: 'medium',
        evaluated_at: Date.now(),
      };
    }
  }

  // 2. Deterministic red flag check AFTER AI: AI can NEVER downgrade a red-flag case!
  const postCheck = detectRedFlags(
    combinedTranscript + ' ' + JSON.stringify(result.red_flags || []),
    params.vitals
  );

  if (preCheck.hasRedFlags || postCheck.hasRedFlags) {
    const forced = (preCheck.forcedEsi === 1 || postCheck.forcedEsi === 1) ? 1 : 2;
    if (result.esi_level > forced) {
      result.esi_level = forced;
      result.urgency_label = forced === 1 ? 'Resuscitation (Immediate)' : 'Emergent (High Risk)';
      result.next_action = 'Emergency now';
      result.forcedByRedFlag = true;
      result.reasoning.unshift(
        `[SAFETY OVERRIDE] Deterministic clinical red flag detected (${preCheck.detectedFlags[0] || postCheck.detectedFlags[0]}). AI downgrade strictly prevented by Aarogya protocol.`
      );
    }
    result.red_flags = Array.from(
      new Set([...preCheck.detectedFlags, ...postCheck.detectedFlags, ...(result.red_flags || [])])
    );
  }

  return result;
}

/**
 * Hospital queue initialized empty until real triage sessions are submitted.
 */
export function getInitialHospitalPatients(): HospitalPatient[] {
  return [];
}


/**
 * Fetch hospital queue from the backend.
 * Returns patients sorted by ESI level ASC, then created_at ASC.
 */
export async function fetchHospitalQueue(): Promise<HospitalPatient[]> {
  try {
    const response = await fetch(`${API_BASE}/api/queue`);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (err) {
    console.warn('Failed to fetch hospital queue:', err);
  }
  return [];
}

/**
 * Create a patient case in the backend (send to hospital queue).
 */
export async function createPatientInBackend(patient: {
  token: string;
  name: string;
  age: number;
  sex: string;
  language: string;
  chiefComplaint: string;
  esiLevel: number;
  triageResult: TriageResult;
  vitals: Vitals;
  chatTranscript: ChatMessage[];
  bodyRegions: BodyRegion[];
}): Promise<HospitalPatient | null> {
  try {
    const response = await fetch(`${API_BASE}/api/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patient),
    });
    if (response.ok) {
      return await response.json();
    }
    const err = await response.json();
    console.error('Failed to create patient:', err);
  } catch (err) {
    console.error('Failed to create patient:', err);
  }
  return null;
}

/**
 * Update a patient's status in the backend.
 */
export async function updatePatientStatusInBackend(
  patientId: string,
  status: PatientStatus
): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/patients/${patientId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return response.ok;
  } catch (err) {
    console.error('Failed to update patient status:', err);
    return false;
  }
}

/**
 * Fetch ER dashboard stats from the backend.
 */
export async function fetchStats(): Promise<{
  total: number;
  critical: number;
  waiting: number;
  inTreatment: number;
  avgWaitMinutes: number;
} | null> {
  try {
    const response = await fetch(`${API_BASE}/api/stats`);
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('Failed to fetch stats:', err);
  }
  return null;
}
