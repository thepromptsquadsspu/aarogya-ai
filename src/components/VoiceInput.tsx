import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { Language } from '../types';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Map app language to speech recognition locale
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

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
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
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access was denied. Please allow microphone permission.');
        } else if (event.error === 'no-speech') {
          setErrorMessage('No speech heard. Please try speaking again.');
        } else {
          setErrorMessage(`Voice recognition unavailable (${event.error}).`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.error('Failed to init speech recognition:', e);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, onTranscript]);

  const toggleListening = () => {
    setErrorMessage(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage(
        'Speech recognition is not supported in this browser. Please use keyboard typing.'
      );
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        if (recognitionRef.current) {
          recognitionRef.current.lang = getLocale(language);
          recognitionRef.current.start();
        }
      } catch (err) {
        console.error('Speech recognition start error:', err);
        setErrorMessage('Unable to start microphone. Please try typing instead.');
      }
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        id="btn-voice-input"
        type="button"
        disabled={disabled}
        onClick={toggleListening}
        title={isListening ? 'Stop listening' : `Voice input in ${language.toUpperCase()}`}
        className={`relative p-2.5 rounded-xl border transition-all flex items-center justify-center ${
          isListening
            ? 'bg-rose-50 border-rose-400 text-rose-600 animate-pulse ring-2 ring-rose-300'
            : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {isListening ? (
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

      {/* Floating Error Toast if speech fails */}
      {errorMessage && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg z-50 flex items-start gap-1.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">{errorMessage}</p>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-[10px] text-slate-400 hover:text-white underline mt-1 block"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
