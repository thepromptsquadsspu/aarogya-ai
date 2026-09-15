import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Phone,
  Navigation,
  ShieldAlert,
  Clock,
  Activity,
  X,
  RefreshCw,
  LocateFixed,
  AlertCircle,
  ExternalLink,
  Compass,
  Building2,
  PhoneCall,
  CheckCircle2,
} from 'lucide-react';
import { HospitalLocation, fetchNearbyHospitals } from '../services/triageApi';

interface NearbyHospitalsMapProps {
  isOpen: boolean;
  onClose: () => void;
  userLat?: number;
  userLon?: number;
  emergencyReason?: string;
}

// Major predefined Indian hubs if GPS is denied or unavailable
const PRESET_CITIES = [
  { name: 'Pune (Default)', lat: 18.5204, lon: 73.8567 },
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
  { name: 'Delhi NCR', lat: 28.6139, lon: 77.2090 },
  { name: 'Bengaluru', lat: 12.9716, lon: 77.5946 },
];

export const NearbyHospitalsMap: React.FC<NearbyHospitalsMapProps> = ({
  isOpen,
  onClose,
  userLat: initialLat,
  userLon: initialLon,
  emergencyReason,
}) => {
  const [currentLat, setCurrentLat] = useState<number>(initialLat || 18.5204);
  const [currentLon, setCurrentLon] = useState<number>(initialLon || 73.8567);
  const [locationSource, setLocationSource] = useState<'gps' | 'preset' | 'default'>('default');
  const [hospitals, setHospitals] = useState<HospitalLocation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedHospital, setSelectedHospital] = useState<HospitalLocation | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Detect browser GPS
  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser. Using city default.');
      return;
    }

    setLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setCurrentLat(lat);
        setCurrentLon(lon);
        setLocationSource('gps');
        loadHospitals(lat, lon);
      },
      (error) => {
        console.warn('Geolocation error:', error.message);
        setGpsError('Location access not permitted. Showing hospitals in Pune region.');
        setLocationSource('preset');
        loadHospitals(currentLat, currentLon);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const loadHospitals = async (lat: number, lon: number) => {
    setLoading(true);
    try {
      const data = await fetchNearbyHospitals(lat, lon);
      setHospitals(data);
      if (data.length > 0) {
        setSelectedHospital(data[0]);
      }
    } catch (err) {
      console.error('Failed to load hospitals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      detectLocation();
    }
  }, [isOpen]);

  // Compute map bounding box and marker coordinate projections
  const mapBounds = useMemo(() => {
    if (hospitals.length === 0) {
      return { minLat: currentLat - 0.05, maxLat: currentLat + 0.05, minLon: currentLon - 0.05, maxLon: currentLon + 0.05 };
    }
    const allLats = [currentLat, ...hospitals.map((h) => h.lat)];
    const allLons = [currentLon, ...hospitals.map((h) => h.lon)];
    return {
      minLat: Math.min(...allLats) - 0.015,
      maxLat: Math.max(...allLats) + 0.015,
      minLon: Math.min(...allLons) - 0.015,
      maxLon: Math.max(...allLons) + 0.015,
    };
  }, [hospitals, currentLat, currentLon]);

  // Project lat/lon to SVG 0-100 percentage coordinates
  const project = (lat: number, lon: number) => {
    const { minLat, maxLat, minLon, maxLon } = mapBounds;
    const x = ((lon - minLon) / (maxLon - minLon || 1)) * 100;
    const y = 100 - ((lat - minLat) / (maxLat - minLat || 1)) * 100;
    return {
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y)),
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Nearby Emergency Hospitals & Trauma Centers
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-400 border border-rose-800/50 text-[10px] font-bold uppercase tracking-wider">
                  24/7 ER Active
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {emergencyReason
                  ? `Immediate medical triage required: ${emergencyReason}`
                  : 'Live geodesic distance, emergency ward status, and turn-by-turn routing'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Location Sub-Bar */}
        <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <LocateFixed className={`w-3.5 h-3.5 ${locationSource === 'gps' ? 'text-teal-400' : 'text-amber-400'}`} />
            <span>
              Location:{' '}
              <strong className="text-white font-mono">
                {currentLat.toFixed(4)}° N, {currentLon.toFixed(4)}° E
              </strong>{' '}
              ({locationSource === 'gps' ? 'Device GPS' : 'Regional Default'})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={detectLocation}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-medium border border-slate-700 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-teal-400' : ''}`} />
              <span>Update GPS</span>
            </button>

            {/* City Preset Dropdown */}
            <select
              value={currentLat}
              onChange={(e) => {
                const city = PRESET_CITIES.find((c) => c.lat.toString() === e.target.value);
                if (city) {
                  setCurrentLat(city.lat);
                  setCurrentLon(city.lon);
                  setLocationSource('preset');
                  loadHospitals(city.lat, city.lon);
                }
              }}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-[11px] rounded-lg px-2 py-1 outline-hidden cursor-pointer"
            >
              {PRESET_CITIES.map((c) => (
                <option key={c.name} value={c.lat}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error Banner if any */}
        {gpsError && (
          <div className="px-4 py-1.5 bg-amber-950/40 border-b border-amber-800/40 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{gpsError}</span>
          </div>
        )}

        {/* Body: Map & Hospitals Split Layout */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
          {/* Interactive Medical Radar Map (7 Cols on desktop) */}
          <div className="lg:col-span-7 bg-slate-950 p-3 flex flex-col relative border-b lg:border-b-0 lg:border-r border-slate-800 overflow-hidden">
            {/* Map Header Overlay */}
            <div className="absolute top-5 left-5 z-10 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-md flex items-center gap-2 text-xs text-slate-300">
              <Compass className="w-4 h-4 text-teal-400" />
              <span>
                Discovered <strong className="text-white">{hospitals.length} Real Emergency Centers</strong>
              </span>
            </div>

            {/* SVG Interactive Clinical Geo-Canvas */}
            <div className="w-full h-64 sm:h-80 lg:h-full min-h-[260px] bg-radial from-slate-900 to-slate-950 rounded-xl border border-slate-800/80 relative overflow-hidden flex items-center justify-center">
              {/* Radar Grid Lines */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />

              {/* Concentric distance range rings */}
              <div className="absolute w-40 h-40 rounded-full border border-teal-500/20 pointer-events-none" />
              <div className="absolute w-72 h-72 rounded-full border border-teal-500/15 pointer-events-none" />
              <div className="absolute w-96 h-96 rounded-full border border-teal-500/10 pointer-events-none" />

              {/* SVG Markers Layer */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {/* Distance Connector line to selected hospital */}
                {selectedHospital && (
                  (() => {
                    const u = project(currentLat, currentLon);
                    const h = project(selectedHospital.lat, selectedHospital.lon);
                    return (
                      <line
                        x1={`${u.x}%`}
                        y1={`${u.y}%`}
                        x2={`${h.x}%`}
                        y2={`${h.y}%`}
                        stroke="#f43f5e"
                        strokeWidth="2"
                        strokeDasharray="4,4"
                        className="animate-pulse"
                      />
                    );
                  })()
                )}
              </svg>

              {/* Patient Location Beacon */}
              {(() => {
                const u = project(currentLat, currentLon);
                return (
                  <div
                    style={{ left: `${u.x}%`, top: `${u.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-auto"
                    title={`You are here (${currentLat.toFixed(3)}, ${currentLon.toFixed(3)})`}
                  >
                    <div className="relative flex h-5 w-5 items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-teal-400 border-2 border-slate-900 shadow-md"></span>
                    </div>
                    <span className="mt-1 px-1.5 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap shadow-md">
                      You
                    </span>
                  </div>
                );
              })()}

              {/* Hospital Location Markers */}
              {hospitals.map((h) => {
                const pos = project(h.lat, h.lon);
                const isSelected = selectedHospital?.id === h.id;

                return (
                  <div
                    key={h.id}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    onClick={() => setSelectedHospital(h)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer group transition-transform hover:scale-110"
                    title={`${h.name} (${h.distance_km} km)`}
                  >
                    <div
                      className={`relative p-1.5 rounded-full border shadow-xl transition-all ${
                        isSelected
                          ? 'bg-rose-600 border-white text-white ring-4 ring-rose-500/40 scale-125'
                          : 'bg-slate-900 border-rose-500/80 text-rose-400 hover:bg-rose-950'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    {/* Floating Pill on Selection */}
                    {isSelected && (
                      <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-rose-950/90 text-rose-200 border border-rose-700/80 px-2 py-0.5 rounded text-[10px] font-bold shadow-lg flex items-center gap-1 z-40">
                        <span>{h.distance_km} km</span>
                        <span>&bull;</span>
                        <span>{h.drive_time_min}m</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Open in Google Maps Full Canvas Button */}
              <div className="absolute bottom-3 right-3 z-10">
                <a
                  href={`https://www.google.com/maps/search/hospitals+emergency/@${currentLat},${currentLon},13z`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700 shadow-lg transition-all"
                >
                  <ExternalLink className="w-3 h-3 text-teal-400" />
                  <span>Google Maps View</span>
                </a>
              </div>
            </div>
          </div>

          {/* Sorted Emergency Facilities List (5 Cols on desktop) */}
          <div className="lg:col-span-5 flex flex-col bg-slate-900 min-h-0">
            <div className="p-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 uppercase tracking-wider">
                Closest Trauma Centers ({hospitals.length})
              </span>
              <span className="text-slate-400 text-[11px]">Ranked by Drive Time</span>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-slate-800/40">
              {loading ? (
                <div className="py-12 text-center text-slate-400 space-y-2 text-xs">
                  <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p>Discovering real verified hospitals & computing routes...</p>
                </div>
              ) : hospitals.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs space-y-1">
                  <Building2 className="w-8 h-8 text-slate-600 mx-auto" />
                  <p>No trauma centers discovered in radius.</p>
                  <p className="text-[11px] text-slate-500">Call national helpline directly:</p>
                  <a
                    href="tel:108"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold mt-2"
                  >
                    <PhoneCall className="w-3.5 h-3.5" /> Call 108
                  </a>
                </div>
              ) : (
                hospitals.map((h, index) => {
                  const isSelected = selectedHospital?.id === h.id;
                  const isClosest = index === 0;

                  return (
                    <div
                      key={h.id}
                      onClick={() => setSelectedHospital(h)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800/90 border-teal-500/80 shadow-md ring-1 ring-teal-500/50'
                          : 'bg-slate-950/40 hover:bg-slate-800/40 border-slate-800/80'
                      }`}
                    >
                      {/* Top status bar */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          {isClosest && (
                            <span className="inline-block px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/80 text-[9px] font-bold uppercase tracking-wider mb-1">
                              Closest Emergency Facility
                            </span>
                          )}
                          <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">
                            {h.name}
                          </h4>
                          <p className="text-[11px] text-teal-400 mt-0.5">{h.type}</p>
                        </div>

                        {/* Distance & Time pill */}
                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-slate-100 font-mono">
                            {h.distance_km} km
                          </div>
                          <div className="text-[10px] text-emerald-400 flex items-center justify-end gap-1 font-mono">
                            <Clock className="w-2.5 h-2.5" />
                            ~{h.drive_time_min} min
                          </div>
                        </div>
                      </div>

                      {/* Address */}
                      <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-1">
                        {h.address}
                      </p>

                      {/* Capabilities pills */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {h.has_icu && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-medium border border-slate-700">
                            ICU Ready
                          </span>
                        )}
                        {h.has_cath_lab && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300 text-[10px] font-medium border border-rose-800/50">
                            Cardiac Cath Lab
                          </span>
                        )}
                        {h.open_24_7 && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 text-[10px] font-medium border border-emerald-800/50">
                            24/7 Casualty
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-800/60">
                        <a
                          href={`tel:${h.emergency_phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call {h.emergency_phone}</span>
                        </a>

                        <a
                          href={h.directions_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-all"
                        >
                          <Navigation className="w-3.5 h-3.5 text-teal-400" />
                          <span>Directions</span>
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Emergency Helpline Strip */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
              <a
                href="tel:108"
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 text-center"
              >
                <PhoneCall className="w-4 h-4 animate-pulse" />
                <span>Call 108 Ambulance (Free)</span>
              </a>
              <a
                href="tel:112"
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5"
              >
                <span>112</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
