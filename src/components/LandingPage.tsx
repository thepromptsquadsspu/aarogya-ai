import React from 'react';
import {
  HeartPulse,
  MessageSquarePlus,
  Activity,
  ShieldCheck,
  PhoneCall,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  Users,
  Settings,
  Layers,
} from 'lucide-react';
import { ModelStatusBadge } from './ModelStatusBadge';

interface LandingPageProps {
  onStartChat: () => void;
  onOpenBodyMap: () => void;
  onOpenContacts: () => void;
  onOpenHistory?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartChat,
  onOpenBodyMap,
  onOpenContacts,
  onOpenHistory,
}) => {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 sm:py-10 space-y-8 animate-fadeIn">
      {/* Top Banner Status Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-slate-900 text-white rounded-2xl shadow-sm border border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
            <HeartPulse className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold tracking-wide uppercase text-teal-400">TriageMed Clinical AI</span>
            <span className="text-xs text-slate-400 ml-2 hidden sm:inline">&bull; Real-time Emergency Severity Index</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ModelStatusBadge />
          <button
            onClick={onOpenContacts}
            title="Configure Emergency Contacts"
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-full border border-slate-700 transition-all cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xs:inline font-medium">Emergency Contacts</span>
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-teal-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-12 shadow-xl border border-teal-800/40 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-teal-300" />
            <span>AI Symptom Intake & Urgent Care Triaging</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-white">
            Instant Clinical Urgency Assessment When Seconds Count.
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Describe what you or your loved one is experiencing through voice or text. Our trained clinical
            classifier evaluates your symptoms against 45+ acute conditions and standard Emergency Severity
            Index protocols.
          </p>

          {/* PRIMARY HIGH-CONTRAST CTA BUTTON */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
            <button
              id="btn-start-triage-primary"
              onClick={onStartChat}
              className="px-8 py-4 bg-teal-500 hover:bg-teal-400 active:scale-[0.99] text-slate-950 font-extrabold text-base rounded-2xl shadow-lg shadow-teal-500/25 flex items-center justify-center gap-3 transition-all cursor-pointer group"
            >
              <MessageSquarePlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Start AI Triage Chat</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={onOpenBodyMap}
              className="px-6 py-4 bg-slate-800/80 hover:bg-slate-700/80 active:scale-[0.99] text-slate-200 hover:text-white font-semibold text-sm rounded-2xl border border-slate-700/80 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              <Layers className="w-4 h-4 text-teal-400" />
              <span>Symptom Body Visualizer</span>
            </button>
          </div>

          {/* Safety Guarantees */}
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-teal-800/40 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Grounded ML Classifier</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Deterministic Red Flags</span>
            </div>
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Automated Emergency Dispatch</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1 */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">45+ Condition Classifier</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Trained Random Forest model maps symptoms to standard ESI levels (1 through 5) with genuine probability
            distributions and confidence floor alerts.
          </p>
        </div>

        {/* Card 2 */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Deterministic Safety Engine</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Chest pain, stroke indicators, acute hemorrhage, and shock vitals are trapped before and after AI
            generation, guaranteeing immediate emergency escalation.
          </p>
        </div>

        {/* Card 3 */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <PhoneCall className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Emergency Contacts & Auto-Call</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Save family or caregivers. During critical emergencies, TriageMed can automatically place phone alerts
            reading a synthesized clinical summary.
          </p>
        </div>
      </div>
    </div>
  );
};
