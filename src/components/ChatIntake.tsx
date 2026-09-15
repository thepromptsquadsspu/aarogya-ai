import React, { useState, useEffect, useRef } from 'react';
import { useTriage } from '../context/TriageContext';
import { VoiceInput } from './VoiceInput';
import { detectRedFlags, sendChatMessage } from '../services/api';
import { ChatMessage } from '../types';
import {
  Send,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Bot,
  User,
  CheckCircle2,
} from 'lucide-react';

export const ChatIntake: React.FC = () => {
  const {
    currentIntake,
    addChatMessage,
    triggerTriageCalculation,
    setStep,
  } = useTriage();

  const { profile, vitals, bodyRegions, chatMessages, isAssessing } = currentIntake;
  const language = profile.language || 'en';

  const [inputVal, setInputVal] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [isReadyForTriage, setIsReadyForTriage] = useState(false);
  const [detectedFlagsLive, setDetectedFlagsLive] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial welcome message if chat is empty
  useEffect(() => {
    if (chatMessages.length === 0) {
      const welcomeMessages: Record<string, { text: string; replies: string[] }> = {
        en: {
          text: `Namaste ${profile.name || ''}. I am Aarogya AI, your emergency triage assistant. Please describe the primary symptoms or discomfort you are experiencing right now.`,
          replies: [
            'Severe chest pain with sweating',
            'High fever with chills for 2 days',
            'Cut on my finger while cooking',
            'Severe shortness of breath',
          ],
        },
        hi: {
          text: `नमस्ते ${profile.name || ''} जी। मैं आरोग्य एआई (Aarogya AI) हूँ। कृपया बताएं कि आपको इस समय क्या तकलीफ या लक्षण महसूस हो रहे हैं?`,
          replies: [
            'छाती में तेज दर्द और पसीना आ रहा है',
            '२ दिनों से तेज बुखार और ठंड लग रही है',
            'सब्जी काटते समय उंगली कट गई',
            'सांस लेने में बहुत परेशानी हो रही है',
          ],
        },
        mr: {
          text: `नमस्कार ${profile.name || ''}. मी आरोग्य एआय (Aarogya AI) वैद्यकीय सहाय्यक आहे. आपल्याला सध्या काय त्रास किंवा लक्षणे जाणवत आहेत ते कृपया सांगा.`,
          replies: [
            'छातीत तीव्र वेदना आणि घाम येतोय',
            '२ दिवसांपासून खूप ताप आणि थंडी वाजतेय',
            'भाजी चिरताना हाताला कापले आहे',
            'श्वास घेण्यास खूप त्रास होतोय',
          ],
        },
      };

      const w = welcomeMessages[language] || welcomeMessages.en;
      addChatMessage({
        id: `msg-welcome-${Date.now()}`,
        sender: 'assistant',
        text: w.text,
        timestamp: Date.now(),
        quickReplies: w.replies,
      });
      setQuickReplies(w.replies);
    }
  }, [chatMessages.length, language, profile.name]);

  // Real-time red flag check over conversation
  useEffect(() => {
    const combined = chatMessages.map((m) => m.text).join(' ') + ' ' + inputVal;
    const check = detectRedFlags(combined, vitals);
    setDetectedFlagsLive(check.detectedFlags);
  }, [chatMessages, inputVal, vitals]);

  // Auto-scroll to bottom on message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isBotTyping]);

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend !== undefined ? textToSend : inputVal).trim();
    if (!messageText || isBotTyping) return;

    // 1. Add user message
    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text: messageText,
      timestamp: Date.now(),
    };
    addChatMessage(userMsg);
    setInputVal('');
    setQuickReplies([]);
    setIsBotTyping(true);

    const updatedMessages = [...chatMessages, userMsg];

    try {
      // 2. Call AI intake
      const response = await sendChatMessage({
        messages: updatedMessages,
        language,
        patient: profile,
        vitals,
        bodyRegions,
      });

      // 3. Add AI follow-up question
      const botMsg: ChatMessage = {
        id: `msg-bot-${Date.now()}`,
        sender: 'assistant',
        text: response.nextQuestion,
        timestamp: Date.now(),
        quickReplies: response.quickReplies,
      };

      addChatMessage(botMsg);
      setQuickReplies(response.quickReplies || []);
      setQuestionCount(response.questionNumber);
      if (response.readyForAssessment || response.questionNumber >= 4) {
        setIsReadyForTriage(true);
      }
    } catch (err) {
      console.error('Failed to get follow-up question:', err);
      // Fallback
      addChatMessage({
        id: `msg-bot-fallback-${Date.now()}`,
        sender: 'assistant',
        text: 'Thank you for sharing your symptoms. When you are ready, please proceed to calculate your clinical triage score.',
        timestamp: Date.now(),
      });
      setIsReadyForTriage(true);
    } finally {
      setIsBotTyping(false);
    }
  };

  const handleVoiceTranscript = (transcript: string) => {
    if (transcript) {
      setInputVal((prev) => (prev ? `${prev} ${transcript}` : transcript));
    }
  };

  const userMessagesCount = chatMessages.filter((m) => m.sender === 'user').length;

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header bar */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900">
                Aarogya Symptom Intake
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 font-bold uppercase">
                {language}
              </span>
            </div>
            <p className="text-[10px] text-slate-500">
              Adaptive follow-ups • Deterministic Safety Guardrails
            </p>
          </div>
        </div>

        {/* Question progress pill */}
        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-white px-2 py-1 rounded-lg border border-slate-200">
          <Sparkles className="w-3 h-3 text-teal-600" />
          <span>Follow-up {Math.min(questionCount, 4)} of 4</span>
        </div>
      </div>

      {/* Live Red-flag warning banner if triggered */}
      {detectedFlagsLive.length > 0 && (
        <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-1.5 truncate">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold truncate">
              Safety Red Flag Detected: {detectedFlagsLive[0]}
            </span>
          </div>
          <span className="px-1.5 py-0.5 bg-rose-600 text-white rounded font-mono text-[10px] font-bold shrink-0">
            Forced ESI 1/2
          </span>
        </div>
      )}

      {/* Chat messages container */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50">
        {chatMessages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-teal-600 text-white shadow-xs'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-tr-xs shadow-xs'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs shadow-xs'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <span
                  className={`text-[9px] block mt-1 font-mono text-right ${
                    isUser ? 'text-indigo-200' : 'text-slate-400'
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          );
        })}

        {/* Bot typing indicator */}
        {isBotTyping && (
          <div className="flex items-center gap-2 text-slate-500 text-xs py-1">
            <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-teal-700">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-3.5 py-2 flex items-center gap-1.5 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-bounce"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-bounce [animation-delay:0.4s]"></span>
              <span className="text-[11px] text-slate-400 ml-1">Aarogya AI is reasoning...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick reply chips */}
      {quickReplies.length > 0 && !isBotTyping && (
        <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-semibold text-slate-400 uppercase shrink-0">
            Suggested:
          </span>
          {quickReplies.map((reply, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSendMessage(reply)}
              className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 border border-slate-200 text-slate-700 transition-all active:scale-95"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Input area or Triage Action Button */}
      <div className="p-3 bg-white border-t border-slate-200">
        {/* If ready for triage or user has answered 2+ questions, show the calculate triage button */}
        {userMessagesCount >= 2 && (
          <div className="mb-2.5">
            <button
              id="btn-calculate-triage-now"
              type="button"
              disabled={isAssessing}
              onClick={triggerTriageCalculation}
              className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isAssessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Calculating ESI Clinical Triage...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Generate Triage Score (ESI 1–5)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Input box with voice mic & send */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          {/* Voice Input with Web Speech API */}
          <VoiceInput
            language={language}
            onTranscript={handleVoiceTranscript}
            disabled={isBotTyping}
          />

          <input
            id="input-chat-symptom"
            type="text"
            placeholder={
              language === 'hi'
                ? 'लक्षण लिखें या माइक दबाकर बोलें...'
                : language === 'mr'
                ? 'लक्षणे लिहा किंवा माइक दाबून बोला...'
                : 'Describe symptoms or tap mic to speak...'
            }
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={isBotTyping}
            className="flex-1 bg-slate-50 border border-slate-300 focus:border-teal-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none transition-colors"
          />

          <button
            id="btn-chat-send"
            type="submit"
            disabled={!inputVal.trim() || isBotTyping}
            className="p-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center"
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
