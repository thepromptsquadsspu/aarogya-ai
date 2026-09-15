import os
import json
import joblib
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from rf_engine import TriageRandomForest
from config import settings
from redflags import detect_red_flags

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
MODEL_PATH = os.path.join(MODELS_DIR, "triage_rf.joblib")
METADATA_PATH = os.path.join(MODELS_DIR, "symptoms_metadata.json")

_model = None
_metadata = None

def load_artifacts():
    global _model, _metadata
    if _model is None and os.path.exists(MODEL_PATH):
        _model = joblib.load(MODEL_PATH)
    if _metadata is None and os.path.exists(METADATA_PATH):
        with open(METADATA_PATH, "r", encoding="utf-8") as f:
            _metadata = json.load(f)
    return _model, _metadata

def vectorize_symptoms(symptom_keys: List[str]) -> np.ndarray:
    _, meta = load_artifacts()
    if not meta:
        return np.zeros((1, 128), dtype=np.float32)
    
    all_symptoms = meta["symptoms"]
    symptom_set = set(symptom_keys)
    vec = np.zeros(len(all_symptoms), dtype=np.float32)
    for i, s in enumerate(all_symptoms):
        if s in symptom_set:
            vec[i] = 1.0
    return vec.reshape(1, -1)

def evaluate_triage(
    symptoms: List[str],
    text: str,
    vitals: Optional[Dict[str, Any]] = None,
    language: str = "en"
) -> Dict[str, Any]:
    """
    Evaluates patient symptoms using the trained Random Forest classifier
    combined with the deterministic red-flag safety engine.
    """
    # 1. Deterministic Pre-check
    has_flags, detected_flags, forced_esi = detect_red_flags(text, vitals)

    model, meta = load_artifacts()
    top_conditions: List[Dict[str, Any]] = []
    is_uncertain = False
    top_prob = 0.0
    predicted_esi = 3
    predicted_urgency = "Urgent (Within 1 Hour)"

    if model and meta:
        X = vectorize_symptoms(symptoms)
        probs = model.predict_proba(X)[0]
        conditions = meta["conditions"]

        # Sort by highest probability
        top_indices = np.argsort(probs)[::-1][:5]
        for idx in top_indices:
            prob = float(probs[idx])
            cond = conditions[idx]
            top_conditions.append({
                "condition": cond["name"],
                "probability": round(prob, 4),
                "percentage": f"{prob * 100:.1f}%",
                "base_esi": cond["base_esi"],
                "esi_level": cond["base_esi"],
                "urgency": cond["urgency"]
            })

        if top_conditions:
            top_prob = top_conditions[0]["probability"]
            predicted_esi = top_conditions[0]["base_esi"]
            predicted_urgency = top_conditions[0]["urgency"]

            # Confidence floor check
            if top_prob < settings.CONFIDENCE_FLOOR:
                is_uncertain = True

    # 2. Safety Rule: Deterministic Red Flags ALWAYS Override AI
    final_esi = predicted_esi
    forced_by_red_flag = False

    if has_flags and forced_esi is not None:
        if final_esi > forced_esi:
            final_esi = forced_esi
            forced_by_red_flag = True
        elif has_flags:
            forced_by_red_flag = True

    # Label & Next Action mappings
    urgency_labels = {
        1: "Resuscitation (Immediate)",
        2: "Emergent (High Risk)",
        3: "Urgent (Within 1 Hour)",
        4: "Less Urgent (Clinic / OPD)",
        5: "Non-Urgent (Routine Care)"
    }
    next_actions = {
        1: "Emergency now",
        2: "Emergency now",
        3: "Visit hospital today",
        4: "Clinic within 48h",
        5: "Home care"
    }

    final_urgency = urgency_labels.get(final_esi, "Urgent (Within 1 Hour)")
    final_action = next_actions.get(final_esi, "Visit hospital today")

    confidence_level = "high" if (top_prob >= 0.60 or forced_by_red_flag) else ("medium" if top_prob >= settings.CONFIDENCE_FLOOR else "low")

    return {
        "esi_level": final_esi,
        "urgency_label": final_urgency,
        "top_conditions": top_conditions,
        "top_probability": round(top_prob, 4),
        "is_uncertain": is_uncertain,
        "red_flags": detected_flags,
        "forced_by_red_flag": forced_by_red_flag,
        "next_action": final_action,
        "confidence": confidence_level,
    }
