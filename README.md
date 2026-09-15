# Aarogya AI — Medical Triage System

AI-powered interactive medical triage system for India.  
Two views: **Patient App** (mobile-first) and **Hospital Dashboard** (desktop), switchable via toggle.

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express + TypeScript + SQLite (better-sqlite3)
- **AI**: Google Gemini API (gemini-2.0-flash)

## Quick Start

### 1. Install dependencies

```bash
# Root (frontend)
npm install

# Backend
cd server
npm install
cd ..
```

### 2. Configure environment

```bash
# Root .env
GEMINI_API_KEY=your_key_here
VITE_USE_MOCK=false          # set to 'true' for mock-only mode (no backend needed)

# server/.env
GEMINI_API_KEY=your_key_here
PORT=3001
```

### 3. Seed the database (optional — adds 8 demo patients)

```bash
npm run seed
```

### 4. Run both servers

```bash
# Option A: Run both with concurrently
npm run dev:all

# Option B: Run separately
npm run dev:frontend   # Vite dev server on :5173
npm run dev:backend    # Express API on :3001

# Option C: Original AI Studio mode (Vite embedded in Express, mock only)
npm run dev
```

### 5. Open the app

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api/health

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/chat` | Gemini-powered symptom intake chat |
| POST | `/api/triage` | Full ESI triage assessment |
| POST | `/api/patients` | Create a patient record |
| GET | `/api/queue` | Fetch hospital queue (sorted by ESI) |
| PATCH | `/api/patients/:id/status` | Update patient status |
| GET | `/api/stats` | Dashboard statistics |

## Architecture

```
Aarogya-AI/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── context/            # React Context (TriageContext)
│   ├── services/api.ts     # API client (mock + real backend)
│   └── types.ts            # TypeScript types
├── server/                 # Express backend
│   └── src/
│       ├── index.ts        # Express app entry
│       ├── db.ts           # SQLite setup
│       ├── routes.ts       # API routes
│       ├── gemini.ts       # Gemini client wrapper
│       ├── redflags.ts     # Deterministic red-flag engine
│       └── seed.ts         # Database seeder
├── server.ts               # AI Studio Vite+Express dev server
├── vite.config.ts          # Vite config with /api proxy
└── .env                    # Environment variables
```

## Safety: Red-Flag Engine

The deterministic red-flag engine runs **BEFORE and AFTER** any AI evaluation:
- AI can **NEVER downgrade** a case flagged by the engine
- Flags: chest pain, respiratory distress, stroke signs, hemorrhage, unconsciousness, seizures
- Vital sign thresholds: SpO2 < 90%, Systolic BP < 90 mmHg, HR > 130 bpm