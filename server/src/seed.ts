/**
 * Seed Script — Inserts 8 mock patients into the database.
 *
 * Run with: npm run seed (or: npx tsx src/seed.ts)
 */

import dotenv from 'dotenv';
dotenv.config();

import { initDb, getDb, closeDb } from './db.js';

// Initialize the database / create tables
initDb();

const db = getDb();
const now = Date.now();

const patients = [
  {
    id: 'pt-seed-1',
    token: 'AR-101',
    name: 'Ramesh Patel',
    age: 62,
    sex: 'male',
    language: 'en',
    chief_complaint:
      'Crushing retrosternal chest pain radiating to left jaw with cold diaphoresis',
    esi_level: 1,
    status: 'Waiting',
    wait_minutes: 8,
    assigned_doctor: 'Dr. Sanjeev Mehta (ER Resus)',
    bed: 'Resus Bay 1',
    is_simulated: 1,
    vitals: { temperature: 98.4, heartRate: 134, systolicBp: 86, diastolicBp: 54, spO2: 91 },
    body_regions: ['chest', 'arms'],
    transcript: [
      {
        id: 'm1', sender: 'assistant',
        text: 'Hello Ramesh. Please describe what you are feeling.',
        timestamp: now - 12 * 60 * 1000,
      },
      {
        id: 'm2', sender: 'user',
        text: 'Heavy squeezing chest pain started 45 minutes ago. Going into my left arm. Profuse cold sweat.',
        timestamp: now - 11 * 60 * 1000,
      },
      {
        id: 'm3', sender: 'assistant',
        text: 'Are you having shortness of breath or dizziness?',
        timestamp: now - 10 * 60 * 1000,
      },
      {
        id: 'm4', sender: 'user',
        text: 'Yes, very breathless and feeling like passing out.',
        timestamp: now - 9 * 60 * 1000,
      },
    ],
    triage_result: {
      esi_level: 1,
      urgency_label: 'Resuscitation (Immediate)',
      reasoning: [
        'Severe acute coronary syndrome (ACS) symptoms with hemodynamic instability (Systolic BP 86 mmHg).',
        'Dangerous tachycardia (HR 134 bpm) with active diaphoresis.',
        'Immediate 12-lead ECG, oxygen, and emergency cath lab activation required.',
        'Deterministic Red Flag: Chest pain + shock physiology.',
      ],
      red_flags: [
        'Chest pain / Acute Coronary Syndrome indicators',
        'Shock / Severe hypotension: Systolic BP 86 mmHg (< 90 mmHg)',
        'Dangerous tachycardia: Heart Rate 134 bpm (> 130 bpm)',
      ],
      next_action: 'Emergency now',
      home_care_tips: ['Immediate paramedic intervention only', 'Do not walk or exert'],
      confidence: 'high',
      evaluated_at: now - 8 * 60 * 1000,
      forcedByRedFlag: true,
    },
  },
  {
    id: 'pt-seed-2',
    token: 'AR-102',
    name: 'Ananya Deshmukh',
    age: 4,
    sex: 'female',
    language: 'mr',
    chief_complaint:
      'Post-ictal lethargy following 2-minute febrile convulsion at home',
    esi_level: 2,
    status: 'In Treatment',
    wait_minutes: 22,
    assigned_doctor: 'Dr. Neha Kulkarni (Pediatrics)',
    bed: 'Pediatric Bed 3',
    is_simulated: 1,
    vitals: { temperature: 103.8, heartRate: 140, systolicBp: 96, diastolicBp: 62, spO2: 96 },
    body_regions: ['head'],
    transcript: [
      {
        id: 'm1', sender: 'assistant',
        text: 'नमस्कार, अनन्योच्या आई-बाबांनो. काय त्रास झाला आहे सांगाल का?',
        timestamp: now - 25 * 60 * 1000,
      },
      {
        id: 'm2', sender: 'user',
        text: 'तिला १०३ ताप होता आणि अचानक हातपाय झटकू लागली (फेफरे आले), २ मिनिटे डोळे फिरले होते.',
        timestamp: now - 24 * 60 * 1000,
      },
      {
        id: 'm3', sender: 'assistant',
        text: 'आता मुलगी शुद्धीवर आहे का आणि रडत आहे का?',
        timestamp: now - 23 * 60 * 1000,
      },
      {
        id: 'm4', sender: 'user',
        text: 'खूप सुस्त आहे, डोळे उघडत नाहीये आणि अंग खूप गरम आहे.',
        timestamp: now - 22 * 60 * 1000,
      },
    ],
    triage_result: {
      esi_level: 2,
      urgency_label: 'Emergent (High Risk)',
      reasoning: [
        'Pediatric febrile seizure with post-ictal altered mental status and hyperpyrexia (103.8°F).',
        'High risk for recurrent convulsions and airway compromise.',
        'Requires urgent pediatric stabilization, antipyretics, and neuro observation.',
      ],
      red_flags: ['Active or recent seizure / Convulsions'],
      next_action: 'Emergency now',
      home_care_tips: [
        'Turn child on side (recovery position)',
        'Do not put anything inside the mouth',
      ],
      confidence: 'high',
      evaluated_at: now - 22 * 60 * 1000,
      forcedByRedFlag: true,
    },
  },
  {
    id: 'pt-seed-3',
    token: 'AR-103',
    name: 'Suresh Goud',
    age: 71,
    sex: 'male',
    language: 'en',
    chief_complaint:
      'Acute COPD exacerbation, accessory muscle use, SpO2 86% on room air',
    esi_level: 2,
    status: 'Waiting',
    wait_minutes: 14,
    assigned_doctor: 'Dr. Tarun Sen (Pulmonology)',
    bed: 'Stepdown Bed 2',
    is_simulated: 1,
    vitals: { temperature: 99.1, heartRate: 118, systolicBp: 138, diastolicBp: 88, spO2: 86 },
    body_regions: ['chest'],
    transcript: [
      {
        id: 'm1', sender: 'assistant',
        text: 'Hello Mr. Suresh. Tell us about your breathing difficulties.',
        timestamp: now - 18 * 60 * 1000,
      },
      {
        id: 'm2', sender: 'user',
        text: 'Severe gasping for breath since 2 hours. My inhaler is not working at all.',
        timestamp: now - 16 * 60 * 1000,
      },
    ],
    triage_result: {
      esi_level: 2,
      urgency_label: 'Emergent (High Risk)',
      reasoning: [
        'Critical hypoxemia (SpO2 86% < 90%) in elderly known COPD patient.',
        'Accessory muscle usage with impending respiratory muscle exhaustion.',
        'Deterministic Red Flag: Severe respiratory distress & SpO2 < 90%.',
      ],
      red_flags: [
        'Critical hypoxemia: SpO2 86% (< 90%)',
        'Severe respiratory distress / Shortness of breath',
      ],
      next_action: 'Emergency now',
      home_care_tips: [
        'High-flow controlled oxygen delivery in hospital',
        'Nebulization required immediately',
      ],
      confidence: 'high',
      evaluated_at: now - 14 * 60 * 1000,
      forcedByRedFlag: true,
    },
  },
  {
    id: 'pt-seed-4',
    token: 'AR-104',
    name: 'Rajesh Kumar',
    age: 45,
    sex: 'male',
    language: 'hi',
    chief_complaint:
      'Acute right lower quadrant abdominal pain with rebound tenderness, nausea',
    esi_level: 3,
    status: 'Waiting',
    wait_minutes: 35,
    assigned_doctor: 'Dr. Rajeshwari Nair (General Surgery)',
    bed: null,
    is_simulated: 1,
    vitals: { temperature: 100.6, heartRate: 98, systolicBp: 126, diastolicBp: 82, spO2: 98 },
    body_regions: ['abdomen'],
    transcript: [
      {
        id: 'm1', sender: 'assistant',
        text: 'राजेश जी, पेट में दर्द कब से शुरू हुआ और कैसा महसूस हो रहा है?',
        timestamp: now - 40 * 60 * 1000,
      },
      {
        id: 'm2', sender: 'user',
        text: 'कल रात नाभि के पास दर्द था, अब नीचे दाईं तरफ बहुत तेज दर्द है और उल्टी आ रही है।',
        timestamp: now - 38 * 60 * 1000,
      },
    ],
    triage_result: {
      esi_level: 3,
      urgency_label: 'Urgent (Within 1 Hour)',
      reasoning: [
        'Migratory right iliac fossa pain consistent with acute appendicitis.',
        'Requires 2+ hospital diagnostic resources: Abdominal ultrasound/CT and blood chemistry.',
        'Hemodynamically stable vitals, no peritoneal shock.',
      ],
      red_flags: [],
      next_action: 'Visit hospital today',
      home_care_tips: [
        'Do not eat or drink (NPO) in case surgery is needed',
        'Do not take heating pad on stomach',
      ],
      confidence: 'high',
      evaluated_at: now - 35 * 60 * 1000,
    },
  },
  {
    id: 'pt-seed-5',
    token: 'AR-105',
    name: 'Sunita Devi',
    age: 53,
    sex: 'female',
    language: 'hi',
    chief_complaint:
      'Type 2 diabetic with persistent polyuria, blood glucose 380 mg/dL, moderate dehydration',
    esi_level: 3,
    status: 'In Treatment',
    wait_minutes: 48,
    assigned_doctor: 'Dr. Amit Verma (Internal Medicine)',
    bed: 'Observation Bed 4',
    is_simulated: 1,
    vitals: { temperature: 98.8, heartRate: 102, systolicBp: 142, diastolicBp: 90, spO2: 97 },
    body_regions: ['abdomen'],
    transcript: [
      {
        id: 'm1', sender: 'assistant',
        text: 'सुनीता जी, आपको क्या परेशानी हो रही है?',
        timestamp: now - 52 * 60 * 1000,
      },
      {
        id: 'm2', sender: 'user',
        text: 'गला बहुत सूख रहा है, बार-बार पेशाब आ रही है और ग्लूकोमीटर में शुगर 380 दिखा रहा है।',
        timestamp: now - 50 * 60 * 1000,
      },
    ],
    triage_result: {
      esi_level: 3,
      urgency_label: 'Urgent (Within 1 Hour)',
      reasoning: [
        'Severe hyperglycemia requiring IV hydration, electrolyte panel, and titration of insulin.',
        'Stable airway and hemodynamics, no coma.',
        'Requires multiple laboratory and IV fluid resources.',
      ],
      red_flags: [],
      next_action: 'Visit hospital today',
      home_care_tips: ['Sip plain water', 'Avoid fruit juices and sugary foods'],
      confidence: 'high',
      evaluated_at: now - 48 * 60 * 1000,
    },
  },
  {
    id: 'pt-seed-6',
    token: 'AR-106',
    name: 'Priya Sharma',
    age: 28,
    sex: 'female',
    language: 'en',
    chief_complaint:
      'Inversion ankle injury while playing badminton, moderate swelling and ecchymosis',
    esi_level: 4,
    status: 'Waiting',
    wait_minutes: 65,
    assigned_doctor: null,
    bed: null,
    is_simulated: 1,
    vitals: { temperature: 98.6, heartRate: 78, systolicBp: 118, diastolicBp: 76, spO2: 99 },
    body_regions: ['legs'],
    transcript: [
      {
        id: 'm1', sender: 'assistant',
        text: 'Hello Priya. Can you put weight on your injured ankle?',
        timestamp: now - 70 * 60 * 1000,
      },
      {
        id: 'm2', sender: 'user',
        text: 'Twisted it on the court. Hurts to bear full weight, but I can take a few steps.',
        timestamp: now - 68 * 60 * 1000,
      },
    ],
    triage_result: {
      esi_level: 4,
      urgency_label: 'Less Urgent (Clinic / OPD)',
      reasoning: [
        'Single resource requirement: Ankle X-ray (Ottawa Ankle Rules) to exclude malleolar fracture.',
        'Stable vital signs, intact distal neurovascular exam.',
        'Safe for routine outpatient emergency queue.',
      ],
      red_flags: [],
      next_action: 'Clinic within 48h',
      home_care_tips: [
        'R.I.C.E. protocol (Rest, Ice, Compression, Elevation)',
        'Avoid jumping or running',
      ],
      confidence: 'high',
      evaluated_at: now - 65 * 60 * 1000,
    },
  },
  {
    id: 'pt-seed-7',
    token: 'AR-107',
    name: 'Deepa Kulkarni',
    age: 22,
    sex: 'female',
    language: 'mr',
    chief_complaint:
      'Dysuria, urinary urgency, and low-grade suprapubic ache for 2 days',
    esi_level: 4,
    status: 'Waiting',
    wait_minutes: 78,
    assigned_doctor: null,
    bed: null,
    is_simulated: 1,
    vitals: { temperature: 99.2, heartRate: 82, systolicBp: 114, diastolicBp: 72, spO2: 99 },
    body_regions: ['abdomen'],
    transcript: [
      {
        id: 'm1', sender: 'assistant',
        text: 'दीपा, लघवीला जळजळ किंवा त्रास किती दिवसांपासून आहे?',
        timestamp: now - 82 * 60 * 1000,
      },
      {
        id: 'm2', sender: 'user',
        text: '२ दिवसांपासून लघवी करताना खूप जळजळ होतेय आणि वारंवार जावे लागते.',
        timestamp: now - 80 * 60 * 1000,
      },
    ],
    triage_result: {
      esi_level: 4,
      urgency_label: 'Less Urgent (OPD / Clinic)',
      reasoning: [
        'Uncomplicated lower urinary tract symptoms.',
        'Requires single diagnostic resource: Urine routine & microscopy.',
        'No flank pain (costovertebral angle tenderness) or systemic sepsis.',
      ],
      red_flags: [],
      next_action: 'Clinic within 48h',
      home_care_tips: ['Drink plenty of boiled and cooled water', 'Avoid holding urine'],
      confidence: 'high',
      evaluated_at: now - 78 * 60 * 1000,
    },
  },
  {
    id: 'pt-seed-8',
    token: 'AR-108',
    name: 'Vikram Malhotra',
    age: 34,
    sex: 'male',
    language: 'en',
    chief_complaint:
      'Clean superficial 1.5cm kitchen knife laceration on left index finger, bleeding stopped',
    esi_level: 5,
    status: 'Discharged',
    wait_minutes: 95,
    assigned_doctor: 'Dr. Alok Nath (OPD Care)',
    bed: null,
    is_simulated: 1,
    vitals: { temperature: 98.4, heartRate: 74, systolicBp: 122, diastolicBp: 80, spO2: 100 },
    body_regions: ['arms'],
    transcript: [
      {
        id: 'm1', sender: 'assistant',
        text: 'Hello Vikram. Did the kitchen cut stop bleeding?',
        timestamp: now - 100 * 60 * 1000,
      },
      {
        id: 'm2', sender: 'user',
        text: 'Yes, cut it with vegetable knife. Bleeding stopped with tissue pressure.',
        timestamp: now - 98 * 60 * 1000,
      },
    ],
    triage_result: {
      esi_level: 5,
      urgency_label: 'Non-Urgent (Routine Care)',
      reasoning: [
        'Superficial clean laceration with hemostasis achieved.',
        'Zero complex hospital resources needed; simple wound cleansing and band-aid sufficient.',
        'Intact sensation and tendon flexion on finger.',
      ],
      red_flags: [],
      next_action: 'Home care',
      home_care_tips: [
        'Clean with mild soap and water',
        'Apply sterile adhesive dressing',
        'Update Tetanus toxoid if > 5 years',
      ],
      confidence: 'high',
      evaluated_at: now - 95 * 60 * 1000,
    },
  },
];

// ── Insert all patients ─────────────────────────────────────────────────

const stmt = db.prepare(`
  INSERT OR REPLACE INTO patients (
    id, token, name, age, sex, language, chief_complaint,
    vitals, body_regions, transcript, esi_level, triage_result,
    status, wait_minutes, assigned_doctor, bed, is_simulated
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?
  )
`);

db.exec('BEGIN TRANSACTION;');
for (const p of patients) {
  stmt.run(
    p.id,
    p.token,
    p.name,
    p.age,
    p.sex,
    p.language,
    p.chief_complaint,
    JSON.stringify(p.vitals),
    JSON.stringify(p.body_regions),
    JSON.stringify(p.transcript),
    p.esi_level,
    JSON.stringify(p.triage_result),
    p.status,
    p.wait_minutes,
    p.assigned_doctor ?? null,
    p.bed ?? null,
    p.is_simulated
  );
}
db.exec('COMMIT;');

console.log(`[Seed] Inserted ${patients.length} mock patients into the database.`);

// Verify
const count = (db.prepare('SELECT COUNT(*) as count FROM patients').get() as any).count;
console.log(`[Seed] Total patients in database: ${count}`);

closeDb();
console.log('[Seed] Done.');
