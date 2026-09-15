import React, { useEffect, useState } from 'react';
import { getModelStatus, ModelStatusResponse } from '../services/triageApi';
import { Activity, Cpu, Sparkles, AlertTriangle } from 'lucide-react';

export const ModelStatusBadge: React.FC = () => {
  const [status, setStatus] = useState<ModelStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchStatus = async () => {
      const data = await getModelStatus();
      if (mounted) {
        setStatus(data);
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading && !status) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 border border-slate-700/60 rounded-full text-xs text-slate-300">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
        <span>Checking model status...</span>
      </div>
    );
  }

  const groqOnline = status?.groq.online;
  const geminiOnline = status?.gemini.online;
  const isOnline = groqOnline || geminiOnline;
  const activeProvider = groqOnline ? 'Groq (Llama 3.3)' : (geminiOnline ? 'Gemini (Flash)' : 'Simulation Mode');
  const latency = groqOnline ? status?.groq.latency_ms : (geminiOnline ? status?.gemini.latency_ms : null);

  return (
    <div
      title={
        status
          ? `Groq: ${groqOnline ? `Online (${status.groq.latency_ms}ms)` : 'Unavailable'}\nGemini: ${geminiOnline ? `Online (${status.gemini.latency_ms}ms)` : 'Unavailable'}`
          : 'Live status unavailable'
      }
      className="flex items-center gap-2 px-3 py-1 bg-slate-900/90 hover:bg-slate-900 border border-teal-900/40 rounded-full shadow-xs transition-all cursor-default"
    >
      <span className="relative flex h-2 w-2">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            isOnline ? 'bg-emerald-400' : 'bg-amber-400'
          }`}
        ></span>
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            isOnline ? 'bg-emerald-500' : 'bg-amber-500'
          }`}
        ></span>
      </span>

      <div className="flex items-center gap-1.5 text-xs text-slate-200">
        <Cpu className="w-3.5 h-3.5 text-teal-400" />
        <span className="font-semibold text-slate-100">{activeProvider}</span>
        {latency && (
          <span className="text-[10px] font-mono text-teal-300/80 bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-800/40">
            {latency}ms
          </span>
        )}
      </div>
    </div>
  );
};
