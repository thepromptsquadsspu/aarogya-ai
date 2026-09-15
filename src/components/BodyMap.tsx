import React, { useState } from 'react';
import { BodyRegion, Language } from '../types';
import { RotateCw, Check } from 'lucide-react';

interface BodyMapProps {
  selectedRegions: BodyRegion[];
  onToggleRegion: (region: BodyRegion) => void;
  language: Language;
}

const regionLabels: Record<
  BodyRegion,
  { en: string; hi: string; mr: string; description: string }
> = {
  head: {
    en: 'Head & Neck',
    hi: 'सिर और गर्दन',
    mr: 'डोके व मान',
    description: 'Headache, dizziness, neck stiffness, facial pain',
  },
  chest: {
    en: 'Chest',
    hi: 'छाती',
    mr: 'छाती',
    description: 'Chest pain, tightness, breathlessness, palpitations',
  },
  abdomen: {
    en: 'Abdomen / Stomach',
    hi: 'पेट / आमाशय',
    mr: 'पोट / जठर',
    description: 'Stomach ache, nausea, cramps, burning sensation',
  },
  arms: {
    en: 'Arms & Hands',
    hi: 'हाथ और बाहें',
    mr: 'हात व बाहू',
    description: 'Lacerations, fractures, numbness, radiation pain',
  },
  legs: {
    en: 'Legs & Feet',
    hi: 'पैर और तलवे',
    mr: 'पाय व पावले',
    description: 'Sprains, knee pain, swelling, mobility issues',
  },
  back: {
    en: 'Back & Spine',
    hi: 'पीठ और रीढ़',
    mr: 'पाठ व कणा',
    description: 'Lower back ache, spine injury, muscle spasm',
  },
};

export const BodyMap: React.FC<BodyMapProps> = ({
  selectedRegions,
  onToggleRegion,
  language,
}) => {
  const [viewMode, setViewMode] = useState<'front' | 'back'>('front');

  const isSelected = (region: BodyRegion) => selectedRegions.includes(region);

  const getFillClass = (region: BodyRegion) => {
    if (isSelected(region)) {
      return 'fill-teal-500 stroke-teal-700 stroke-2 filter drop-shadow(0 2px 4px rgba(13,148,136,0.3)) cursor-pointer transition-all duration-200';
    }
    return 'fill-slate-200 hover:fill-teal-100 stroke-slate-400 stroke-1 cursor-pointer transition-all duration-200';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <span>Anatomical Pain Map</span>
            <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.5 rounded font-semibold">
              Interactive
            </span>
          </h3>
          <p className="text-xs text-slate-500">
            Tap the body areas where you feel pain or discomfort
          </p>
        </div>

        {/* Front / Back Toggle */}
        <button
          type="button"
          onClick={() => setViewMode((prev) => (prev === 'front' ? 'back' : 'front'))}
          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition-colors"
        >
          <RotateCw className="w-3.5 h-3.5 text-teal-600" />
          <span>{viewMode === 'front' ? 'Show Back' : 'Show Front'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
        {/* SVG Human Figure */}
        <div className="sm:col-span-6 flex flex-col items-center justify-center p-2 bg-slate-50/70 rounded-xl border border-slate-100 min-h-[260px]">
          <div className="text-[11px] font-mono text-slate-400 mb-1">
            {viewMode === 'front' ? 'ANTERIOR (FRONT VIEW)' : 'POSTERIOR (BACK VIEW)'}
          </div>

          <svg
            viewBox="0 0 200 300"
            className="w-44 h-64 select-none touch-manipulation"
            role="img"
            aria-label="Human body pain map"
          >
            {viewMode === 'front' ? (
              // FRONT VIEW
              <g id="body-map-front">
                {/* Head */}
                <circle
                  cx="100"
                  cy="35"
                  r="22"
                  className={getFillClass('head')}
                  onClick={() => onToggleRegion('head')}
                />
                {/* Neck */}
                <rect
                  x="93"
                  y="57"
                  width="14"
                  height="12"
                  rx="2"
                  className={getFillClass('head')}
                  onClick={() => onToggleRegion('head')}
                />

                {/* Chest */}
                <path
                  d="M 68 70 L 132 70 L 126 112 L 74 112 Z"
                  rx="6"
                  className={getFillClass('chest')}
                  onClick={() => onToggleRegion('chest')}
                />

                {/* Abdomen */}
                <path
                  d="M 74 114 L 126 114 L 122 152 L 78 152 Z"
                  className={getFillClass('abdomen')}
                  onClick={() => onToggleRegion('abdomen')}
                />

                {/* Left Arm */}
                <path
                  d="M 66 72 L 48 118 L 38 160 L 48 162 L 58 122 L 70 82 Z"
                  className={getFillClass('arms')}
                  onClick={() => onToggleRegion('arms')}
                />

                {/* Right Arm */}
                <path
                  d="M 134 72 L 152 118 L 162 160 L 152 162 L 142 122 L 130 82 Z"
                  className={getFillClass('arms')}
                  onClick={() => onToggleRegion('arms')}
                />

                {/* Pelvis base */}
                <path
                  d="M 78 153 L 122 153 L 116 174 L 84 174 Z"
                  className={getFillClass('abdomen')}
                  onClick={() => onToggleRegion('abdomen')}
                />

                {/* Left Leg */}
                <path
                  d="M 83 175 L 75 230 L 73 282 L 87 282 L 95 232 L 98 175 Z"
                  className={getFillClass('legs')}
                  onClick={() => onToggleRegion('legs')}
                />

                {/* Right Leg */}
                <path
                  d="M 117 175 L 125 230 L 127 282 L 113 282 L 105 232 L 102 175 Z"
                  className={getFillClass('legs')}
                  onClick={() => onToggleRegion('legs')}
                />
              </g>
            ) : (
              // BACK VIEW
              <g id="body-map-back">
                {/* Head (Back) */}
                <circle
                  cx="100"
                  cy="35"
                  r="22"
                  className={getFillClass('head')}
                  onClick={() => onToggleRegion('head')}
                />
                {/* Cervical / Neck */}
                <rect
                  x="93"
                  y="57"
                  width="14"
                  height="12"
                  rx="2"
                  className={getFillClass('back')}
                  onClick={() => onToggleRegion('back')}
                />

                {/* Upper Back / Scapula */}
                <path
                  d="M 68 70 L 132 70 L 126 112 L 74 112 Z"
                  className={getFillClass('back')}
                  onClick={() => onToggleRegion('back')}
                />

                {/* Lower Back / Lumbar */}
                <path
                  d="M 74 114 L 126 114 L 122 152 L 78 152 Z"
                  className={getFillClass('back')}
                  onClick={() => onToggleRegion('back')}
                />

                {/* Left Arm (Back) */}
                <path
                  d="M 66 72 L 48 118 L 38 160 L 48 162 L 58 122 L 70 82 Z"
                  className={getFillClass('arms')}
                  onClick={() => onToggleRegion('arms')}
                />

                {/* Right Arm (Back) */}
                <path
                  d="M 134 72 L 152 118 L 162 160 L 152 162 L 142 122 L 130 82 Z"
                  className={getFillClass('arms')}
                  onClick={() => onToggleRegion('arms')}
                />

                {/* Buttocks / Sacrum */}
                <path
                  d="M 78 153 L 122 153 L 116 174 L 84 174 Z"
                  className={getFillClass('back')}
                  onClick={() => onToggleRegion('back')}
                />

                {/* Left Leg (Back) */}
                <path
                  d="M 83 175 L 75 230 L 73 282 L 87 282 L 95 232 L 98 175 Z"
                  className={getFillClass('legs')}
                  onClick={() => onToggleRegion('legs')}
                />

                {/* Right Leg (Back) */}
                <path
                  d="M 117 175 L 125 230 L 127 282 L 113 282 L 105 232 L 102 175 Z"
                  className={getFillClass('legs')}
                  onClick={() => onToggleRegion('legs')}
                />
              </g>
            )}
          </svg>
        </div>

        {/* Region selector buttons */}
        <div className="sm:col-span-6 space-y-2">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Select or Tap Regions:
          </p>
          {(['head', 'chest', 'abdomen', 'back', 'arms', 'legs'] as BodyRegion[]).map((reg) => {
            const active = isSelected(reg);
            const label = regionLabels[reg][language] || regionLabels[reg].en;
            return (
              <button
                key={reg}
                type="button"
                id={`btn-region-${reg}`}
                onClick={() => onToggleRegion(reg)}
                className={`w-full text-left px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                  active
                    ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      active ? 'bg-teal-600 ring-2 ring-teal-200' : 'bg-slate-300'
                    }`}
                  />
                  <span>{label}</span>
                </div>
                {active && <Check className="w-4 h-4 text-teal-600 stroke-[3]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected tags summary */}
      {selectedRegions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-500">Selected:</span>
          {selectedRegions.map((reg) => (
            <span
              key={reg}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800"
            >
              {regionLabels[reg][language] || regionLabels[reg].en}
              <button
                type="button"
                onClick={() => onToggleRegion(reg)}
                className="hover:text-teal-950 font-bold ml-0.5"
                title="Remove region"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
