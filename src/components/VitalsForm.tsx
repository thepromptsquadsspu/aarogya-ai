import React from 'react';
import { GuidedAnswers, Language, Vitals } from '../types';
import { HeartPulse, Thermometer, Activity, Droplets, AlertTriangle } from 'lucide-react';

interface VitalsFormProps {
  guided: GuidedAnswers;
  vitals: Vitals;
  onUpdateGuided: (guided: Partial<GuidedAnswers>) => void;
  onUpdateVitals: (vitals: Partial<Vitals>) => void;
  language: Language;
}

export const VitalsForm: React.FC<VitalsFormProps> = ({
  guided,
  vitals,
  onUpdateGuided,
  onUpdateVitals,
  language,
}) => {
  const hrVal = Number(vitals.heartRate);
  const sysVal = Number(vitals.systolicBp);
  const spo2Val = Number(vitals.spO2);

  const isHrCritical = !isNaN(hrVal) && hrVal > 130;
  const isBpCritical = !isNaN(sysVal) && sysVal > 0 && sysVal < 90;
  const isSpo2Critical = !isNaN(spo2Val) && spo2Val > 0 && spo2Val < 90;
  const hasVitalsRedFlag = isHrCritical || isBpCritical || isSpo2Critical;

  const onsetOptions: {
    id: 'sudden' | 'today' | 'few_days' | 'week_plus';
    label: { en: string; hi: string; mr: string };
  }[] = [
    {
      id: 'sudden',
      label: { en: 'Sudden (< 1 hr)', hi: 'अचानक (< 1 घंटा)', mr: 'अचानक (< १ तास)' },
    },
    {
      id: 'today',
      label: { en: 'Today (< 24 hrs)', hi: 'आज (< 24 घंटे)', mr: 'आज (< २४ तास)' },
    },
    {
      id: 'few_days',
      label: { en: '2–3 Days', hi: '२-३ दिन', mr: '२-३ दिवस' },
    },
    {
      id: 'week_plus',
      label: { en: '> 1 Week', hi: '> १ सप्ताह', mr: '> १ आठवडा' },
    },
  ];

  const getSeverityColor = (val: number) => {
    if (val <= 3) return 'bg-emerald-500 text-white';
    if (val <= 6) return 'bg-amber-500 text-white';
    if (val <= 8) return 'bg-orange-500 text-white';
    return 'bg-rose-600 text-white';
  };

  const getSeverityText = (val: number) => {
    if (val <= 3) return 'Mild Discomfort';
    if (val <= 6) return 'Moderate Pain';
    if (val <= 8) return 'Severe Distress';
    return 'Extreme / Incapacitating';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
          <span>Clinical Intake & Vital Signs</span>
          <span className="text-[11px] font-normal text-slate-500">Optional but recommended</span>
        </h3>
        <p className="text-xs text-slate-500">
          Helps calibrate exact Emergency Severity Index (ESI) precision
        </p>
      </div>

      {/* Red flag vitals alert */}
      {hasVitalsRedFlag && (
        <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs flex items-start gap-2.5 animate-pulse">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">CRITICAL VITAL SIGN DETECTED:</span>
            <ul className="list-disc list-inside mt-0.5 space-y-0.5">
              {isHrCritical && <li>Heart Rate &gt; 130 bpm ({hrVal} bpm)</li>}
              {isBpCritical && <li>Systolic BP &lt; 90 mmHg ({sysVal} mmHg - Shock)</li>}
              {isSpo2Critical && <li>SpO2 &lt; 90% ({spo2Val}% - Severe Hypoxemia)</li>}
            </ul>
            <span className="text-[11px] font-medium text-rose-700 mt-1 block">
              Protocol will immediately elevate case to ESI Level 1 or 2.
            </span>
          </div>
        </div>
      )}

      {/* 1. Onset Selector */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          When did symptoms start? (Onset)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {onsetOptions.map((opt) => {
            const active = guided.onset === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onUpdateGuided({ onset: opt.id })}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                  active
                    ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {opt.label[language] || opt.label.en}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Pain / Severity Slider (1-10) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-700">
            Severity / Pain Level: <span className="text-teal-700 font-bold">{guided.severity || 5}/10</span>
          </label>
          <span className="text-[11px] font-medium text-slate-500">
            {getSeverityText(guided.severity || 5)}
          </span>
        </div>

        {/* 1-10 Touch buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => {
            const isCurrent = (guided.severity || 5) === num;
            return (
              <button
                key={num}
                type="button"
                onClick={() => onUpdateGuided({ severity: num })}
                className={`flex-1 h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                  isCurrent
                    ? `${getSeverityColor(num)} ring-2 ring-offset-1 ring-slate-400 scale-105 shadow-xs`
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Objective Vitals Inputs */}
      <div className="pt-2 border-t border-slate-100">
        <label className="block text-xs font-semibold text-slate-700 mb-2">
          Vital Signs (if available / measured)
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* SpO2 */}
          <div className={`p-2.5 rounded-xl border ${isSpo2Critical ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between text-slate-600 mb-1">
              <span className="text-[11px] font-semibold flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-blue-600" />
                <span>SpO2</span>
              </span>
              <span className="text-[10px] text-slate-400">&ge; 95% norm</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                id="input-vitals-spo2"
                type="number"
                min="50"
                max="100"
                placeholder="98"
                value={vitals.spO2 || ''}
                onChange={(e) => onUpdateVitals({ spO2: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 focus:outline-teal-500"
              />
              <span className="text-xs text-slate-500 font-medium">%</span>
            </div>
          </div>

          {/* Heart Rate */}
          <div className={`p-2.5 rounded-xl border ${isHrCritical ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between text-slate-600 mb-1">
              <span className="text-[11px] font-semibold flex items-center gap-1">
                <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                <span>Heart Rate</span>
              </span>
              <span className="text-[10px] text-slate-400">60-100 norm</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                id="input-vitals-hr"
                type="number"
                min="30"
                max="240"
                placeholder="76"
                value={vitals.heartRate || ''}
                onChange={(e) => onUpdateVitals({ heartRate: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 focus:outline-teal-500"
              />
              <span className="text-xs text-slate-500 font-medium">bpm</span>
            </div>
          </div>

          {/* Blood Pressure Systolic */}
          <div className={`p-2.5 rounded-xl border ${isBpCritical ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between text-slate-600 mb-1">
              <span className="text-[11px] font-semibold flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-indigo-600" />
                <span>BP (Sys/Dia)</span>
              </span>
              <span className="text-[10px] text-slate-400">120/80 norm</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                id="input-vitals-sys"
                type="number"
                min="40"
                max="260"
                placeholder="120"
                value={vitals.systolicBp || ''}
                onChange={(e) => onUpdateVitals({ systolicBp: e.target.value })}
                className="w-1/2 bg-white border border-slate-200 rounded-lg px-1.5 py-1 text-xs font-bold text-slate-900 focus:outline-teal-500 text-center"
              />
              <span className="text-slate-400">/</span>
              <input
                id="input-vitals-dia"
                type="number"
                min="30"
                max="150"
                placeholder="80"
                value={vitals.diastolicBp || ''}
                onChange={(e) => onUpdateVitals({ diastolicBp: e.target.value })}
                className="w-1/2 bg-white border border-slate-200 rounded-lg px-1.5 py-1 text-xs font-bold text-slate-900 focus:outline-teal-500 text-center"
              />
            </div>
          </div>

          {/* Temperature */}
          <div className="p-2.5 rounded-xl border bg-slate-50 border-slate-200">
            <div className="flex items-center justify-between text-slate-600 mb-1">
              <span className="text-[11px] font-semibold flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-amber-600" />
                <span>Temperature</span>
              </span>
              <span className="text-[10px] text-slate-400">98.6°F norm</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                id="input-vitals-temp"
                type="number"
                step="0.1"
                min="90"
                max="108"
                placeholder="98.6"
                value={vitals.temperature || ''}
                onChange={(e) => onUpdateVitals({ temperature: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 focus:outline-teal-500"
              />
              <span className="text-xs text-slate-500 font-medium">°F</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
