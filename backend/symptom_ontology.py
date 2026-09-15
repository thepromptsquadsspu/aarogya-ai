"""
Comprehensive Clinical Multilingual Symptom Ontology Engine.
Extracts discrete clinical symptoms from conversational transcripts in
English (en), Hindi (hi), and Marathi (mr).
Includes strict negation detection (e.g., "no chest pain", "बुखार नहीं है", "उलटी नाही").
"""

import re
from typing import List, Set, Dict, Tuple

# Negation prefixes & suffixes across English, Hindi, and Marathi
NEGATION_PATTERNS = [
    # English
    r"\bno\s+([a-z\s]+)",
    r"\bnot\s+([a-z\s]+)",
    r"\bwithout\s+([a-z\s]+)",
    r"\bdenies\s+([a-z\s]+)",
    r"\bnever\s+([a-z\s]+)",
    r"\bdon't\s+have\s+([a-z\s]+)",
    r"\bdoesnt\s+have\s+([a-z\s]+)",
    r"\bno\s+history\s+of\s+([a-z\s]+)",
    # Hindi (pre-negation and post-negation)
    r"नहीं\s+है\s*",
    r"नहीं\s+हो\s+रहा",
    r"कोई\s+([^\s]+)\s+नहीं",
    r"([^\s]+)\s+नहीं\s+है",
    # Marathi (pre and post-negation)
    r"नाही\s*",
    r"त्रास\s+नाही",
    r"होत\s+नाही",
    r"कोणताही\s+([^\s]+)\s+नाही",
]

# Multilingual phrase mapping to canonical clinical symptom keys
# Structure: symptom_key -> list of regex phrase patterns
CLINICAL_SYMPTOM_MAP: Dict[str, List[str]] = {
    # ── Cardiorespiratory ──
    "chest_pain_retrosternal": [
        r"chest\s+(?:sharp\s+|severe\s+|bad\s+)?pain", r"retrosternal\s+pain", r"pain\s+in\s+(?:my\s+)?chest",
        r"छाती\s*(?:में)?.*दर्द", r"सीने\s*(?:में)?.*दर्द", r"छातीत.*(?:वेदना|दुखणे|कळा)", r"छाती\s*दुखते"
    ],
    "chest_pressure_squeezing": [
        r"chest\s+pressure", r"squeezing\s+chest", r"heavy\s+chest", r"crushing\s+(?:chest\s+)?pain", r"tightness\s+in\s+chest",
        r"heaviness\s+in\s+chest", r"छाती\s*पर\s*दबाव", r"सीने\s*में\s*भारीपन", r"छाती\s*जकड़ना", r"छातीवर\s*दाब", r"छातीत\s*जडपणा"
    ],
    "radiating_arm_pain_left": [
        r"(?:left\s+)?arm\s+pain", r"radiat.*arm", r"pain.*left\s+arm", r"going\s+to\s+(?:my\s+)?arm", r"radiating\s+to\s+arm",
        r"बाएं\s*हाथ.*दर्द", r"उलटे\s*हाथ.*दर्द", r"बाएं\s*हाथ\s*में\s*फैल", r"डाव्या\s*हाता.*(?:वेदना|दुखणे|पसरते)"
    ],
    "radiating_jaw_neck_pain": [
        r"jaw\s+pain", r"neck\s+pain", r"radiat.*jaw", r"throat\s+tightness",
        r"जबड़े.*दर्द", r"गर्दन.*दर्द", r"जबड्यात.*दुखणे", r"मानेकडे.*पसरते"
    ],
    "diaphoresis_cold_sweats": [
        r"cold\s+sweat", r"profuse\s+sweat", r"sweating\s+heavily", r"diaphoresis", r"drenching\s+sweat",
        r"ठंडा\s*पसीना", r"बहुत\s*पसीना", r"पसीने\s*से\s*तरबतर", r"थंड\s*घाम", r"खूप\s*घाम"
    ],
    "shortness_of_breath_acute": [
        r"shortness\s+of\s+breath", r"breathless", r"can't\s+breathe", r"cannot\s+breathe", r"gasping",
        r"difficulty\s+breathing", r"struggling\s+to\s+breathe", r"out\s+of\s+breath",
        r"सांस.*तकलीफ", r"सांस\s*फूलना", r"दम\s*फूलना", r"दम\s*घुटना",
        r"श्वास.*त्रास", r"श्वास\s*कोंडणे", r"दम\s*लागणे", r"श्वास\s*लागतो"
    ],
    "pleuritic_sharp_chest_pain": [
        r"sharp\s+chest\s+pain", r"stabbing\s+chest\s+pain", r"pain\s+when\s+breathing", r"pleuritic",
        r"सांस\s*लेने\s*पर.*दर्द", r"छाती\s*में\s*चुभन", r"श्वास\s*घेताना.*टोचणे"
    ],
    "wheezing_expiratory": [
        r"wheezing", r"whistling\s+breath", r"asthma\s+attack",
        r"सीटी\s*जैसी\s*आवाज", r"घरघराहट", r"घरघर\s*आवाज", r"शिट्टीसारखा\s*आवाज"
    ],
    "stridor_inspiratory": [
        r"stridor", r"choking\s+sound", r"harsh\s+breathing", r"throat\s+swelling",
        r"गले\s*में\s*रुकावट", r"श्वासनलिका\s*सूज"
    ],
    "hemoptysis_coughing_blood": [
        r"coughing\s+blood", r"blood\s+in\s+cough", r"blood\s+in\s+sputum", r"hemoptysis",
        r"खांसी\s*में\s*खून", r"थूक\s*में\s*खून", r"खोकल्यातून\s*रक्त", r"थुंकीतून\s*रक्त"
    ],
    "cough_productive_phlegm": [
        r"wet\s+cough", r"cough\s+with\s+phlegm", r"yellow\s+phlegm", r"green\s+phlegm", r"productive\s+cough",
        r"बलगम.*खांसी", r"कफ\s*वाली\s*खांसी", r"कफ\s*पडणारा\s*खोकला"
    ],
    "cough_dry_hacking": [
        r"dry\s+cough", r"hacking\s+cough", r"throat\s+tickle\s+cough",
        r"सूखी\s*खांसी", r"कोरडा\s*खोकला"
    ],
    "palpitations": [
        r"palpitation", r"racing\s+heart", r"heart\s+fluttering", r"rapid\s+heartbeat",
        r"दिल\s*की\s*धड़कन", r"धड़कन\s*बढ़ना", r"धडधडणे", r"हृदयाचे\s*ठोके"
    ],

    # ── Neurological & Stroke ──
    "facial_drooping_unilateral": [
        r"face\s+droop", r"facial\s+droop", r"crooked\s+face", r"one\s+side\s+of\s+face", r"facial\s+weakness",
        r"चेहरा\s*टेढ़ा", r"मुंह\s*टेढ़ा", r"चेहरा\s*वाकडा"
    ],
    "arm_weakness_unilateral": [
        r"arm\s+weakness", r"weak\s+arm", r"can't\s+lift\s+arm", r"one\s+sided\s+weakness", r"leg\s+weakness",
        r"हाथ\s*में\s*कमजोरी", r"हाथ\s*उठ\s*नहीं\s*रहा", r"हात\s*कमकुवत", r"हातातील\s*ताकद"
    ],
    "slurred_speech_dysarthria": [
        r"slurred\s+speech", r"slurring", r"difficulty\s+speaking", r"can't\s+speak\s+clearly", r"garbled\s+speech",
        r"बोलने\s*में\s*लड़खड़ाहट", r"आवाज\s*लड़खड़ाना", r"बोलण्यात\s*अडखळणे", r"स्पष्ट\s*बोलता"
    ],
    "severe_sudden_thunderclap_headache": [
        r"thunderclap", r"worst\s+headache", r"sudden\s+severe\s+headache", r"explosive\s+headache",
        r"बिजली.*सिरदर्द", r"अचानक\s*तेज\s*सिरदर्द", r"आयुष्यातील\s*सर्वात\s*असह्य\s*डोकेदुखी", r"असह्य\s*डोकेदुखी"
    ],
    "throbbing_unilateral_headache": [
        r"throbbing\s+headache", r"one\s+sided\s+headache", r"migraine", r"pulsating\s+headache",
        r"आधे\s*सिर\s*में\s*दर्द", r"एक\s*तरफ\s*सिरदर्द", r"धड़कने\s*वाला\s*सिरदर्द", r"एका\s*बाजूला.*डोकेदुखी", r"मायग्रेन"
    ],
    "band_like_headache": [
        r"tension\s+headache", r"band\s+like\s+headache", r"tight\s+headache", r"dull\s+headache", r"headache",
        r"हल्का\s*सिरदर्द", r"सिर\s*में\s*भारीपन", r"सिरदर्द", r"डोकेदुखी", r"डोके\s*दुखते"
    ],
    "neck_rigidity_stiffness": [
        r"stiff\s+neck", r"neck\s+rigidity", r"can't\s+touch\s+chin", r"neck\s+stiff",
        r"गर्दन\s*में\s*अकड़न", r"गर्दन\s*कड़ी", r"मान\s*ताठ", r"मानेला\s*कडकपणा"
    ],
    "photophobia": [
        r"sensitive\s+to\s+light", r"photophobia", r"light\s+hurts",
        r"रोशनी\s*से\s*दिक्कत", r"उजेडाचा\s*त्रास"
    ],
    "loss_of_consciousness_syncope": [
        r"lost\s+consciousness", r"passed\s+out", r"fainted", r"syncope", r"blackout", r"unresponsive",
        r"बेहोश", r"मूर्छित", r"होश\s*खो", r"बेशुद्ध", r"चक्कर\s*येऊन\s*पडणे"
    ],
    "active_tonic_clonic_seizure": [
        r"seizure", r"convulsion", r"fits", r"epilepsy", r"shaking\s+uncontrollably",
        r"दौरे", r"झटके", r"मिरगी", r"फेफरे", r"आकडी", r"फिट\s*येणे"
    ],
    "pre_syncope_dizziness": [
        r"dizzy", r"lightheaded", r"vertigo", r"spinning\s+head",
        r"चक्कर", r"सिर\s*घूमना", r"भोवळ"
    ],

    # ── Abdominal & Gastrointestinal ──
    "abdominal_pain_rlq_fossa": [
        r"right\s+lower\s+belly", r"right\s+lower\s+quadrant", r"rlq\s+pain", r"pain\s+near\s+appendix", r"right\s+side\s+belly",
        r"नीचे\s*दाईं\s*तरफ\s*दर्द", r"दाहिने\s*हिस्से.*दर्द", r"खालच्या\s*उजव्या\s*बाजूला", r"अपेंडिक्स"
    ],
    "abdominal_pain_ruq_subcostal": [
        r"right\s+upper\s+belly", r"right\s+upper\s+quadrant", r"gallbladder", r"under\s+right\s+ribs",
        r"ऊपरी\s*दाईं\s*तरफ\s*दर्द", r"वरच्या\s*उजव्या\s*बाजूला"
    ],
    "abdominal_pain_epigastric": [
        r"upper\s+stomach\s+pain", r"epigastric\s+pain", r"pain\s+above\s+navel",
        r"पेट\s*के\s*ऊपरी\s*हिस्से", r"पोटाच्या\s*वरच्या\s*भागात"
    ],
    "abdominal_diffuse_cramping": [
        r"stomach\s+cramps", r"belly\s+pain", r"stomach\s+ache", r"abdominal\s+pain", r"tummy\s+ache",
        r"पेट\s*दर्द", r"पेट\s*में\s*मरोड़", r"पोटात\s*दुखणे", r"पोटात\s*वेदना", r"पोट\s*दुखी"
    ],
    "rebound_tenderness_guarding": [
        r"rebound\s+tenderness", r"rigid\s+belly", r"hard\s+(?:belly|stomach)", r"hurts\s+when\s+releasing",
        r"पेट\s*सख्त", r"पेट\s*कड़ा", r"दाबून\s*सोडल्यावर\s*वेदना", r"पोट\s*कडक"
    ],
    "vomiting_intractable": [
        r"vomit", r"throwing\s+up", r"can't\s+keep\s+food\s+down",
        r"उल्टी", r"उलटियां", r"उलटी", r"ओकणे"
    ],
    "nausea_persistent": [
        r"nausea", r"feeling\s+sick", r"queasy",
        r"मिचली", r"जी\s*मिचलाना", r"मळमळ"
    ],
    "watery_diarrhea_frequent": [
        r"diarrhea", r"loose\s+motions", r"watery\s+stools",
        r"दस्त", r"पतले\s*दस्त", r"जुलाब", r"पातळ\s*शौचास"
    ],
    "melena_dark_tarry_stool": [
        r"black\s+stool", r"blood\s+in\s+stool", r"dark\s+stool", r"melena",
        r"काले\s*रंग\s*का\s*मल", r"मल\s*में\s*खून", r"काळी\s*शौच", r"विष्ठेत\s*रक्त"
    ],
    "dyspepsia_heartburn_regurgitation": [
        r"heartburn", r"acidity", r"acid\s+reflux", r"sour\s+burps", r"indigestion",
        r"एसिडिटी", r"सीने\s*में\s*जलन", r"खट्टी\s*डकार", r"पित्त", r"छातीत\s*जळजळ"
    ],

    # ── Systemic & Infection ──
    "high_grade_fever_over_102f": [
        r"high\s+fever", r"fever\s+over\s+102", r"103\s*f", r"104\s*f", r"very\s+hot", r"burning\s+fever",
        r"तेज\s*बुखार", r"१०३.*ताप", r"१०४.*ताप", r"तीव्र\s*ताप", r"खूप\s*ताप"
    ],
    "low_grade_fever": [
        r"mild\s+fever", r"low\s+fever", r"slight\s+fever", r"feverish", r"fever",
        r"हल्का\s*बुखार", r"बुखार", r"हलका\s*ताप", r"ताप\s*आहे", r"ताप"
    ],
    "rigors_shivering_chills": [
        r"chills", r"shivering", r"rigors", r"feeling\s+very\s+cold",
        r"कंपकंपी", r"ठंड\s*लगना", r"थंडी\s*वाजणे", r"थरथरणे"
    ],
    "generalized_myalgia_body_ache": [
        r"body\s+ache", r"muscle\s+pain", r"aching\s+all\s+over", r"myalgia",
        r"बदन\s*दर्द", r"शरीर\s*में\s*दर्द", r"अंगदुखी", r"स्नायू\s*वेदना"
    ],
    "urticaria_hives_wheals": [
        r"hives", r"urticaria", r"welts", r"itchy\s+bumps", r"allergic\s+rash",
        r"पित्ती", r"खुजली\s*वाले\s*दाने", r"अंगावर\s*गांधी", r"पित्त\s*उठणे"
    ],
    "facial_angioedema_lip_swelling": [
        r"swollen\s+lips", r"swelling\s+in\s+face", r"swollen\s+eyes", r"angioedema",
        r"होंठ\s*सूज", r"चेहरे\s*पर\s*सूजन", r"ओठ\s*सुजले", r"चेहऱ्यावर\s*सूज"
    ],

    # ── Trauma, Bleeding & Musculoskeletal ──
    "wound_arterial_spurting_bleed": [
        r"spurting\s+blood", r"uncontrolled\s+bleed", r"blood\s+gushing", r"bleeding\s+won't\s+stop", r"arterial\s+bleed",
        r"खून\s*रुक\s*नहीं\s*रहा", r"फव्वारे.*खून", r"तीव्र\s*रक्तस्त्राव", r"रक्त\s*थांबत\s*नाही"
    ],
    "wound_bleeding_controlled": [
        r"bleeding.*stopped", r"cut.*with.*knife", r"bleeding\s+controlled", r"stopped.*pressure",
        r"दबाने.*खून\s*रुक", r"खून\s*रुका", r"दाबल्यावर\s*रक्त\s*थांबले"
    ],
    "superficial_clean_cut_hemostatic": [
        r"small\s+cut", r"superficial\s+cut", r"minor\s+cut", r"cut.*finger", r"cut.*knife", r"knife\s+cut", r"paper\s+cut",
        r"हल्का\s*कटा", r"छोटी\s*खरोंच", r"बारीक\s*जखम", r"सुरीने\s*कापले"
    ],
    "inability_to_bear_weight": [
        r"cannot\s+walk", r"can't\s+put\s+weight", r"unable\s+to\s+bear\s+weight", r"cannot\s+bear\s+weight", r"can't\s+step",
        r"वजन\s*नहीं\s*रख", r"चल\s*नहीं\s*सकता", r"पायावर\s*वजन\s*टाकता", r"चालता\s*येत\s*नाही"
    ],
    "joint_swelling_moderate": [
        r"swollen\s+ankle", r"swollen\s+wrist", r"joint\s+swelling", r"twisted\s+ankle", r"sprain", r"swollen",
        r"टखने\s*में\s*सूजन", r"मोच", r"पाय\s*मुरगळला", r"लचक\s*भरली", r"सांध्याला\s*सूज"
    ],
    "audible_bone_crack_snap": [
        r"bone\s+crack", r"heard\s+a\s+snap", r"bone\s+broken", r"fracture",
        r"हड्डी\s*टूटी", r"चटकने\s*की\s*आवाज", r"हाड\s*मोडले", r"फ्रॅक्चर"
    ],

    # ── Genitourinary ──
    "dysuria_burning_micturition": [
        r"burning\s+urine", r"pain\s+when\s+peeing", r"dysuria", r"burning\s+micturition",
        r"पेशाब\s*में\s*जलन", r"पेशाब.*दर्द", r"लघवीला\s*जळजळ", r"लघवी.*वेदना"
    ],
    "urinary_frequency_urgency": [
        r"frequent\s+urination", r"urinating\s+often", r"urine\s+urgency",
        r"बार\s*बार\s*पेशाब", r"वारंवार\s*लघवी"
    ],
    "unilateral_flank_colic_pain": [
        r"flank\s+pain", r"kidney\s+pain", r"severe\s+side\s+pain", r"kidney\s+stone",
        r"कमर\s*के\s*एक\s*तरफ\s*तेज\s*दर्द", r"किडनी\s*का\s*दर्द", r"पाठीकडे\s*कंबरेत\s*तीव्र\s*कळा"
    ]
}


def is_negated_phrase(phrase: str, full_text: str) -> bool:
    """
    Checks if a detected symptom phrase is preceded or succeeded by a negation token
    in English, Hindi, or Marathi, strictly respecting clause boundaries (but, and, etc.).
    """
    lower = full_text.lower()
    p = phrase.lower()
    idx = lower.find(p)
    if idx == -1:
        return False

    # Extract immediate preceding text (up to 20 chars, stop at clause boundary)
    pre_text = lower[max(0, idx - 25):idx]
    for delimiter in [",", ".", ";", "but", "और", "आणि", "पण", "परंतु", "लेकिन"]:
        if delimiter in pre_text:
            pre_text = pre_text[pre_text.rfind(delimiter) + len(delimiter):]

    # Check English pre-negations
    eng_pre_negations = ["no ", "not ", "never ", "denies ", "without ", "dont ", "doesn't "]
    for neg in eng_pre_negations:
        if neg in pre_text:
            return True

    # Check Hindi/Marathi pre-negations (e.g. "कोई बुखार नहीं", "नही")
    if "नहीं" in pre_text or "नाही" in pre_text:
        return True

    # Extract immediate following text (up to 18 chars, stop at clause boundary)
    post_text = lower[idx + len(p):min(len(lower), idx + len(p) + 20)]
    for delimiter in [",", ".", ";", "but", "और", "आणि", "पण", "परंतु", "लेकिन"]:
        if delimiter in post_text:
            post_text = post_text[:post_text.find(delimiter)]

    # Check Hindi/Marathi post-negations (e.g., "दर्द नहीं है", "त्रास नाही")
    if any(neg in post_text for neg in ["नहीं", "नाहीं", "नही", "नाही", "नाहीत", "नसणे"]):
        return True

    return False


def extract_clinical_symptoms(text: str) -> List[str]:
    """
    Main deterministic clinical symptom extractor.
    Iterates through symptom patterns, verifies no negation context,
    and returns a unique list of validated symptom identifiers.
    """
    if not text:
        return []

    lower_text = text.lower()
    extracted: Set[str] = set()

    for sym_key, patterns in CLINICAL_SYMPTOM_MAP.items():
        for pattern in patterns:
            match = re.search(pattern, lower_text, re.IGNORECASE)
            if match:
                matched_phrase = match.group(0)
                # Check for negation
                if not is_negated_phrase(matched_phrase, lower_text):
                    extracted.add(sym_key)
                    break  # Once matched for this symptom, avoid duplicate checks

    # Mutual exclusion sanity rules
    # If high grade fever is present, drop low grade fever
    if "high_grade_fever_over_102f" in extracted and "low_grade_fever" in extracted:
        extracted.remove("low_grade_fever")

    # If uncontrolled spurting bleed is present, drop superficial cut
    if "wound_arterial_spurting_bleed" in extracted and "superficial_clean_cut_hemostatic" in extracted:
        extracted.remove("superficial_clean_cut_hemostatic")

    return list(extracted)
