import React from 'react';
import { useTriage } from '../context/TriageContext';
import { Activity, PhoneCall, LayoutDashboard, UserCheck, ShieldAlert, Sparkles } from 'lucide-react';
import { USE_MOCK } from '../services/api';

export const TopNav: React.FC = () => {
  const { view, setView, hospitalQueue } = useTriage();

  const criticalCount = hospitalQueue.filter((p) => p.esiLevel <= 2 && p.status !== 'Discharged').length;
  const waitingCount = hospitalQueue.filter((p) => p.status === 'Waiting').length;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Brand identity */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-sm shadow-teal-700/20">
            <Activity className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-none">
                Aarogya <span className="text-teal-600">AI</span>
              </h1>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                India ER Triage
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              Interactive ESI Protocol • Multilingual AI Intake
            </p>
          </div>
        </div>

        {/* View Switcher (Patient App vs Hospital Dashboard) */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          <button
            id="nav-toggle-patient-view"
            onClick={() => setView('patient')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              view === 'patient'
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Patient App</span>
          </button>
          <button
            id="nav-toggle-hospital-view"
            onClick={() => setView('hospital')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              view === 'hospital'
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Hospital ER Board</span>
            {waitingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-teal-100 text-teal-800 rounded-full text-[10px] font-bold">
                {waitingCount}
              </span>
            )}
            {criticalCount > 0 && (
              <span className="px-1 py-0.2 bg-rose-600 text-white rounded-full text-[10px] font-bold animate-pulse">
                {criticalCount}
              </span>
            )}
          </button>
        </div>

        {/* Quick Emergency 108 Action & Status */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span className="font-mono text-[11px]">
              {USE_MOCK ? 'Simulated AI + ESI Rule Engine' : 'Live Gemini 3.8 Flash'}
            </span>
          </div>

          <a
            id="btn-call-108-header"
            href="tel:108"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
            title="Immediate Ambulance Dial"
          >
            <PhoneCall className="w-3.5 h-3.5 animate-bounce" />
            <span>108 Ambulance</span>
          </a>
        </div>
      </div>
    </header>
  );
};
