import re
from typing import Dict, List, Optional, Any, Tuple

CLINICAL_PATTERNS = [
    {
        "name": "Chest pain / Acute Coronary Syndrome indicators",
        "pattern": re.compile(
            r"(chest pain|pressure in chest|heart attack|angina|tightness in chest|heaviness in chest|"
            r"छाती में दर्द|सीने में दर्द|छाती पर दबाव|छातीत दुखणे|छातीत दाब|छाती दुखते|छातीत जडपणा)",
            re.IGNORECASE,
        ),
        "is_esi_1": True,
    },
    {
        "name": "Severe respiratory distress / Shortness of breath",
        "pattern": re.compile(
            r"(difficulty breathing|shortness of breath|breathless|gasping|cannot breathe|can't breathe|suffocation|"
            r"सांस लेने में तकलीफ|दम फूलना|सांस फूलना|श्वास घेण्यास त्रास|श्वास कोंडणे|दम लागणे)",
            re.IGNORECASE,
        ),
        "is_esi_1": True,
    },
    {
        "name": "Stroke / FAST signs",
        "pattern": re.compile(
            r"(face droop|facial drooping|arm weakness|slurred speech|stroke|paralysis|sudden weakness|"
            r"लकवा|फेशियल पाल्सी|मुंह टेढ़ा होना|बोलने में लड़खड़ाहट|अर्धांगवायू|चेहरा वाकडा|हात कमकुवत|बोलण्यात अडखळणे)",
            re.IGNORECASE,
        ),
        "is_esi_1": False,
    },
    {
        "name": "Severe hemorrhage / Uncontrolled bleeding",
        "pattern": re.compile(
            r"(severe bleeding|uncontrolled bleed|hemorrhage|arterial bleed|blood spurting|gushing blood|"
            r"भारी रक्तस्राव|अत्यधिक खून बहना|रक्त बहना रुक नहीं रहा|तीव्र रक्तस्त्राव|अति रक्तस्राव|रक्त थांबत नाही)",
            re.IGNORECASE,
        ),
        "is_esi_1": False,
    },
    {
        "name": "Unconsciousness / Unresponsive",
        "pattern": re.compile(
            r"(unconscious|passed out|fainted|unresponsive|syncope|collapsed|blacked out|"
            r"बेहोश|मूर्छित|होश खो बैठना|बेशुद्ध|चक्कर येऊन पडणे|जाणीव नसणे)",
            re.IGNORECASE,
        ),
        "is_esi_1": True,
    },
    {
        "name": "Seizure / Convulsions",
        "pattern": re.compile(
            r"(seizure|convulsion|fits|epilepsy|twitching involuntarily|"
            r"दौरे|झटके|मिरगी का दौरा|आकडी|फेफरे|फिट येणे)",
            re.IGNORECASE,
        ),
        "is_esi_1": False,
    },
]

def detect_red_flags(text: str, vitals: Optional[Dict[str, Any]] = None) -> Tuple[bool, List[str], Optional[int]]:
    """
    Deterministic clinical safety check.
    Returns: (has_red_flags, detected_flags, forced_esi: 1 | 2 | None)
    """
    detected_flags: List[str] = []
    has_esi_1_indicator = False

    # 1. Text pattern scan
    if text:
        for item in CLINICAL_PATTERNS:
            if item["pattern"].search(text):
                detected_flags.append(item["name"])
                if item["is_esi_1"]:
                    has_esi_1_indicator = True

    # 2. Vital signs threshold checks
    if vitals:
        # SpO2 < 90%
        spo2 = vitals.get("spO2") or vitals.get("spo2")
        if spo2 is not None:
            try:
                spo2_val = float(spo2)
                if 0 < spo2_val < 90:
                    detected_flags.append(f"Critical hypoxemia: SpO2 {spo2_val:.0f}% (< 90%)")
                    has_esi_1_indicator = True
            except (ValueError, TypeError):
                pass

        # Systolic BP < 90 mmHg (Shock)
        sys_bp = vitals.get("systolicBp") or vitals.get("systolic_bp")
        if sys_bp is not None:
            try:
                sys_val = float(sys_bp)
                if 0 < sys_val < 90:
                    detected_flags.append(f"Shock / Severe hypotension: Systolic BP {sys_val:.0f} mmHg (< 90 mmHg)")
                    has_esi_1_indicator = True
            except (ValueError, TypeError):
                pass

        # Heart Rate > 130 bpm
        hr = vitals.get("heartRate") or vitals.get("heart_rate")
        if hr is not None:
            try:
                hr_val = float(hr)
                if hr_val > 130:
                    detected_flags.append(f"Dangerous tachycardia: Heart Rate {hr_val:.0f} bpm (> 130 bpm)")
                    # Tachycardia alone is ESI 2 unless combined with hypotension/chest pain
            except (ValueError, TypeError):
                pass

    has_flags = len(detected_flags) > 0
    forced_esi: Optional[int] = None
    if has_flags:
        forced_esi = 1 if has_esi_1_indicator else 2

    return has_flags, detected_flags, forced_esi
