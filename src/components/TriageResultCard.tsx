import React, { useState } from 'react';
import { useTriage } from '../context/TriageContext';
import { ESILevel } from '../types';
import {
  PhoneCall,
  Share2,
  Building2,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  HeartHandshake,
  ArrowRight,
  Clock,
} from 'lucide-react';

export const TriageResultCard: React.FC = () => {
  const {
    currentIntake,
    sendCurrentPatientToHospital,
    setView,
    resetPatient,
  } = useTriage();

  const { triageResult, hasSentToHospital, hospitalToken, profile } = currentIntake;
  const [copiedToken, setCopiedToken] = useState(false);

  if (!triageResult) {
    return null;
  }

  const {
    esi_level,
    urgency_label,
    reasoning,
    red_flags,
    next_action,
    home_care_tips,
    confidence,
    forcedByRedFlag,
  } = triageResult;

  // Exact color coding: 1 red, 2 orange, 3 yellow, 4 green, 5 blue
  const levelTheme: Record<
    ESILevel,
    {
      bg: string;
      border: string;
      badgeBg: string;
      badgeText: string;
      headerBg: string;
      accentText: string;
      name: string;
      actionBg: string;
    }
  > = {
    1: {
      bg: 'bg-red-50/70',
      border: 'border-red-500',
      badgeBg: 'bg-red-600 text-white',
      badgeText: 'text-red-700',
      headerBg: 'bg-red-600 text-white',
      accentText: 'text-red-800',
      name: 'Resuscitation (Immediate)',
      actionBg: 'bg-red-700 text-white',
    },
    2: {
      bg: 'bg-orange-50/70',
      border: 'border-orange-500',
      badgeBg: 'bg-orange-500 text-white',
      badgeText: 'text-orange-700',
      headerBg: 'bg-orange-500 text-white',
      accentText: 'text-orange-800',
      name: 'Emergent (High Risk)',
      actionBg: 'bg-orange-600 text-white',
    },
    3: {
      bg: 'bg-amber-50/70',
      border: 'border-amber-400',
      badgeBg: 'bg-amber-500 text-slate-900',
      badgeText: 'text-amber-800',
      headerBg: 'bg-amber-500 text-slate-900',
      accentText: 'text-amber-900',
      name: 'Urgent (Within 1 Hour)',
      actionBg: 'bg-amber-600 text-white',
    },
    4: {
      bg: 'bg-emerald-50/70',
      border: 'border-emerald-500',
      badgeBg: 'bg-emerald-600 text-white',
      badgeText: 'text-emerald-700',
      headerBg: 'bg-emerald-600 text-white',
      accentText: 'text-emerald-900',
      name: 'Less Urgent (Clinic / OPD)',
      actionBg: 'bg-emerald-700 text-white',
    },
    5: {
      bg: 'bg-blue-50/70',
      border: 'border-blue-500',
      badgeBg: 'bg-blue-600 text-white',
      badgeText: 'text-blue-700',
      headerBg: 'bg-blue-600 text-white',
      accentText: 'text-blue-900',
      name: 'Non-Urgent (Routine Care)',
      actionBg: 'bg-blue-700 text-white',
    },
  };

  const theme = levelTheme[esi_level] || levelTheme[3];
  const isEmergencyLevel = esi_level <= 2;

  const handleSendToHospital = () => {
    sendCurrentPatientToHospital();
  };

  const handleCopyToken = () => {
    if (hospitalToken) {
      navigator.clipboard?.writeText(hospitalToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Primary Triage Result Card */}
      <div
        className={`bg-white rounded-2xl border-2 ${theme.border} shadow-md overflow-hidden transition-all`}
      >
        {/* Color-coded Top Banner */}
        <div className={`px-4 py-3.5 ${theme.headerBg} flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-xl border border-white/30">
              {esi_level}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-90">
                  Emergency Severity Index
                </span>
                {forcedByRedFlag && (
                  <span className="px-1.5 py-0.2 bg-white/25 rounded text-[9px] font-bold uppercase tracking-wide">
                    Red-Flag Engine Lock
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold leading-tight">
                ESI Level {esi_level}: {urgency_label || theme.name}
              </h2>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold opacity-80 block">Confidence</span>
            <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-white/20 border border-white/25">
              {confidence}
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* ESI 1-2 IMMEDIATE AMBULANCE CALL BUTTON */}
          {isEmergencyLevel && (
            <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-xl space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 animate-bounce" />
                <div>
                  <h4 className="text-sm font-bold text-rose-900">
                    CRITICAL EMERGENCY REQUIRING IMMEDIATE PARAMEDICS
                  </h4>
                  <p className="text-xs text-rose-700 mt-0.5">
                    Signs indicative of acute physiological compromise. Do not drive yourself. Call the national emergency helpline immediately.
                  </p>
                </div>
              </div>

              <a
                id="btn-call-108-ambulance-large"
                href="tel:108"
                className="w-full py-3.5 px-4 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-bold text-sm sm:text-base rounded-xl shadow-md flex items-center justify-center gap-2.5 transition-all text-center"
              >
                <PhoneCall className="w-5 h-5 animate-pulse" />
                <span>Call 108 Emergency Ambulance (Toll-Free)</span>
              </a>
            </div>
          )}

          {/* Action recommendation */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-700" />
              <span className="text-xs font-semibold text-slate-700">Recommended Action:</span>
            </div>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full ${
                esi_level === 1
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : esi_level === 2
                  ? 'bg-orange-100 text-orange-800 border border-orange-300'
                  : esi_level === 3
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : esi_level === 4
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-blue-100 text-blue-800 border border-blue-300'
              }`}
            >
              {next_action}
            </span>
          </div>

          {/* Red flags section */}
          {red_flags && red_flags.length > 0 && (
            <div className="p-3 bg-rose-50/80 rounded-xl border border-rose-200">
              <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5 mb-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Deterministic Clinical Red Flags Detected:</span>
              </h4>
              <ul className="space-y-1 text-xs text-rose-800 list-disc list-inside">
                {red_flags.map((flag, idx) => (
                  <li key={idx} className="font-medium">
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Explainable AI Reasoning (Max 4 bullets) */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Explainable AI Clinical Reasoning:</span>
            </h4>
            <div className="space-y-2">
              {reasoning.slice(0, 4).map((bullet, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100"
                >
                  <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="flex-1 leading-relaxed">{bullet}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Home Care / First Aid Tips */}
          {home_care_tips && home_care_tips.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <HeartHandshake className="w-3.5 h-3.5 text-teal-600" />
                <span>Immediate Care & Safety Guidance:</span>
              </h4>
              <ul className="space-y-1 text-xs text-slate-600">
                {home_care_tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Action footer: Send to Hospital */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2.5">
          {!hasSentToHospital ? (
            <button
              id="btn-send-to-hospital"
              type="button"
              onClick={handleSendToHospital}
              className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 active:scale-[0.99] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Building2 className="w-4 h-4" />
              <span>Send Case to Hospital ER Queue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="p-3 bg-teal-50 border border-teal-300 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  <span className="text-xs font-bold text-teal-900">
                    Case Transmitted to Hospital ER Queue
                  </span>
                </div>
                <button
                  onClick={handleCopyToken}
                  className="text-[11px] font-mono font-bold text-teal-800 bg-white px-2 py-0.5 rounded border border-teal-200 hover:bg-teal-100"
                >
                  Token: {hospitalToken} {copiedToken ? '✓' : ''}
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-teal-700">
                  Triage nurse notified. Your record is queued on the triage board.
                </p>
                <button
                  id="btn-view-in-hospital-board"
                  onClick={() => setView('hospital')}
                  className="text-xs font-bold text-teal-800 hover:underline flex items-center gap-1 shrink-0 ml-2"
                >
                  <span>View ER Board</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Reset / Start over button */}
          <button
            id="btn-start-new-intake"
            type="button"
            onClick={resetPatient}
            className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Start New Patient Triage</span>
          </button>
        </div>
      </div>
    </div>
  );
};
