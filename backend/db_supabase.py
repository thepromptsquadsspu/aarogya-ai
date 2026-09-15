import os
import json
import sqlite3
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from config import settings

_supabase_client = None

def get_supabase_client():
    global _supabase_client
    if _supabase_client is None and settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
        try:
            from supabase import create_client
            _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        except Exception as e:
            print(f"[Supabase] Init failed ({e}), falling back to local storage.")
    return _supabase_client

# ── Local SQLite Mirror for Fallback / Offline Dev ────────────────────────────
LOCAL_DB_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(LOCAL_DB_DIR, exist_ok=True)
LOCAL_DB_PATH = os.path.join(LOCAL_DB_DIR, "triage_local.db")

def get_local_db():
    conn = sqlite3.connect(LOCAL_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_local_db():
    with get_local_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS triage_sessions (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                language TEXT DEFAULT 'en',
                chief_complaint TEXT,
                symptoms TEXT,
                vitals TEXT,
                chat_transcript TEXT,
                esi_level INTEGER,
                urgency_label TEXT,
                triage_result TEXT,
                created_at TEXT
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS emergency_contacts (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                relationship TEXT,
                created_at TEXT,
                updated_at TEXT
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS emergency_call_logs (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                contact_id TEXT,
                contact_name TEXT,
                contact_phone TEXT,
                status TEXT,
                message_delivered TEXT,
                call_sid TEXT,
                triggered_at TEXT
            );
        """)
init_local_db()

# ── 1. Triage Session History ──────────────────────────────────────────────────
def save_triage_session(session_data: Dict[str, Any]) -> Dict[str, Any]:
    record_id = session_data.get("id") or str(uuid.uuid4())
    now_str = datetime.utcnow().isoformat()

    row = {
        "id": record_id,
        "session_id": session_data.get("session_id", "default-user"),
        "language": session_data.get("language", "en"),
        "chief_complaint": session_data.get("chief_complaint", ""),
        "symptoms": json.dumps(session_data.get("symptoms", [])),
        "vitals": json.dumps(session_data.get("vitals", {})),
        "chat_transcript": json.dumps(session_data.get("chat_transcript", [])),
        "esi_level": session_data.get("esi_level", 3),
        "urgency_label": session_data.get("urgency_label", "Urgent"),
        "triage_result": json.dumps(session_data.get("triage_result", {})),
        "created_at": now_str,
    }

    # Try Supabase first
    sp = get_supabase_client()
    if sp:
        try:
            res = sp.table("triage_sessions").insert(row).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            print(f"[Supabase] Failed to insert triage_session: {e}")

    # Fallback to local SQLite mirror
    with get_local_db() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO triage_sessions 
            (id, session_id, language, chief_complaint, symptoms, vitals, chat_transcript, esi_level, urgency_label, triage_result, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            row["id"], row["session_id"], row["language"], row["chief_complaint"],
            row["symptoms"], row["vitals"], row["chat_transcript"],
            row["esi_level"], row["urgency_label"], row["triage_result"], row["created_at"]
        ))
    return row

def get_triage_history(session_id: str = "default-user", limit: int = 15) -> List[Dict[str, Any]]:
    sp = get_supabase_client()
    if sp:
        try:
            res = sp.table("triage_sessions").select("*").eq("session_id", session_id).order("created_at", desc=True).limit(limit).execute()
            if res.data is not None:
                return res.data
        except Exception as e:
            print(f"[Supabase] History query failed: {e}")

    # Local fallback
    with get_local_db() as conn:
        cur = conn.execute("SELECT * FROM triage_sessions WHERE session_id = ? ORDER BY created_at DESC LIMIT ?", (session_id, limit))
        rows = [dict(r) for r in cur.fetchall()]
        for r in rows:
            for k in ["symptoms", "vitals", "chat_transcript", "triage_result"]:
                try:
                    r[k] = json.loads(r[k])
                except Exception:
                    pass
        return rows

# ── 2. Emergency Contacts Management (Up to 2) ─────────────────────────────────
def get_emergency_contacts(session_id: str = "default-user") -> List[Dict[str, Any]]:
    sp = get_supabase_client()
    if sp:
        try:
            res = sp.table("emergency_contacts").select("*").eq("session_id", session_id).order("created_at", desc=False).limit(2).execute()
            if res.data is not None:
                return res.data
        except Exception as e:
            print(f"[Supabase] Contacts query failed: {e}")

    with get_local_db() as conn:
        cur = conn.execute("SELECT * FROM emergency_contacts WHERE session_id = ? LIMIT 2", (session_id,))
        return [dict(r) for r in cur.fetchall()]

def save_emergency_contact(
    name: str,
    phone: str,
    relationship: str = "Family",
    session_id: str = "default-user"
) -> Dict[str, Any]:
    existing = get_emergency_contacts(session_id)
    if len(existing) >= 2:
        raise ValueError("Maximum of 2 emergency contacts allowed.")

    cid = str(uuid.uuid4())
    now_str = datetime.utcnow().isoformat()
    row = {
        "id": cid,
        "session_id": session_id,
        "name": name.strip(),
        "phone": phone.strip(),
        "relationship": relationship.strip(),
        "created_at": now_str,
        "updated_at": now_str,
    }

    sp = get_supabase_client()
    if sp:
        try:
            res = sp.table("emergency_contacts").insert(row).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            print(f"[Supabase] Contact insert failed: {e}")

    with get_local_db() as conn:
        conn.execute("""
            INSERT INTO emergency_contacts (id, session_id, name, phone, relationship, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (row["id"], row["session_id"], row["name"], row["phone"], row["relationship"], row["created_at"], row["updated_at"]))
    return row

def delete_emergency_contact(contact_id: str, session_id: str = "default-user") -> bool:
    sp = get_supabase_client()
    if sp:
        try:
            sp.table("emergency_contacts").delete().eq("id", contact_id).eq("session_id", session_id).execute()
            return True
        except Exception as e:
            print(f"[Supabase] Contact delete failed: {e}")

    with get_local_db() as conn:
        conn.execute("DELETE FROM emergency_contacts WHERE id = ? AND session_id = ?", (contact_id, session_id))
    return True

# ── 3. Emergency Call Logs ─────────────────────────────────────────────────────
def log_emergency_call(
    contact: Dict[str, Any],
    message: str,
    status: str = "dispatched",
    call_sid: Optional[str] = None,
    session_id: str = "default-user"
) -> Dict[str, Any]:
    cid = str(uuid.uuid4())
    now_str = datetime.utcnow().isoformat()
    row = {
        "id": cid,
        "session_id": session_id,
        "contact_id": contact.get("id"),
        "contact_name": contact.get("name"),
        "contact_phone": contact.get("phone"),
        "status": status,
        "message_delivered": message,
        "call_sid": call_sid or f"mock-call-{cid[:8]}",
        "triggered_at": now_str,
    }

    sp = get_supabase_client()
    if sp:
        try:
            res = sp.table("emergency_call_logs").insert(row).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            print(f"[Supabase] Call log insert failed: {e}")

    with get_local_db() as conn:
        conn.execute("""
            INSERT INTO emergency_call_logs 
            (id, session_id, contact_id, contact_name, contact_phone, status, message_delivered, call_sid, triggered_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            row["id"], row["session_id"], row["contact_id"], row["contact_name"],
            row["contact_phone"], row["status"], row["message_delivered"], row["call_sid"], row["triggered_at"]
        ))
    return row
