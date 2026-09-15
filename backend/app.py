import os
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
import json
import time
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import settings
from classifier import evaluate_triage, load_artifacts
from redflags import detect_red_flags
from llm_service import (
    generate_chat_turn,
    extract_symptoms_from_chat,
    generate_clinical_explanation,
    check_model_status,
    transcribe_audio_file,
)
from db_supabase import (
    save_triage_session,
    get_triage_history,
    get_emergency_contacts,
    save_emergency_contact,
    delete_emergency_contact,
    get_local_db,
)
from telephony import dispatch_emergency_calls

app = FastAPI(title=settings.PROJECT_NAME, version="2.0.0")

# ── CORS Middleware ───────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request / Response Models ─────────────────────────────────────────────────
class ChatRequest(BaseModel):
    messages: List[Dict[str, Any]]
    language: str = "en"
    patient: Optional[Dict[str, Any]] = None
    vitals: Optional[Dict[str, Any]] = None
    bodyRegions: Optional[List[str]] = None

class TriageRequest(BaseModel):
    messages: List[Dict[str, Any]]
    language: str = "en"
    patient: Optional[Dict[str, Any]] = None
    vitals: Optional[Dict[str, Any]] = None
    bodyRegions: Optional[List[str]] = None
    guidedAnswers: Optional[Dict[str, Any]] = None
    symptoms: Optional[List[str]] = None
    session_id: Optional[str] = "default-user"

class EmergencyContactRequest(BaseModel):
    name: str = Field(..., min_length=2)
    phone: str = Field(..., min_length=8)
    relationship: str = "Family"
    session_id: str = "default-user"

class EmergencyCallRequest(BaseModel):
    patient_name: str
    symptoms: List[str]
    urgency_label: str
    next_action: str
    session_id: str = "default-user"

class StatusUpdateRequest(BaseModel):
    status: str

# ── 1. System Health & Live Model Availability ────────────────────────────────
@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "project": settings.PROJECT_NAME,
        "model_primary": settings.GROQ_MODEL if settings.GROQ_API_KEY else settings.GEMINI_MODEL,
        "has_groq": bool(settings.GROQ_API_KEY),
        "has_gemini": bool(settings.GEMINI_API_KEY),
        "has_supabase": bool(settings.SUPABASE_URL),
        "timestamp": int(time.time() * 1000)
    }

@app.get("/api/model-status")
def model_status():
    """
    Active endpoint checking real-time availability of Groq and Gemini.
    Frontend reads directly from this endpoint.
    """
    return check_model_status()

# ── 2. Conversational Symptom Intake Chat ─────────────────────────────────────
@app.post("/api/chat")
def chat_turn(req: ChatRequest):
    result = generate_chat_turn(
        messages=req.messages,
        language=req.language,
        patient=req.patient,
        vitals=req.vitals,
        body_regions=req.bodyRegions
    )
    return result

# ── 3. Grounded Clinical Triage Assessment ────────────────────────────────────
@app.post("/api/triage")
def triage_assessment(req: TriageRequest):
    # Combine transcript text
    transcript_text = " ".join([m.get("text", "") for m in req.messages])
    if req.guidedAnswers and req.guidedAnswers.get("notes"):
        transcript_text += " " + req.guidedAnswers["notes"]

    # 1. Extract symptoms matching trained Random Forest feature space
    _, meta = load_artifacts()
    available_symptoms = meta["symptoms"] if meta else []
    
    extracted_symptoms = req.symptoms or []
    if not extracted_symptoms and available_symptoms:
        extracted_symptoms = extract_symptoms_from_chat(transcript_text, available_symptoms)

    # 2. Evaluate using ML Classifier + Deterministic Red-Flag Rules
    triage_eval = evaluate_triage(
        symptoms=extracted_symptoms,
        text=transcript_text,
        vitals=req.vitals,
        language=req.language
    )

    # 3. Generate plain-language clinical reasoning & home care tips
    reasoning, tips = generate_clinical_explanation(
        triage_eval=triage_eval,
        language=req.language,
        patient=req.patient
    )

    response_payload = {
        "esi_level": triage_eval["esi_level"],
        "urgency_label": triage_eval["urgency_label"],
        "reasoning": reasoning,
        "red_flags": triage_eval["red_flags"],
        "next_action": triage_eval["next_action"],
        "home_care_tips": tips,
        "confidence": triage_eval["confidence"],
        "is_uncertain": triage_eval["is_uncertain"],
        "top_conditions": triage_eval["top_conditions"],
        "probabilities": triage_eval["top_conditions"],
        "extracted_symptoms": extracted_symptoms,
        "evaluated_at": int(time.time() * 1000),
        "forcedByRedFlag": triage_eval["forced_by_red_flag"],
    }

    # 4. Persist session history to Supabase
    save_triage_session({
        "session_id": req.session_id or "default-user",
        "language": req.language,
        "chief_complaint": req.messages[0].get("text", "") if req.messages else "",
        "symptoms": extracted_symptoms,
        "vitals": req.vitals or {},
        "chat_transcript": req.messages,
        "esi_level": response_payload["esi_level"],
        "urgency_label": response_payload["urgency_label"],
        "triage_result": response_payload,
    })

    return response_payload

# ── 4. Voice Transcription (Groq Whisper Fallback) ────────────────────────────
@app.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    audio_bytes = await file.read()
    text, err = transcribe_audio_file(audio_bytes, file.filename or "recording.webm")
    if err:
        raise HTTPException(status_code=500, detail=err)
    return {"transcript": text}

# ── 5. Emergency Contacts & Outbound Voice Calling ────────────────────────────
@app.get("/api/contacts")
def list_contacts(session_id: str = "default-user"):
    return get_emergency_contacts(session_id)

@app.post("/api/contacts")
def add_contact(req: EmergencyContactRequest):
    try:
        contact = save_emergency_contact(
            name=req.name,
            phone=req.phone,
            relationship=req.relationship,
            session_id=req.session_id
        )
        return contact
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/contacts/{contact_id}")
def remove_contact(contact_id: str, session_id: str = "default-user"):
    success = delete_emergency_contact(contact_id, session_id)
    return {"success": success}

@app.post("/api/emergency-call")
def trigger_call(req: EmergencyCallRequest):
    return dispatch_emergency_calls(
        patient_name=req.patient_name,
        symptoms=req.symptoms,
        urgency_label=req.urgency_label,
        next_action=req.next_action,
        session_id=req.session_id
    )

from hospital_service import get_nearby_hospitals

# ── 6. Nearby Emergency Hospitals & Trauma Centers ───────────────────────────
@app.get("/api/nearby-hospitals")
def nearby_hospitals(
    lat: float = Query(18.5204, description="User latitude"),
    lon: float = Query(73.8567, description="User longitude"),
    radius_km: float = Query(25.0, description="Search radius in kilometers")
):
    """
    Returns real nearby emergency hospitals and trauma centers with coordinates,
    real distance (km), drive time, 24/7 ER status, and direct navigation links.
    """
    return get_nearby_hospitals(lat=lat, lon=lon, radius_km=radius_km)

# ── 7. Triage Session History ─────────────────────────────────────────────────
@app.get("/api/history")
def history(session_id: str = "default-user", limit: int = 15):
    return get_triage_history(session_id=session_id, limit=limit)

# ── 7. Hospital Dashboard Queue (Backwards Compatibility) ──────────────────────
@app.post("/api/patients")
def create_patient(data: Dict[str, Any]):
    pt_id = f"pt-{int(time.time() * 1000)}"
    with get_local_db() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO triage_sessions 
            (id, session_id, language, chief_complaint, symptoms, vitals, chat_transcript, esi_level, urgency_label, triage_result, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        """, (
            pt_id,
            data.get("token", "PT-001"),
            data.get("language", "en"),
            data.get("chiefComplaint", ""),
            json.dumps(data.get("bodyRegions", [])),
            json.dumps(data.get("vitals", {})),
            json.dumps(data.get("chatTranscript", [])),
            data.get("esiLevel", 3),
            data.get("triageResult", {}).get("urgency_label", "Urgent"),
            json.dumps(data.get("triageResult", {}))
        ))
    return {"id": pt_id, **data, "status": "Waiting", "waitMinutes": 0}

@app.get("/api/queue")
def get_queue():
    with get_local_db() as conn:
        cur = conn.execute("SELECT * FROM triage_sessions ORDER BY esi_level ASC, created_at ASC")
        rows = cur.fetchall()
        result = []
        for r in rows:
            triage_res = {}
            try:
                triage_res = json.loads(r["triage_result"])
            except Exception:
                pass
            result.append({
                "id": r["id"],
                "token": r["session_id"],
                "name": triage_res.get("patient_name", "Patient"),
                "age": 35,
                "sex": "other",
                "language": r["language"],
                "chiefComplaint": r["chief_complaint"],
                "esiLevel": r["esi_level"] or 3,
                "triageResult": triage_res,
                "vitals": {},
                "chatTranscript": [],
                "bodyRegions": [],
                "status": "Waiting",
                "waitMinutes": 5,
                "createdAt": r["created_at"],
            })
        return result

@app.patch("/api/patients/{patient_id}/status")
def update_status(patient_id: str, req: StatusUpdateRequest):
    return {"success": True, "id": patient_id, "status": req.status}

@app.get("/api/stats")
def get_stats():
    with get_local_db() as conn:
        total = conn.execute("SELECT COUNT(*) FROM triage_sessions").fetchone()[0]
        critical = conn.execute("SELECT COUNT(*) FROM triage_sessions WHERE esi_level <= 2").fetchone()[0]
        return {
            "total": total,
            "critical": critical,
            "waiting": total,
            "inTreatment": 0,
            "avgWaitMinutes": 12
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=settings.PORT, reload=settings.DEBUG)
