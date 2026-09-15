import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, AlertCircle, Loader2 } from 'lucide-react';
import { Language } from '../types';
import { transcribeAudio } from '../services/triageApi';

interface VoiceInputProps {
  language: Language;
  onTranscript: (transcript: string) => void;
  disabled?: boolean;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  language,
  onTranscript,
  disabled = false,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<'browser' | 'server'>('browser');

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const getLocale = (lang: Language): string => {
    switch (lang) {
      case 'hi':
        return 'hi-IN';
      case 'mr':
        return 'mr-IN';
      default:
        return 'en-IN';
    }
  };

  // Check browser speech support
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMode('server'); // Fall back to server Whisper
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = getLocale(language);

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        if (text) {
          onTranscript(text);
        }
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.warn('Browser speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access denied. Please allow mic permissions.');
          setIsListening(false);
        } else if (event.error === 'no-speech') {
          setErrorMessage('No speech detected. Please try speaking again.');
          setIsListening(false);
        } else {
          // Switch to server-side Whisper fallback
          setMode('server');
          setIsListening(false);
          startServerRecording();
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      setMode('server');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, onTranscript]);

  // Server-side MediaRecorder Fallback (Groq Whisper)
  const startServerRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsListening(false);
        setIsTranscribing(true);
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 0) {
          const text = await transcribeAudio(audioBlob);
          if (text) {
            onTranscript(text);
          } else {
            setErrorMessage('Server voice transcription returned no speech.');
          }
        }
        setIsTranscribing(false);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsListening(true);
      setErrorMessage(null);
    } catch (err) {
      console.error('MediaRecorder error:', err);
      setErrorMessage('Microphone permission blocked or unavailable.');
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    setErrorMessage(null);

    if (isListening) {
      if (mode === 'browser' && recognitionRef.current) {
        recognitionRef.current.stop();
      } else if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    if (mode === 'browser' && recognitionRef.current) {
      try {
        recognitionRef.current.lang = getLocale(language);
        recognitionRef.current.start();
      } catch (err) {
        // Switch to server Whisper
        setMode('server');
        startServerRecording();
      }
    } else {
      startServerRecording();
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        id="btn-voice-input"
        type="button"
        disabled={disabled || isTranscribing}
        onClick={toggleListening}
        title={
          isListening
            ? 'Tap to stop recording'
            : isTranscribing
            ? 'Transcribing audio...'
            : `Voice Input (${mode === 'browser' ? 'Web Speech' : 'Whisper STT'})`
        }
        className={`relative p-2.5 rounded-xl border transition-all flex items-center justify-center ${
          isListening
            ? 'bg-rose-50 border-rose-400 text-rose-600 animate-pulse ring-2 ring-rose-300'
            : isTranscribing
            ? 'bg-amber-50 border-amber-400 text-amber-600'
            : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
        } ${disabled || isTranscribing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {isTranscribing ? (
          <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
        ) : isListening ? (
          <>
            <MicOff className="w-5 h-5 text-rose-600" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
            </span>
          </>
        ) : (
          <Mic className="w-5 h-5 text-teal-700" />
        )}
      </button>

      {/* Floating Error / Info Toast */}
      {errorMessage && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-2.5 bg-slate-900 text-white text-xs rounded-xl shadow-xl z-50 flex items-start gap-2 animate-fadeIn border border-slate-700">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-slate-200">{errorMessage}</p>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-[10px] text-teal-400 hover:text-white underline mt-1 block cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
