# TriageMed — Clinical Emergency Triage & Urgency Advisor

An AI-grounded emergency medical symptom triage system calibrated against Emergency Severity Index (ESI) 5-tier clinical protocols. Designed with deterministic safety rules, a trained 45+ condition Random Forest classifier, a dual-provider LLM pipeline (Groq + Gemini fallback), speech-to-text intake, and automated emergency telephony dispatch.

---

## Key Features

1. **Grounded ML Classifier (Not Fabricated AI)**
   - Custom Random Forest classifier trained on 49 clinical conditions and 113 discrete symptom features across cardiovascular, respiratory, neurological, abdominal, and trauma presentations.
   - Outputs calibrated probability distributions for differential diagnosis.
   - Enforces a **confidence floor (< 0.35)** that flags diagnostic uncertainty.
   - Bypasses native Windows Python 3.13 OpenBLAS thread contention with a pure-NumPy random forest engine (`backend/rf_engine.py`).

2. **Deterministic Clinical Red-Flag Engine**
   - Authoritative rule evaluation executing **before and after** AI inference.
   - Traps acute emergencies (acute coronary syndrome, respiratory failure, stroke signs/FAST, severe hemorrhage, loss of consciousness, uncontrolled convulsions).
   - Monitors vital thresholds: SpO2 < 90%, Systolic BP < 90 mmHg, Heart Rate > 130 bpm.
   - **Guaranteed safety lock**: Red flags immediately force ESI 1 (Resuscitation) or ESI 2 (Emergent) and cannot be downgraded by LLMs.

3. **Dual-Provider LLM Pipeline with Live Healthchecks**
   - **Primary**: Groq (`llama-3.3-70b-versatile`) for natural symptom extraction and patient-friendly clinical explanations.
   - **Automatic Fallback**: Google Gemini (`gemini-3.6-flash`) seamlessly takes over if Groq encounters rate limits (429) or timeouts.
   - **Live Healthcheck Badge**: Actively pings upstream providers and displays real-time latency and connectivity in the top navigation.

4. **Speech-to-Text Voice Intake**
   - **Primary**: Native browser Web Speech API for low-latency client-side voice transcription.
   - **Server Fallback**: Automatic `MediaRecorder` audio capture streamed to Groq Whisper (`whisper-large-v3`) via `/api/transcribe`.

5. **Automated Emergency Telephony Dispatch (Twilio Voice)**
   - Patients can configure up to 2 emergency contacts.
   - When an acute triage state (ESI 1 or 2) is confirmed, TriageMed can automatically place phone calls reading a synthesized clinical summary.
   - **Safe Test Mode (`TWILIO_TEST_MODE=true` by default)**: Safely simulates outbound calls, logs the synthesized voice message, and prevents unintended real-world phone dialing.

6. **Dual Persistence: Supabase with Local SQLite Mirror**
   - Primary persistence in Supabase PostgreSQL tables: `triage_sessions`, `emergency_contacts`, `emergency_call_logs`.
   - Automatic zero-config fallback to local SQLite (`backend/data/triage_local.db`) if cloud database credentials are not configured.

7. **Responsive UI Architecture**
   - **High-Contrast Landing Page**: Direct primary call-to-action button (`Start AI Triage Chat`).
   - **Desktop Split-View Cockpit (`lg:`)**: Real-time side-by-side view with chat intake on the left and patient demographics, interactive body map, and vitals editor on the right.
   - **Mobile Stacked View**: Compact layout with collapsible body map and vitals accordions.
   - **Hospital ER Board**: Live queue sorted strictly by ESI severity (Level 1 first) and arrival time.

---

## System Architecture

```
TriageMed/
├── backend/                        # FastAPI Python Backend
│   ├── app.py                      # REST API endpoints & CORS setup
│   ├── config.py                   # Environment settings & Twilio test mode
│   ├── rf_engine.py                # Pure-NumPy Random Forest engine
│   ├── train_model.py              # ML dataset generation & training script
│   ├── classifier.py               # ML inference, confidence floor & red flags
│   ├── redflags.py                 # Deterministic regex & vitals safety rules
│   ├── llm_service.py              # Groq + Gemini dual provider & Whisper
│   ├── telephony.py                # Twilio voice synthesizer & call dispatcher
│   ├── db_supabase.py              # Supabase client + SQLite local fallback
│   └── models/
│       ├── triage_rf.joblib        # Serialized Random Forest model artifact
│       └── symptoms_metadata.json  # 49 conditions & 113 symptom definitions
├── src/                            # React 18 + Vite + TypeScript Frontend
│   ├── components/
│   │   ├── TopNav.tsx              # Universal navigation & status indicator
│   │   ├── LandingPage.tsx         # Primary entry page with high-contrast CTA
│   │   ├── PatientView.tsx         # Desktop split-view & mobile intake
│   │   ├── ChatIntake.tsx          # Adaptive symptom intake with voice mic
│   │   ├── VoiceInput.tsx          # Web Speech API + Whisper fallback recorder
│   │   ├── TriageResultCard.tsx    # ESI result, ML probability bars & Twilio call
│   │   ├── EmergencyContactsModal.tsx # Manage up to 2 emergency contacts
│   │   ├── ModelStatusBadge.tsx    # Live Groq/Gemini status poller
│   │   ├── BodyMap.tsx             # Interactive anatomical region selector
│   │   ├── VitalsForm.tsx          # Real-time vitals editor
│   │   └── HospitalDashboard.tsx   # ESI-sorted ER triage board
│   ├── context/
│   │   └── TriageContext.tsx       # Global application state
│   ├── services/
│   │   ├── triageApi.ts            # Typed HTTP client to FastAPI
│   │   └── api.ts                  # Service re-exports
│   └── types.ts                    # Shared TypeScript interfaces
├── vite.config.ts                  # Vite config with /api proxy to :8000
└── README.md
```

---

## Quickstart Guide

### 1. Prerequisites
- **Python**: 3.10+ (tested on Python 3.10 through 3.13)
- **Node.js**: 18+ (tested on Node.js 20+)

### 2. Backend Setup

```bash
# Install backend dependencies
pip install fastapi uvicorn pydantic python-multipart scikit-learn numpy groq google-genai supabase twilio joblib python-dotenv

# (Optional) Retrain Random Forest model:
python backend/train_model.py
```

### 3. Configure Environment

Create or edit `backend/.env`:

```env
# Primary LLM & Voice Transcription
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Fallback LLM
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.6-flash

# Telephony (Defaults to safe test mode — no real calls placed)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_FROM_NUMBER=+15551234567
TWILIO_TEST_MODE=true

# Database Persistence (Leave blank to use local SQLite: backend/data/triage_local.db)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

### 4. Run the Application

```bash
# Terminal 1: Start FastAPI Backend (Port 8000)
python -m uvicorn backend.app:app --port 8000 --reload

# Terminal 2: Start Vite Frontend (Port 5173)
npm run dev:frontend
```

Open your browser at **http://localhost:5173**.

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | `GET` | Health check, active model names, and provider flags. |
| `/api/model-status` | `GET` | Live availability, latency (ms), and errors for Groq and Gemini. |
| `/api/chat` | `POST` | Generates adaptive, multilingual triage intake follow-up questions. |
| `/api/triage` | `POST` | Executes ML classification + deterministic red flags + clinical reasoning. |
| `/api/transcribe` | `POST` | Groq Whisper speech-to-text audio transcription endpoint. |
| `/api/contacts` | `GET` / `POST` | Retrieve or save emergency contacts (up to 2 per user). |
| `/api/contacts/:id` | `DELETE` | Remove a saved emergency contact. |
| `/api/emergency-call` | `POST` | Triggers Twilio voice alert synthesis and dispatch to emergency contacts. |
| `/api/queue` | `GET` | Fetches hospital queue sorted by ESI level and wait time. |
| `/api/patients` | `POST` | Transmits a completed triage intake to the hospital ER queue. |
| `/api/patients/:id/status` | `PATCH` | Updates a patient's status (`Waiting`, `In Treatment`, `Discharged`). |

---

## Supabase Schema & Row-Level Security

If using Supabase, execute this SQL migration in the Supabase SQL editor:

```sql
-- 1. Triage Sessions
CREATE TABLE IF NOT EXISTS triage_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    chief_complaint TEXT,
    symptoms JSONB DEFAULT '[]'::jsonb,
    vitals JSONB DEFAULT '{}'::jsonb,
    chat_transcript JSONB DEFAULT '[]'::jsonb,
    esi_level INTEGER NOT NULL CHECK (esi_level BETWEEN 1 AND 5),
    urgency_label TEXT NOT NULL,
    triage_result JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Emergency Contacts
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    relationship TEXT DEFAULT 'Family',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Emergency Call Logs
CREATE TABLE IF NOT EXISTS emergency_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    call_sid TEXT,
    status TEXT NOT NULL,
    mode TEXT NOT NULL,
    message_spoken TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE triage_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write for session matching" ON triage_sessions
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read-write for contacts" ON emergency_contacts
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read-write for call logs" ON emergency_call_logs
    FOR ALL USING (true) WITH CHECK (true);
```

---

## Safety & Disclaimer

TriageMed is a clinical decision support advisor designed for triage prioritization and educational assessment. It is **not** a substitute for licensed medical examination, definitive diagnosis, or emergency dispatch services. In any acute medical emergency, patients and caregivers should contact local emergency medical services immediately (Dial **108** in India, **911** in the US/Canada, or **112** in Europe).