import os
import json
import joblib
import numpy as np
from rf_engine import TriageRandomForest

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

# ── 48 Medical Conditions & Base ESI Triage Categories ───────────────────────────
CONDITIONS = [
    # ESI 1 / ESI 2 Critical
    {"name": "Acute Coronary Syndrome / Myocardial Infarction", "base_esi": 1, "urgency": "Resuscitation (Immediate)"},
    {"name": "Acute Ischemic Stroke / TIA", "base_esi": 1, "urgency": "Resuscitation (Immediate)"},
    {"name": "Pulmonary Embolism", "base_esi": 1, "urgency": "Resuscitation (Immediate)"},
    {"name": "Anaphylactic Shock", "base_esi": 1, "urgency": "Resuscitation (Immediate)"},
    {"name": "Severe Sepsis / Septic Shock", "base_esi": 1, "urgency": "Resuscitation (Immediate)"},
    {"name": "Tension Pneumothorax", "base_esi": 1, "urgency": "Resuscitation (Immediate)"},
    {"name": "Active Status Epilepticus / Uncontrolled Seizure", "base_esi": 1, "urgency": "Resuscitation (Immediate)"},
    {"name": "Severe Uncontrolled Hemorrhage", "base_esi": 1, "urgency": "Resuscitation (Immediate)"},
    
    # ESI 2 Emergent (High Risk)
    {"name": "Unstable Angina Pectoris", "base_esi": 2, "urgency": "Emergent (High Risk)"},
    {"name": "Severe Asthma Exacerbation", "base_esi": 2, "urgency": "Emergent (High Risk)"},
    {"name": "Acute COPD Exacerbation", "base_esi": 2, "urgency": "Emergent (High Risk)"},
    {"name": "Diabetic Ketoacidosis (DKA)", "base_esi": 2, "urgency": "Emergent (High Risk)"},
    {"name": "Severe Symptomatic Hypoglycemia", "base_esi": 2, "urgency": "Emergent (High Risk)"},
    {"name": "Hypertensive Emergency", "base_esi": 2, "urgency": "Emergent (High Risk)"},
    {"name": "Acute Bacterial / Viral Meningitis", "base_esi": 2, "urgency": "Emergent (High Risk)"},
    {"name": "Pediatric Febrile Convulsion (Post-ictal)", "base_esi": 2, "urgency": "Emergent (High Risk)"},
    {"name": "Severe Heat Stroke with Altered Sensorium", "base_esi": 2, "urgency": "Emergent (High Risk)"},
    {"name": "Acute Traumatic Concussion with Neurological Deficit", "base_esi": 2, "urgency": "Emergent (High Risk)"},
    {"name": "Acute Pyelonephritis with Sepsis Risk", "base_esi": 2, "urgency": "Emergent (High Risk)"},

    # ESI 3 Urgent (Hospital / Multi-resource)
    {"name": "Acute Appendicitis", "base_esi": 3, "urgency": "Urgent (Within 1 Hour)"},
    {"name": "Acute Cholecystitis", "base_esi": 3, "urgency": "Urgent (Within 1 Hour)"},
    {"name": "Acute Pancreatitis", "base_esi": 3, "urgency": "Urgent (Within 1 Hour)"},
    {"name": "Community-Acquired Pneumonia", "base_esi": 3, "urgency": "Urgent (Within 1 Hour)"},
    {"name": "Nephrolithiasis (Kidney Stone)", "base_esi": 3, "urgency": "Urgent (Within 1 Hour)"},
    {"name": "Dengue Fever with Warning Signs", "base_esi": 3, "urgency": "Urgent (Within 1 Hour)"},
    {"name": "Acute Malaria (Plasmodium Falciparum)", "base_esi": 3, "urgency": "Urgent (Within 1 Hour)"},
    {"name": "Typhoid Fever with Enteric Signs", "base_esi": 3, "urgency": "Urgent (Within 1 Hour)"},
    {"name": "Acute Viral Hepatitis", "base_esi": 3, "urgency": "Urgent (Within 1 Hour)"},
    {"name": "Peptic Ulcer Disease with Severe Epigastric Pain", "base_esi": 3, "urgency": "Urgent (Within 1 Hour)"},
    {"name": "Cellulitis with Rapid Spreading Erythema", "base_esi": 3, "urgency": "Urgent (Within 1 Hour)"},
    {"name": "Suspected Long Bone Fracture", "base_esi": 3, "urgency": "Urgent (Within 1 Hour)"},
    {"name": "Acute Dehydration Secondary to Gastroenteritis", "base_esi": 3, "urgency": "Urgent (Within 1 Hour)"},

    # ESI 4 Less Urgent (OPD / Single Resource)
    {"name": "Acute Uncomplicated Cystitis (UTI)", "base_esi": 4, "urgency": "Less Urgent (Clinic / OPD)"},
    {"name": "Acute Ankle Inversion Sprain", "base_esi": 4, "urgency": "Less Urgent (Clinic / OPD)"},
    {"name": "Acute Lumbar Muscular Strain", "base_esi": 4, "urgency": "Less Urgent (Clinic / OPD)"},
    {"name": "Cutaneous Abscess Requiring Drainage", "base_esi": 4, "urgency": "Less Urgent (Clinic / OPD)"},
    {"name": "Acute Bronchitis without Hypoxia", "base_esi": 4, "urgency": "Less Urgent (Clinic / OPD)"},
    {"name": "Acute Otitis Media", "base_esi": 4, "urgency": "Less Urgent (Clinic / OPD)"},
    {"name": "Acute Maxillary Rhinosinusitis", "base_esi": 4, "urgency": "Less Urgent (Clinic / OPD)"},
    {"name": "Streptococcal Pharyngotonsillitis", "base_esi": 4, "urgency": "Less Urgent (Clinic / OPD)"},
    {"name": "Migraine Headache without Red Flags", "base_esi": 4, "urgency": "Less Urgent (Clinic / OPD)"},
    {"name": "Seasonal Influenza with Stable Vitals", "base_esi": 4, "urgency": "Less Urgent (Clinic / OPD)"},
    {"name": "Gastroenteritis (Mild to Moderate)", "base_esi": 4, "urgency": "Less Urgent (Clinic / OPD)"},

    # ESI 5 Non-Urgent (Routine Care / Home Care)
    {"name": "Superficial Cut / Minor Laceration (Hemostasis Achieved)", "base_esi": 5, "urgency": "Non-Urgent (Routine Care)"},
    {"name": "Tension-Type Headache", "base_esi": 5, "urgency": "Non-Urgent (Routine Care)"},
    {"name": "Gastroesophageal Reflux (GERD / Mild Acidity)", "base_esi": 5, "urgency": "Non-Urgent (Routine Care)"},
    {"name": "Allergic Rhinitis / Mild Hay Fever", "base_esi": 5, "urgency": "Non-Urgent (Routine Care)"},
    {"name": "Minor Skin Abrasion / Bruise", "base_esi": 5, "urgency": "Non-Urgent (Routine Care)"},
    {"name": "Chronic Mild Anemia Fatigue", "base_esi": 5, "urgency": "Non-Urgent (Routine Care)"},
]

# ── 128 Discrete Symptoms & Clinical Signs ─────────────────────────────────────────
SYMPTOMS = [
    # Cardiorespiratory
    "chest_pain_retrosternal", "chest_pressure_squeezing", "radiating_arm_pain_left", "radiating_jaw_neck_pain",
    "diaphoresis_cold_sweats", "shortness_of_breath_acute", "dyspnea_on_exertion", "orthopnea", "palpitations",
    "pleuritic_sharp_chest_pain", "wheezing_expiratory", "stridor_inspiratory", "hemoptysis_coughing_blood",
    "cough_dry_hacking", "cough_productive_phlegm", "accessory_muscle_breathing",
    # Neurological / Cerebrovascular
    "facial_drooping_unilateral", "arm_weakness_unilateral", "slurred_speech_dysarthria", "aphasia_word_finding",
    "sudden_loss_of_balance", "unilateral_numbness", "severe_sudden_thunderclap_headache", "throbbing_unilateral_headache",
    "band_like_headache", "periorbital_stabbing_headache", "photophobia", "phonophobia", "neck_rigidity_stiffness",
    "loss_of_consciousness_syncope", "pre_syncope_dizziness", "active_tonic_clonic_seizure", "post_ictal_confusion",
    "involuntary_muscle_twitching", "amnesia_post_injury", "confusion_disorientation", "extreme_lethargy_somnolence",
    # Systemic / Infection
    "high_grade_fever_over_102f", "low_grade_fever", "rigors_shivering_chills", "drenching_night_sweats",
    "profound_asthenia_fatigue", "generalized_myalgia_body_ache", "retro_orbital_eye_pain", "cyclic_fever_paroxysms",
    "step_ladder_pattern_fever", "petechial_hemorrhagic_rash", "erythematous_maculopapular_rash", "urticaria_hives_wheals",
    "facial_angioedema_lip_swelling", "generalized_pruritus",
    # Abdominal / Gastrointestinal
    "abdominal_pain_rlq_fossa", "abdominal_pain_ruq_subcostal", "abdominal_pain_epigastric", "abdominal_diffuse_cramping",
    "rebound_tenderness_guarding", "nausea_persistent", "vomiting_intractable", "hematemesis_coffee_ground_vomit",
    "watery_diarrhea_frequent", "bloody_mucoid_stools", "melena_dark_tarry_stool", "jaundice_scleral_icterus",
    "dark_tea_colored_urine", "pale_acholic_stools", "dyspepsia_heartburn_regurgitation", "abdominal_distension",
    # Genitourinary / Renal
    "dysuria_burning_micturition", "urinary_frequency_urgency", "gross_hematuria_blood_in_urine", "unilateral_flank_colic_pain",
    "suprapubic_tenderness", "costovertebral_angle_tenderness", "polyuria_excessive_urination", "polydipsia_excessive_thirst",
    # Metabolic / Endocrine
    "kussmaul_rapid_deep_breathing", "fruity_acetone_breath_odor", "tremor_shakiness_adrenergic", "profuse_sweating_hypoglycemia",
    "hunger_pang_hypoglycemia",
    # Musculoskeletal / Trauma
    "inability_to_bear_weight", "joint_swelling_moderate", "joint_erythema_warmth", "localized_ecchymosis_bruising",
    "audible_bone_crack_snap", "gross_bony_deformity", "localized_point_tenderness", "muscular_spasm_paraspinal",
    "straight_leg_raise_positive",
    # ENT / Upper Airway
    "severe_pharyngeal_erythema", "tonsillar_exudate_white_patches", "tender_anterior_cervical_adenopathy",
    "severe_otalgia_ear_pain", "tympanic_membrane_erythema", "purulent_rhinorrhea", "maxillary_facial_fullness",
    "loss_of_taste_smell",
    # Skin / Soft Tissue
    "superficial_clean_cut_hemostatic", "wound_bleeding_controlled", "wound_arterial_spurting_bleed",
    "expanding_cellulitic_erythema", "fluctuant_tender_abscess", "local_warmth_induration", "purulent_wound_discharge",
    "superficial_epidermal_abrasion",
    # Environmental / Shock Vitals
    "core_hyperthermia_hot_dry_skin", "profuse_cramping_heat_exhaustion", "critical_hypotension_sbp_under_90",
    "critical_tachycardia_hr_over_130", "critical_hypoxemia_spo2_under_90", "severe_tachypnea_rr_over_30",
    "pallor_conjunctival_anemia", "capillary_refill_over_3_seconds"
]

# Disease Profile Archetypes (Symptom probabilities per condition)
PROFILES = {
    "Acute Coronary Syndrome / Myocardial Infarction": [
        ("chest_pain_retrosternal", 0.95), ("chest_pressure_squeezing", 0.90), ("radiating_arm_pain_left", 0.75),
        ("radiating_jaw_neck_pain", 0.55), ("diaphoresis_cold_sweats", 0.85), ("shortness_of_breath_acute", 0.70),
        ("critical_hypotension_sbp_under_90", 0.40), ("critical_tachycardia_hr_over_130", 0.45)
    ],
    "Acute Ischemic Stroke / TIA": [
        ("facial_drooping_unilateral", 0.90), ("arm_weakness_unilateral", 0.90), ("slurred_speech_dysarthria", 0.85),
        ("aphasia_word_finding", 0.60), ("sudden_loss_of_balance", 0.70), ("unilateral_numbness", 0.75)
    ],
    "Pulmonary Embolism": [
        ("shortness_of_breath_acute", 0.92), ("pleuritic_sharp_chest_pain", 0.85), ("critical_tachycardia_hr_over_130", 0.70),
        ("hemoptysis_coughing_blood", 0.35), ("critical_hypoxemia_spo2_under_90", 0.65), ("syncope", 0.25)
    ],
    "Anaphylactic Shock": [
        ("stridor_inspiratory", 0.80), ("wheezing_expiratory", 0.85), ("facial_angioedema_lip_swelling", 0.90),
        ("urticaria_hives_wheals", 0.95), ("critical_hypotension_sbp_under_90", 0.75), ("generalized_pruritus", 0.85)
    ],
    "Severe Sepsis / Septic Shock": [
        ("high_grade_fever_over_102f", 0.85), ("rigors_shivering_chills", 0.80), ("critical_hypotension_sbp_under_90", 0.90),
        ("critical_tachycardia_hr_over_130", 0.85), ("confusion_disorientation", 0.70), ("extreme_lethargy_somnolence", 0.75)
    ],
    "Active Status Epilepticus / Uncontrolled Seizure": [
        ("active_tonic_clonic_seizure", 0.98), ("loss_of_consciousness_syncope", 0.95), ("involuntary_muscle_twitching", 0.90)
    ],
    "Severe Uncontrolled Hemorrhage": [
        ("wound_arterial_spurting_bleed", 0.95), ("critical_hypotension_sbp_under_90", 0.85), ("critical_tachycardia_hr_over_130", 0.80),
        ("pallor_conjunctival_anemia", 0.80)
    ],
    "Acute Appendicitis": [
        ("abdominal_pain_rlq_fossa", 0.95), ("rebound_tenderness_guarding", 0.85), ("nausea_persistent", 0.80),
        ("low_grade_fever", 0.65), ("vomiting_intractable", 0.50)
    ],
    "Acute Cholecystitis": [
        ("abdominal_pain_ruq_subcostal", 0.92), ("nausea_persistent", 0.85), ("low_grade_fever", 0.70),
        ("vomiting_intractable", 0.60)
    ],
    "Acute Pancreatitis": [
        ("abdominal_pain_epigastric", 0.95), ("vomiting_intractable", 0.85), ("nausea_persistent", 0.90),
        ("critical_tachycardia_hr_over_130", 0.40)
    ],
    "Community-Acquired Pneumonia": [
        ("high_grade_fever_over_102f", 0.88), ("cough_productive_phlegm", 0.92), ("pleuritic_sharp_chest_pain", 0.70),
        ("shortness_of_breath_acute", 0.75), ("rigors_shivering_chills", 0.70)
    ],
    "Nephrolithiasis (Kidney Stone)": [
        ("unilateral_flank_colic_pain", 0.95), ("gross_hematuria_blood_in_urine", 0.75), ("nausea_persistent", 0.70),
        ("dysuria_burning_micturition", 0.50)
    ],
    "Dengue Fever with Warning Signs": [
        ("high_grade_fever_over_102f", 0.95), ("retro_orbital_eye_pain", 0.85), ("generalized_myalgia_body_ache", 0.90),
        ("petechial_hemorrhagic_rash", 0.60), ("extreme_lethargy_somnolence", 0.65)
    ],
    "Superficial Cut / Minor Laceration (Hemostasis Achieved)": [
        ("superficial_clean_cut_hemostatic", 0.98), ("wound_bleeding_controlled", 0.95)
    ],
    "Acute Uncomplicated Cystitis (UTI)": [
        ("dysuria_burning_micturition", 0.95), ("urinary_frequency_urgency", 0.92), ("suprapubic_tenderness", 0.70)
    ],
    "Acute Ankle Inversion Sprain": [
        ("joint_swelling_moderate", 0.92), ("inability_to_bear_weight", 0.75), ("localized_ecchymosis_bruising", 0.80)
    ],
    "Migraine Headache without Red Flags": [
        ("throbbing_unilateral_headache", 0.92), ("photophobia", 0.85), ("phonophobia", 0.80), ("nausea_persistent", 0.70)
    ],
    "Tension-Type Headache": [
        ("band_like_headache", 0.95), ("profound_asthenia_fatigue", 0.40)
    ],
    "Gastroesophageal Reflux (GERD / Mild Acidity)": [
        ("dyspepsia_heartburn_regurgitation", 0.95), ("abdominal_pain_epigastric", 0.40)
    ]
}

def generate_synthetic_dataset(num_samples_per_class=45):
    X = []
    y = []
    condition_names = [c["name"] for c in CONDITIONS]
    symptom_index = {s: i for i, s in enumerate(SYMPTOMS)}
    num_symptoms = len(SYMPTOMS)

    for c_idx, c_info in enumerate(CONDITIONS):
        c_name = c_info["name"]
        profile = PROFILES.get(c_name, [])

        for _ in range(num_samples_per_class):
            vec = np.zeros(num_symptoms, dtype=np.float32)

            # Core diagnostic symptoms
            for s_name, prob in profile:
                if s_name in symptom_index:
                    if np.random.rand() < prob:
                        vec[symptom_index[s_name]] = 1.0

            # General category heuristics for conditions without explicit archetype
            if "Headache" in c_name and vec.sum() == 0:
                vec[symptom_index["band_like_headache"]] = 1.0
            elif "Cough" in c_name or "Bronchitis" in c_name:
                vec[symptom_index["cough_dry_hacking"]] = 1.0
            elif "Fever" in c_name:
                vec[symptom_index["high_grade_fever_over_102f"]] = 1.0
            elif "Fracture" in c_name:
                vec[symptom_index["inability_to_bear_weight"]] = 1.0
                vec[symptom_index["localized_point_tenderness"]] = 1.0
                vec[symptom_index["audible_bone_crack_snap"]] = 0.8 if np.random.rand() < 0.6 else 0.0

            # Add minor random clinical noise (1-2 non-distracting symptoms)
            if np.random.rand() < 0.25:
                random_sym = np.random.choice(num_symptoms)
                vec[random_sym] = 1.0

            X.append(vec)
            y.append(c_idx)

    return np.array(X), np.array(y)

def main():
    print(f"Generating clinical dataset across {len(CONDITIONS)} conditions and {len(SYMPTOMS)} symptom features...")
    X, y = generate_synthetic_dataset(num_samples_per_class=60)
    print(f"Dataset generated: {X.shape[0]} samples, {X.shape[1]} features.")

    indices = np.arange(len(X))
    np.random.seed(42)
    np.random.shuffle(indices)
    split_idx = int(len(X) * 0.8)
    train_idx, test_idx = indices[:split_idx], indices[split_idx:]
    X_train, X_test = X[train_idx], X[test_idx]
    y_train, y_test = y[train_idx], y[test_idx]

    print("Training TriageRandomForest...")
    clf = TriageRandomForest(
        n_estimators=60,
        max_depth=14,
        random_state=42
    )
    clf.fit(X_train, y_train)

    train_acc = clf.score(X_train, y_train)
    test_acc = clf.score(X_test, y_test)
    print(f"Train Accuracy: {train_acc * 100:.2f}% | Test Accuracy: {test_acc * 100:.2f}%")

    # Save artifacts
    model_path = os.path.join(MODELS_DIR, "triage_rf.joblib")
    joblib.dump(clf, model_path)
    print(f"Saved model to: {model_path}")

    metadata = {
        "conditions": CONDITIONS,
        "symptoms": SYMPTOMS,
        "total_conditions": len(CONDITIONS),
        "total_symptoms": len(SYMPTOMS),
    }
    meta_path = os.path.join(MODELS_DIR, "symptoms_metadata.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata to: {meta_path}")

if __name__ == "__main__":
    main()
