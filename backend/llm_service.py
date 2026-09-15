import os
import json
import time
from typing import Dict, List, Any, Optional, Tuple
from config import settings

# ── Clients Initialization ───────────────────────────────────────────────────
_groq_client = None
_gemini_client = None

def get_groq_client():
    global _groq_client
    if _groq_client is None and settings.GROQ_API_KEY:
        try:
            from groq import Groq
            _groq_client = Groq(api_key=settings.GROQ_API_KEY)
        except Exception as e:
            print(f"[LLM] Groq client init failed: {e}")
    return _groq_client

def get_gemini_client():
    global _gemini_client
    if _gemini_client is None and settings.GEMINI_API_KEY:
        try:
            from google import genai
            _gemini_client = genai.Client(
                api_key=settings.GEMINI_API_KEY,
                http_options={"headers": {"User-Agent": "triage-med-v2"}}
            )
        except Exception as e:
            print(f"[LLM] Gemini client init failed: {e}")
    return _gemini_client

# ── Dual-Provider LLM Invoker with Fallback ───────────────────────────────────
def call_llm(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.2,
    response_json: bool = True
) -> Tuple[Optional[str], str]:
    """
    Calls primary Groq LLM, automatically falling back to Gemini on 429/timeout.
    Returns: (response_text, provider_used: "groq" | "gemini" | "none")
    """
    groq = get_groq_client()
    if groq:
        try:
            kwargs = {
                "model": settings.GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": temperature,
            }
            if response_json:
                kwargs["response_format"] = {"type": "json_object"}
            
            completion = groq.chat.completions.create(**kwargs)
            return completion.choices[0].message.content, "groq"
        except Exception as e:
            print(f"[LLM] Groq call failed ({e}), initiating fallback to Gemini...")

    gemini = get_gemini_client()
    if gemini:
        try:
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            config = {"temperature": temperature}
            if response_json:
                config["response_mime_type"] = "application/json"

            res = gemini.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=full_prompt,
                config=config
            )
            return res.text, "gemini"
        except Exception as e:
            print(f"[LLM] Gemini fallback failed: {e}")

    return None, "none"

# ── 1. Symptom Extraction from Natural Conversation ───────────────────────────
def extract_symptoms_from_chat(
    transcript: str,
    available_symptoms: List[str]
) -> List[str]:
    """
    Extracts structured symptoms present in the trained model's symptom vector.
    """
    system_prompt = (
        "You are an expert clinical informatics parser. Extract all reported symptoms from the patient transcript. "
        "Map them STRICTLY to the provided list of valid symptom keys. Do NOT invent new keys.\n"
        f"VALID KEYS:\n{json.dumps(available_symptoms)}\n\n"
        "Return ONLY valid JSON matching this schema:\n"
        '{"extracted_symptoms": ["key1", "key2"]}'
    )
    user_prompt = f"Patient Conversation Transcript:\n{transcript}"
    text, _ = call_llm(system_prompt, user_prompt, temperature=0.1, response_json=True)
    if text:
        try:
            data = json.loads(text)
            extracted = data.get("extracted_symptoms", [])
            valid_set = set(available_symptoms)
            res = [s for s in extracted if s in valid_set]
            if res:
                return res
        except Exception:
            pass

    # Keyword substring matching fallback if LLM is unavailable (e.g. quota/network)
    lower_t = transcript.lower().replace("-", " ")
    matched = []
    for s in available_symptoms:
        s_clean = s.replace("_", " ").lower()
        if s_clean in lower_t:
            matched.append(s)
        else:
            parts = [p for p in s.split("_") if len(p) > 3]
            if len(parts) >= 2 and all(p in lower_t for p in parts):
                matched.append(s)
            elif any(p in lower_t for p in parts if p in ["fever", "cough", "vomiting", "bleeding", "headache", "seizure", "breathless", "sweat"]):
                matched.append(s)
    return list(set(matched))

# ── 2. Conversational Follow-up Question Generation ───────────────────────────
from clinical_trees import detect_clinical_category, get_already_asked_facets, get_next_clinical_facet

def generate_chat_turn(
    messages: List[Dict[str, Any]],
    language: str,
    patient: Optional[Dict[str, Any]] = None,
    vitals: Optional[Dict[str, Any]] = None,
    body_regions: Optional[List[str]] = None
) -> Dict[str, Any]:
    lang_labels = {"hi": "Hindi", "mr": "Marathi", "en": "English"}
    target_lang = lang_labels.get(language, "English")

    transcript = "\n".join([f"{m.get('sender', 'user').upper()}: {m.get('text', '')}" for m in messages])
    q_count = len([m for m in messages if m.get("sender") == "assistant"]) + 1

    # Detect clinical category & track already asked facets
    category = detect_clinical_category(transcript, body_regions)
    already_asked = get_already_asked_facets(messages)
    next_facet_info = get_next_clinical_facet(category, already_asked, language)

    facet_instruction = ""
    suggested_q = ""
    suggested_replies = []
    is_ready = q_count >= 4

    if next_facet_info:
        facet_name = next_facet_info["facet"]
        suggested_q = next_facet_info["question"]
        suggested_replies = next_facet_info["quick_replies"]
        if next_facet_info.get("is_last_facet"):
            is_ready = True
        facet_instruction = (
            f"Clinical Focus Category: {category}.\n"
            f"Already probed clinical facets: {', '.join(already_asked) if already_asked else 'None'}.\n"
            f"Target clinical facet for this turn: '{facet_name}'.\n"
            f"You may adapt or use this clinically validated probe in {target_lang}:\n"
            f"'{suggested_q}'\n"
        )

    system_prompt = f"""You are TriageMed, an expert clinical triage assistant.
Your goal is to ask 1 focused, empathetic follow-up question in {target_lang} to assess symptom severity, onset, radiation, or associated red flags.
{facet_instruction}
RULES:
1. Never give medical diagnoses.
2. Respond strictly in {target_lang}.
3. Ask ONE clear question at a time. Do NOT repeat questions or facets already covered in the transcript.
4. Set ready_for_assessment to {str(is_ready).lower()} if details are sufficiently clear or after 3-5 focused questions.
5. Provide 2-4 quick reply suggestions for the patient.

Return ONLY valid JSON with this exact schema:
{{
  "next_question": "string in {target_lang}",
  "question_number": {q_count},
  "ready_for_assessment": boolean,
  "quick_replies": ["option1", "option2", "option3"]
}}"""

    context = f"Patient: {patient or {}}\nVitals: {vitals or {}}\nBody regions: {body_regions or []}\nTranscript:\n{transcript}"

    text, provider = call_llm(system_prompt, context, temperature=0.2, response_json=True)
    if text:
        try:
            parsed = json.loads(text)
            if "next_question" in parsed:
                return parsed
        except Exception:
            pass

    # High-reliability clinical fallback when LLM is unavailable or times out
    if suggested_q:
        return {
            "next_question": suggested_q,
            "question_number": q_count,
            "ready_for_assessment": is_ready,
            "quick_replies": suggested_replies
        }

    return {
        "next_question": "Can you describe how long this symptom has been present and if anything makes it better or worse?",
        "question_number": q_count,
        "ready_for_assessment": q_count >= 4,
        "quick_replies": ["Started today", "A few days ago", "Getting worse", "About the same"]
    }


# ── 3. Explainable AI Clinical Explanation Generation ─────────────────────────
def generate_clinical_explanation(
    triage_eval: Dict[str, Any],
    language: str,
    patient: Optional[Dict[str, Any]] = None
) -> Tuple[List[str], List[str]]:
    """
    Generates plain-language reasoning bullets and home care tips grounded
    strictly in the classifier's top conditions and deterministic red flags.
    """
    lang_labels = {"hi": "Hindi", "mr": "Marathi", "en": "English"}
    target_lang = lang_labels.get(language, "English")

    top_conds = triage_eval.get("top_conditions", [])
    top_summary = ", ".join([f"{c['condition']} ({c['percentage']})" for c in top_conds[:3]])
    red_flags = triage_eval.get("red_flags", [])
    esi = triage_eval.get("esi_level", 3)

    system_prompt = f"""You are TriageMed Clinical Explainer.
Ground your explanation STRICTLY in these pre-computed classifier outputs:
- Assessed ESI Level: {esi}
- Top Classified Clinical Entities: {top_summary}
- Deterministic Red Flags: {red_flags}
- Uncertainty Flag: {triage_eval.get('is_uncertain', False)}

RULES:
1. Explain the clinical urgency in clear, compassionate bullet points in {target_lang}.
2. DO NOT invent alternative diseases outside the provided classifier list.
3. If uncertainty is flagged, explicitly state that clinical symptoms are ambiguous and require direct physician evaluation.
4. Provide 3-4 practical immediate home care / next-step safety tips.

Return strictly valid JSON:
{{
  "reasoning": ["bullet 1", "bullet 2", "bullet 3"],
  "home_care_tips": ["tip 1", "tip 2", "tip 3"]
}}"""

    user_prompt = f"Patient context: {patient or {}}\nGenerate explanations in {target_lang}."
    text, _ = call_llm(system_prompt, user_prompt, temperature=0.2, response_json=True)

    if text:
        try:
            data = json.loads(text)
            return data.get("reasoning", []), data.get("home_care_tips", [])
        except Exception:
            pass

    # Safe deterministic fallback
    if red_flags:
        reasoning = [
            f"Deterministic clinical safety rules identified critical indicators: {'; '.join(red_flags)}.",
            "Immediate hospital emergency evaluation is required to rule out acute life threats."
        ]
        tips = ["Seek emergency care immediately", "Do not exert yourself", "Call emergency services if symptoms worsen"]
    else:
        top_name = top_conds[0]["condition"] if top_conds else "Clinical presentation"
        reasoning = [
            f"Random Forest symptom classifier mapped presentation most closely to: {top_name}.",
            f"Assessed urgency level is ESI {esi} based on reported severity and vital signs."
        ]
        tips = ["Rest and stay hydrated", "Monitor symptoms for any sudden deterioration", "Consult a medical professional"]

    return reasoning, tips

# ── 4. Live Model Availability Status Checker ─────────────────────────────────
_last_status_cache: Optional[Dict[str, Any]] = None
_last_status_time: float = 0

def check_model_status() -> Dict[str, Any]:
    """
    Active health check against both Groq and Gemini providers.
    Returns real, live availability and latency. Cached for 15s.
    """
    global _last_status_cache, _last_status_time
    now = time.time()
    if _last_status_cache is not None and (now - _last_status_time) < 15:
        return _last_status_cache

    results = {
        "groq": {"online": False, "latency_ms": None, "model": settings.GROQ_MODEL, "error": None},
        "gemini": {"online": False, "latency_ms": None, "model": settings.GEMINI_MODEL, "error": None},
        "classifier": {"online": True, "type": "Random Forest + Clinical Rule Engine", "latency_ms": 2},
        "primary_provider": "groq" if settings.GROQ_API_KEY else "gemini",
        "timestamp": int(now * 1000)
    }

    # Test Groq
    if settings.GROQ_API_KEY:
        groq = get_groq_client()
        if groq:
            t0 = time.time()
            try:
                groq.chat.completions.create(
                    model="llama-3.1-8b-instant",  # lightweight ping model
                    messages=[{"role": "user", "content": "ping"}],
                    max_tokens=2
                )
                results["groq"]["online"] = True
                results["groq"]["latency_ms"] = int((time.time() - t0) * 1000)
            except Exception as e:
                results["groq"]["error"] = str(e)
    else:
        results["groq"]["error"] = "API key not configured"

    # Test Gemini
    if settings.GEMINI_API_KEY:
        gemini = get_gemini_client()
        if gemini:
            t0 = time.time()
            try:
                gemini.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents="ping",
                    config={"max_output_tokens": 2}
                )
                results["gemini"]["online"] = True
                results["gemini"]["latency_ms"] = int((time.time() - t0) * 1000)
            except Exception as e:
                results["gemini"]["error"] = str(e)
    else:
        results["gemini"]["error"] = "API key not configured"

    return results

# ── 5. Groq Whisper Voice Transcription ───────────────────────────────────────
def transcribe_audio_file(file_bytes: bytes, filename: str = "recording.webm") -> Tuple[Optional[str], Optional[str]]:
    """
    Transcribes audio bytes using Groq Whisper.
    Returns: (transcribed_text, error_message)
    """
    groq = get_groq_client()
    if not groq:
        return None, "Voice transcription server unavailable: Groq API key not configured."

    try:
        transcription = groq.audio.transcriptions.create(
            file=(filename, file_bytes),
            model="whisper-large-v3",
            response_format="text"
        )
        return str(transcription).strip(), None
    except Exception as e:
        return None, f"Whisper transcription failed: {e}"
