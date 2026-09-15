import React, { useState } from 'react';
import { useTriage } from '../context/TriageContext';
import { ChatIntake } from './ChatIntake';
import { BodyMap } from './BodyMap';
import { VitalsForm } from './VitalsForm';
import { TriageResultCard } from './TriageResultCard';
import { Language, Sex } from '../types';
import {
  HeartPulse,
  User,
  Zap,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sliders,
  MapPin,
  Sparkles,
  PhoneCall,
  Activity,
} from 'lucide-react';

export const PatientView: React.FC = () => {
  const {
    currentIntake,
    setLanguage,
    setProfile,
    setVitals,
    setGuided,
    toggleBodyRegion,
    setStep,
    runDemoScenario,
  } = useTriage();

  const { profile, vitals, guided, bodyRegions, step, triageResult } = currentIntake;
  const [showBodyMap, setShowBodyMap] = useState(false);
  const [showVitalsForm, setShowVitalsForm] = useState(false);

  const languages: { code: Language; label: string; script: string }[] = [
    { code: 'en', label: 'English', script: 'EN' },
    { code: 'hi', label: 'हिंदी', script: 'HI' },
    { code: 'mr', label: 'मराठी', script: 'MR' },
  ];

  const handleStartIntake = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('intake');
  };

  return (
    <div className={`mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 ${step === 'intake' ? 'max-w-6xl' : 'max-w-xl'}`}>
      {/* Step 1: Onboarding Screen */}
      {step === 'onboarding' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Hero Header */}
          <div className="bg-gradient-to-br from-white to-teal-50/50 p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">
                  Emergency Medical Triage
                </h2>
                <p className="text-xs text-slate-500">
                  AI-assisted urgency assessment calibrated for Indian healthcare
                </p>
              </div>
            </div>

            {/* Language Picker */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Select Consultation Language / भाषा निवडा:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {languages.map((l) => {
                  const isSelected = profile.language === l.code;
                  return (
                    <button
                      key={l.code}
                      type="button"
                      id={`btn-lang-${l.code}`}
                      onClick={() => setLanguage(l.code)}
                      className={`py-2 px-3 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'bg-teal-600 text-white border-teal-600 font-bold shadow-xs scale-[1.02]'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 font-medium'
                      }`}
                    >
                      <div className="text-sm">{l.label}</div>
                      <div className={`text-[10px] uppercase font-mono ${isSelected ? 'text-teal-100' : 'text-slate-400'}`}>
                        {l.script}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Benchmark Scenarios */}
          <div className="bg-white p-4 rounded-2xl border border-teal-200/80 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800 uppercase tracking-wide">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Clinical Benchmark Scenarios</span>
              </div>
              <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-200 font-semibold">
                Instant Verification
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Select any pre-configured case to auto-fill demographics, transcript & test full ESI triage:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {/* Scenario 1: ESI 1 */}
              <button
                id="btn-scenario-chest-pain"
                type="button"
                onClick={() => runDemoScenario('chest_pain')}
                className="text-left p-3 rounded-xl bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200 text-slate-800 transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-rose-900 group-hover:text-rose-950">
                    58M Chest Pain
                  </span>
                  <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded text-[10px] font-bold">
                    ESI 1
                  </span>
                </div>
                <p className="text-[11px] text-rose-700 leading-tight">
                  Crushing chest pain + sweating + shock vitals
                </p>
              </button>

              {/* Scenario 2: ESI 3 */}
              <button
                id="btn-scenario-fever"
                type="button"
                onClick={() => runDemoScenario('fever')}
                className="text-left p-3 rounded-xl bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200 text-slate-800 transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-amber-900 group-hover:text-amber-950">
                    6F High Fever
                  </span>
                  <span className="px-1.5 py-0.2 bg-amber-500 text-slate-900 rounded text-[10px] font-bold">
                    ESI 3
                  </span>
                </div>
                <p className="text-[11px] text-amber-700 leading-tight">
                  102°F fever for 2 days + lethargy & chills
                </p>
              </button>

              {/* Scenario 3: ESI 5 */}
              <button
                id="btn-scenario-cut"
                type="button"
                onClick={() => runDemoScenario('cut')}
                className="text-left p-3 rounded-xl bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200 text-slate-800 transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-blue-900 group-hover:text-blue-950">
                    24M Finger Cut
                  </span>
                  <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded text-[10px] font-bold">
                    ESI 5
                  </span>
                </div>
                <p className="text-[11px] text-blue-700 leading-tight">
                  Small superficial cut, bleeding stopped
                </p>
              </button>
            </div>
          </div>

          {/* Onboarding Form */}
          <form
            onSubmit={handleStartIntake}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Patient Demographics
              </span>
              <span className="text-[11px] text-slate-400">Step 1 of 2</span>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Patient Full Name / नाव
              </label>
              <input
                id="input-patient-name"
                type="text"
                required
                placeholder="e.g. Ramesh Kumar"
                value={profile.name}
                onChange={(e) => setProfile({ name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 focus:border-teal-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none"
              />
            </div>

            {/* Age & Sex Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Age (Years) / वय
                </label>
                <input
                  id="input-patient-age"
                  type="number"
                  min="0"
                  max="120"
                  required
                  placeholder="e.g. 45"
                  value={profile.age}
                  onChange={(e) => setProfile({ age: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-teal-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sex / लिंग
                </label>
                <select
                  id="select-patient-sex"
                  value={profile.sex}
                  onChange={(e) => setProfile({ sex: e.target.value as Sex })}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-teal-600 focus:bg-white rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none"
                >
                  <option value="male">Male (पुरुष)</option>
                  <option value="female">Female (महिला)</option>
                  <option value="other">Other (अन्य)</option>
                </select>
              </div>
            </div>

            <button
              id="btn-start-intake"
              type="submit"
              className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 active:scale-[0.99] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
            >
              <span>Begin AI Symptom Assessment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Step 2: Intake Screen (Responsive Desktop Split-View + Mobile Stacked) */}
      {step === 'intake' && (
        <div className="animate-fadeIn space-y-4">
          {/* Mobile Top Summary Bar (Hidden on desktop) */}
          <div className="lg:hidden bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
                {profile.sex === 'female' ? 'F' : 'M'}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-slate-900">
                    {profile.name || 'Patient'}
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    ({profile.age}y, {profile.sex})
                  </span>
                </div>
                <span className="text-[10px] text-teal-700 font-semibold uppercase">
                  Language: {profile.language}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowBodyMap((prev) => !prev)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  showBodyMap || bodyRegions.length > 0
                    ? 'bg-teal-50 border-teal-300 text-teal-800'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                <span>Body Map {bodyRegions.length > 0 ? `(${bodyRegions.length})` : ''}</span>
                {showBodyMap ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setShowVitalsForm((prev) => !prev)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  showVitalsForm
                    ? 'bg-teal-50 border-teal-300 text-teal-800'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-teal-600" />
                <span>Vitals</span>
                {showVitalsForm ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Mobile Accordion Dropdowns */}
          <div className="lg:hidden space-y-3">
            {showBodyMap && (
              <div className="animate-fadeIn">
                <BodyMap
                  selectedRegions={bodyRegions}
                  onToggleRegion={toggleBodyRegion}
                  language={profile.language}
                />
              </div>
            )}

            {showVitalsForm && (
              <div className="animate-fadeIn">
                <VitalsForm
                  guided={guided}
                  vitals={vitals}
                  onUpdateGuided={setGuided}
                  onUpdateVitals={setVitals}
                  language={profile.language}
                />
              </div>
            )}
          </div>

          {/* Layout Grid: Split on Desktop (lg:), Stacked on Mobile */}
          <div className="lg:grid lg:grid-cols-12 lg:gap-6 items-start">
            {/* Left: Chat Intake */}
            <div className="lg:col-span-7">
              <ChatIntake />
            </div>

            {/* Right: Desktop Cockpit Panel (Demographics, Body Visualizer, Vitals) */}
            <div className="hidden lg:flex lg:col-span-5 flex-col gap-4">
              {/* Patient Overview Card */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
                      {profile.sex === 'female' ? 'F' : 'M'}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{profile.name || 'Anonymous Patient'}</h4>
                      <p className="text-[11px] text-slate-500">{profile.age} years old &bull; {profile.sex}</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-teal-50 text-teal-700 font-semibold rounded-full uppercase border border-teal-200">
                    Language: {profile.language}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Interactive inputs update the AI assessment context in real time.
                </p>
              </div>

              {/* Body Map Visualizer */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" />
                  <span>Symptom Location Selector</span>
                </h4>
                <BodyMap
                  selectedRegions={bodyRegions}
                  onToggleRegion={toggleBodyRegion}
                  language={profile.language}
                />
              </div>

              {/* Vitals Form */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-teal-600" />
                  <span>Vitals & Clinical Metrics</span>
                </h4>
                <VitalsForm
                  guided={guided}
                  vitals={vitals}
                  onUpdateGuided={setGuided}
                  onUpdateVitals={setVitals}
                  language={profile.language}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Triage Result Card */}
      {step === 'result' && <TriageResultCard />}

      {/* Persistent Footer Safety Disclaimer */}
      <footer className="mt-6 pt-4 border-t border-slate-200/80 text-center">
        <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-700 shrink-0" />
          <span>
            This is a triage advisor, not a definitive diagnosis. In an emergency, dial{' '}
            <a href="tel:108" className="text-rose-600 font-bold underline ml-0.5">
              108
            </a>
            .
          </span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">
          TriageMed &bull; Emergency Severity Index (ESI) 5-Tier Protocol
        </p>
      </footer>
    </div>
  );
};
