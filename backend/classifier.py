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

from symptom_ontology import extract_clinical_symptoms
from clinical_engine import evaluate_clinical_bayes

def evaluate_triage(
    symptoms: List[str],
    text: str,
    vitals: Optional[Dict[str, Any]] = None,
    language: str = "en"
) -> Dict[str, Any]:
    """
    Evaluates patient symptoms using the Expert Clinical Bayesian Decision Engine
    combined with deterministic red-flag detection and vital sign triggers.
    """
    # 1. Deterministic Pre-check for Red Flags
    has_flags, detected_flags, forced_esi = detect_red_flags(text, vitals)

    # 2. Extract symptoms if not already provided
    active_symptoms = list(symptoms) if symptoms else []
    if not active_symptoms and text:
        active_symptoms = extract_clinical_symptoms(text)

    # 3. Clinical Bayesian Evaluation
    bayes_eval = evaluate_clinical_bayes(
        symptoms=active_symptoms,
        vitals=vitals,
        red_flags=detected_flags
    )

    # 4. Deterministic safety override if pre-check red flags exist
    final_esi = bayes_eval["esi_level"]
    forced_by_red_flag = bayes_eval["forced_by_red_flag"]

    if has_flags and forced_esi is not None:
        if final_esi > forced_esi:
            final_esi = forced_esi
            forced_by_red_flag = True
        elif has_flags:
            forced_by_red_flag = True

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

    return {
        "esi_level": final_esi,
        "urgency_label": urgency_labels.get(final_esi, bayes_eval["urgency_label"]),
        "top_conditions": bayes_eval["top_conditions"],
        "top_probability": bayes_eval["top_probability"],
        "is_uncertain": bayes_eval["is_uncertain"],
        "red_flags": detected_flags,
        "forced_by_red_flag": forced_by_red_flag,
        "next_action": next_actions.get(final_esi, bayes_eval["next_action"]),
        "confidence": bayes_eval["confidence"],
        "extracted_symptoms": active_symptoms,
    }

