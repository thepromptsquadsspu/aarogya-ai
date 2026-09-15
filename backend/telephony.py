import os
from typing import Dict, List, Any, Optional
from config import settings
from db_supabase import get_emergency_contacts, log_emergency_call

def build_emergency_voice_message(
    patient_name: str,
    symptoms: List[str],
    urgency_label: str,
    next_action: str
) -> str:
    """
    Constructs the exact emergency summary text spoken to emergency contacts.
    Built strictly from verified patient data.
    """
    symptoms_phrase = ", ".join(symptoms[:4]) if symptoms else "acute severe medical distress"
    clean_name = patient_name.strip() if patient_name else "Your contact"
    
    return (
        f"This is an automated emergency voice alert from TriageMed on behalf of {clean_name}. "
        f"They have just performed an emergency medical triage intake reporting symptoms of: {symptoms_phrase}. "
        f"The triage system assessed this case as {urgency_label}. "
        f"Immediate recommended action: {next_action}. "
        f"Please attempt to reach them or send emergency assistance immediately. Repeating: {clean_name} has reported {symptoms_phrase}."
    )

def dispatch_emergency_calls(
    patient_name: str,
    symptoms: List[str],
    urgency_label: str,
    next_action: str,
    session_id: str = "default-user"
) -> Dict[str, Any]:
    """
    Initiates emergency outbound notification calls to all saved contacts.
    Supports Safe Test Mode (TWILIO_TEST_MODE=True) by default.
    """
    contacts = get_emergency_contacts(session_id)
    if not contacts:
        return {
            "success": False,
            "error": "No emergency contacts configured. Please add at least 1 emergency contact in Settings.",
            "calls_placed": 0,
            "logs": []
        }

    message_text = build_emergency_voice_message(patient_name, symptoms, urgency_label, next_action)
    call_logs = []
    is_test_mode = settings.TWILIO_TEST_MODE or not (settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_FROM_NUMBER)

    for contact in contacts:
        contact_name = contact.get("name", "Emergency Contact")
        contact_phone = contact.get("phone", "")

        if is_test_mode:
            # ── Safe Test Mode: Synthesize and record without spamming real phone lines ──
            call_log = log_emergency_call(
                contact=contact,
                message=message_text,
                status="simulated_success",
                call_sid=f"test-sim-{contact.get('id', 'c')[:6]}",
                session_id=session_id
            )
            call_logs.append({
                "contact_name": contact_name,
                "contact_phone": contact_phone,
                "status": "simulated_success",
                "mode": "safe_test_mode",
                "message": message_text
            })
        else:
            # ── Live Twilio Outbound Voice Call ──
            try:
                from twilio.rest import Client
                client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
                
                # Twilio TwiML message
                twiml_content = f'<Response><Say voice="Polly.Aditi" language="en-IN">{message_text}</Say></Response>'
                
                call = client.calls.create(
                    twiml=twiml_content,
                    to=contact_phone,
                    from_=settings.TWILIO_FROM_NUMBER
                )
                
                log_emergency_call(
                    contact=contact,
                    message=message_text,
                    status="queued",
                    call_sid=call.sid,
                    session_id=session_id
                )
                call_logs.append({
                    "contact_name": contact_name,
                    "contact_phone": contact_phone,
                    "status": "call_placed",
                    "mode": "live",
                    "call_sid": call.sid
                })
            except Exception as e:
                print(f"[Telephony] Twilio call failed for {contact_phone}: {e}")
                log_emergency_call(
                    contact=contact,
                    message=message_text,
                    status="failed",
                    call_sid=None,
                    session_id=session_id
                )
                call_logs.append({
                    "contact_name": contact_name,
                    "contact_phone": contact_phone,
                    "status": f"failed: {str(e)}",
                    "mode": "live"
                })

    return {
        "success": True,
        "mode": "safe_test_mode" if is_test_mode else "live",
        "message_spoken": message_text,
        "contacts_contacted": len(contacts),
        "results": call_logs
    }
