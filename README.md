# Aarogya AI 🩺

**An interactive medical symptom triage advisor — built for SSPU × TRÄGER Hackathon 2026 (Round II), Problem Statement PS-ML-06.**

Repo: [github.com/thepromptsquadsspu/aarogya-ai](https://github.com/thepromptsquadsspu/aarogya-ai)

---

## What is Aarogya AI?

In simple words: **you tell it your symptoms, and it helps you figure out how serious they are and what to do next.**

You can either chat with it like a conversation ("I have a headache and a fever since yesterday...") or pick your symptoms from a list. Either way, it asks a few smart follow-up questions, then tells you:

- What it thinks might be going on (out of 45+ possible conditions it's trained on)
- How urgent it is — **Emergency**, **Urgent**, **Routine**, or **Self-care**
- What you should actually do next

It is **not a replacement for a doctor**. It's a first line of guidance — especially useful when someone isn't sure whether a symptom needs a hospital visit right now or can wait.

---

## Why we built this

Most people either panic and rush to the ER for something minor, or ignore something serious because "it's probably nothing." Aarogya AI acts as a quick, always-available first opinion to help people make that call more confidently — grounded in an actual trained model, not guesswork.

---

## How it works (plain-language version)

1. **You describe your symptoms** — by typing, talking, or picking them from a list.
2. **It asks follow-up questions** — like when it started, how bad it is, and anything else going on — the same way a nurse doing initial intake would.
3. **A trained machine learning model analyzes it** — a Random Forest classifier trained on real symptom-to-condition data (45+ conditions, 120+ symptoms), not just an AI making things up.
4. **You get a clear result** — likely conditions, an urgency level, and next steps, explained in plain language.
5. **In an emergency**, it can alert your saved emergency contacts on your behalf, letting them know what's happening.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, TypeScript, Tailwind CSS |
| Backend | FastAPI (Python) |
| ML Model | Scikit-learn Random Forest classifier (45+ diseases, 120+ symptoms) |
| Conversational AI | Groq (primary) + Gemini (fallback) — used only for understanding user input and explaining results in plain language, never for the actual diagnosis |
| Database | Supabase (Postgres) — triage history, emergency contacts |
| Voice Input | Web Speech API with a server-side transcription fallback |
| Deployment | Docker, Vercel (frontend), Render (backend) |

**Why this stack:** we wanted something we could build fast during the hackathon, but that still separates "the AI understanding you" from "the AI deciding your diagnosis" — the actual medical call always comes from the trained classifier and a documented rule engine, never from an LLM guessing.

---

## Team — Prompt Squad

**Department / Institution:** School of CSIT, Symbiosis Skills & Professional University (SSPU)
**Event:** SSPU × TRÄGER Hackathon 2026, Round II
**Problem Statement:** PS-ML-06

| Name | Role | PRN |
|---|---|---|
| Kirti Vitthal Harde | Project Manager · Team Lead | 2601106313 |
| Vedant Baviskar | Domain Expert | 2600601212 |
| Shreyash Dixit | Frontend Developer | 2601106371 |
| Sharvari Nivalkar | UX / UI Designer | 2601106221 |
| Kunal Kumawat | Backend Developer | 2601106392 |
| Gauri Dewoolkar | Pitcher / Presenter | 2601133030 |

**Contact:** team.arogyaai@sspu.ac.in

---

## Getting Started (for anyone who wants to run it locally)

### Prerequisites
- Node.js 18+
- Python 3.10+
- A Supabase project (free tier is fine)
- Free API keys for Groq and Gemini

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

### Environment variables
Create a `.env` file in `/backend` with:
```
GROQ_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
```

---

## Disclaimer

Aarogya AI is a hackathon project built for demonstration purposes. It is **not a certified medical device** and should not be used as a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider for medical concerns, and call your local emergency number in a genuine emergency.

---

## Proof, Not Promises

We built this to actually work end-to-end, not just look good on slides — a real trained classifier behind the results, a real chat and voice interface, and a real emergency-contact flow, all runnable and demoable live.

*Built with ❤️ by Prompt Squad for SSPU × TRÄGER Hackathon 2026.*
