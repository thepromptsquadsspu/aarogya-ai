import os
from typing import Optional
from dotenv import load_dotenv

# Load from both root .env and backend/.env
load_dotenv(".env")
load_dotenv("backend/.env")

class Settings:
    PROJECT_NAME: str = "TriageMed"
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "true").lower() in ("true", "1", "yes")

    # LLM Providers
    GROQ_API_KEY: Optional[str] = os.getenv("GROQ_API_KEY")
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

    # Supabase (PostgreSQL)
    SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL")
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

    # Telephony (Twilio Voice)
    TWILIO_ACCOUNT_SID: Optional[str] = os.getenv("TWILIO_ACCOUNT_SID")
    TWILIO_AUTH_TOKEN: Optional[str] = os.getenv("TWILIO_AUTH_TOKEN")
    TWILIO_FROM_NUMBER: Optional[str] = os.getenv("TWILIO_FROM_NUMBER")
    TWILIO_TEST_MODE: bool = os.getenv("TWILIO_TEST_MODE", "true").lower() in ("true", "1", "yes")

    # Triage ML Model
    CONFIDENCE_FLOOR: float = float(os.getenv("CONFIDENCE_FLOOR", "0.35"))

settings = Settings()
