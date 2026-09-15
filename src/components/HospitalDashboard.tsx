import React, { useState, useMemo } from 'react';
import { useTriage } from '../context/TriageContext';
import { HospitalPatient, PatientStatus, ESILevel } from '../types';
import {
  Users,
  ShieldAlert,
  Clock,
  Activity,
  Search,
  Filter,
  X,
  Stethoscope,
  HeartPulse,
  Droplets,
  Thermometer,
  FileText,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Bed,
  PhoneCall,
} from 'lucide-react';

export const HospitalDashboard: React.FC = () => {
  const {
    hospitalQueue,
    updatePatientStatus,
    selectedPatientForDetail,
    setSelectedPatientForDetail,
  } = useTriage();

  const [searchQuery, setSearchQuery] = useState('');
  const [esiFilter, setEsiFilter] = useState<'all' | 'critical' | '3' | 'non_urgent'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | PatientStatus>('all');

  // Stats calculation
  const totalPatients = hospitalQueue.length;
  const criticalCount = hospitalQueue.filter(
    (p) => p.esiLevel <= 2 && p.status !== 'Discharged'
  ).length;

  const waitingPatients = hospitalQueue.filter((p) => p.status === 'Waiting');
  const averageWaitTime = useMemo(() => {
    if (waitingPatients.length === 0) return 0;
    const totalMin = waitingPatients.reduce((acc, p) => {
      const wait = p.waitMinutes ?? Math.round((Date.now() - p.arrivalTime) / 60000);
      return acc + Math.max(wait, 0);
    }, 0);
    return Math.round(totalMin / waitingPatients.length);
  }, [waitingPatients]);

  const inTreatmentCount = hospitalQueue.filter((p) => p.status === 'In Treatment').length;

  // Filter & Search
  const filteredQueue = useMemo(() => {
    return hospitalQueue.filter((p) => {
      // ESI Filter
      if (esiFilter === 'critical' && p.esiLevel > 2) return false;
      if (esiFilter === '3' && p.esiLevel !== 3) return false;
      if (esiFilter === 'non_urgent' && p.esiLevel < 4) return false;

      // Status Filter
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchComplaint = p.chiefComplaint.toLowerCase().includes(q);
        const matchToken = p.token.toLowerCase().includes(q);
        return matchName || matchComplaint || matchToken;
      }

      return true;
    });
  }, [hospitalQueue, esiFilter, statusFilter, searchQuery]);

  const getEsiBadge = (level: ESILevel) => {
    switch (level) {
      case 1:
        return 'bg-red-600 text-white border-red-700';
      case 2:
        return 'bg-orange-500 text-white border-orange-600';
      case 3:
        return 'bg-amber-400 text-slate-900 border-amber-500';
      case 4:
        return 'bg-emerald-600 text-white border-emerald-700';
      case 5:
        return 'bg-blue-600 text-white border-blue-700';
    }
  };

  const getEsiCardBorder = (level: ESILevel) => {
    switch (level) {
      case 1:
        return 'border-l-4 border-l-red-600';
      case 2:
        return 'border-l-4 border-l-orange-500';
      case 3:
        return 'border-l-4 border-l-amber-400';
      case 4:
        return 'border-l-4 border-l-emerald-600';
      case 5:
        return 'border-l-4 border-l-blue-600';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 space-y-5">
      {/* Top Stat Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Patients */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Total ER Patients
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
              {totalPatients}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Live admissions today
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Critical Count (ESI 1 & 2) */}
        <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider block">
                Critical (ESI 1 & 2)
              </span>
              {criticalCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
              )}
            </div>
            <span className="text-2xl sm:text-3xl font-bold text-rose-950 leading-tight">
              {criticalCount}
            </span>
            <span className="text-[11px] text-rose-700 block mt-0.5 font-medium">
              Immediate / Emergent
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* Average Wait Time */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Avg ER Wait Time
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
                {averageWaitTime}
              </span>
              <span className="text-xs font-semibold text-slate-500">mins</span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Target &lt; 20m for ESI 1-3
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Treatment Velocity / In Treatment */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Active In Treatment
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-teal-900 leading-tight">
              {inTreatmentCount}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Doctors & trauma bays assigned
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center">
            <Bed className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-hospital-search"
              type="text"
              placeholder="Search by name, token (#AR-101) or symptom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 focus:border-teal-600 focus:bg-white rounded-xl pl-9 pr-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>

          {/* ESI Level Filter */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto no-scrollbar">
            <span className="text-[11px] font-semibold text-slate-400 uppercase mr-1 hidden md:inline">
              Filter:
            </span>
            <button
              onClick={() => setEsiFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                esiFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              All Levels ({totalPatients})
            </button>
            <button
              onClick={() => setEsiFilter('critical')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1 ${
                esiFilter === 'critical'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <span>ESI 1 & 2 Critical</span>
            </button>
            <button
              onClick={() => setEsiFilter('3')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                esiFilter === '3'
                  ? 'bg-amber-500 text-slate-900 font-bold shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              ESI 3 Urgent
            </button>
            <button
              onClick={() => setEsiFilter('non_urgent')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                esiFilter === 'non_urgent'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              ESI 4 & 5
            </button>
          </div>
        </div>

        {/* Status Filter tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500">Status:</span>
          {(['all', 'Waiting', 'In Treatment', 'Discharged'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                statusFilter === st
                  ? 'bg-teal-100 text-teal-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {st === 'all' ? 'All Status' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Live ER Queue Board */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>Live Triage Queue</span>
            <span className="text-xs font-normal text-slate-500">
              (Sorted by ESI Level 1 ➔ 5, then Arrival Time)
            </span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Showing {filteredQueue.length} of {totalPatients}
          </span>
        </div>

        {filteredQueue.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
            No patients match the selected filter or search query.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredQueue.map((patient) => {
              const wait =
                patient.waitMinutes ??
                Math.round((Date.now() - patient.arrivalTime) / 60000);
              const isCrit = patient.esiLevel <= 2;

              return (
                <div
                  key={patient.id}
                  id={`patient-card-${patient.id}`}
                  onClick={() => setSelectedPatientForDetail(patient)}
                  className={`bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-all cursor-pointer ${getEsiCardBorder(
                    patient.esiLevel
                  )} relative group`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    {/* Token + Name + Demographics */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold font-mono border ${getEsiBadge(
                          patient.esiLevel
                        )}`}
                      >
                        ESI {patient.esiLevel}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                            {patient.name}
                          </h4>
                          <span className="text-xs text-slate-400 font-mono">
                            #{patient.token}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {patient.age}y, {patient.sex} • Lang: {patient.language.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Wait time pill */}
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{Math.max(wait, 0)}m wait</span>
                      </div>
                      {patient.bed && (
                        <span className="text-[10px] text-teal-700 font-medium block">
                          {patient.bed}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Chief Complaint */}
                  <p className="text-xs text-slate-700 font-medium line-clamp-2 mb-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    "{patient.chiefComplaint}"
                  </p>

                  {/* Vitals preview row */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-600 mb-3 flex-wrap">
                    {patient.vitals.spO2 && (
                      <span
                        className={`px-1.5 py-0.5 rounded font-medium ${
                          Number(patient.vitals.spO2) < 90
                            ? 'bg-rose-100 text-rose-800 font-bold'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        SpO2: {patient.vitals.spO2}%
                      </span>
                    )}
                    {patient.vitals.heartRate && (
                      <span
                        className={`px-1.5 py-0.5 rounded font-medium ${
                          Number(patient.vitals.heartRate) > 130
                            ? 'bg-rose-100 text-rose-800 font-bold'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        HR: {patient.vitals.heartRate}
                      </span>
                    )}
                    {patient.vitals.systolicBp && (
                      <span
                        className={`px-1.5 py-0.5 rounded font-medium ${
                          Number(patient.vitals.systolicBp) < 90
                            ? 'bg-rose-100 text-rose-800 font-bold'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        BP: {patient.vitals.systolicBp}/{patient.vitals.diastolicBp || '80'}
                      </span>
                    )}
                    {patient.triageResult.red_flags?.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px]">
                        {patient.triageResult.red_flags.length} Red Flag
                      </span>
                    )}
                  </div>

                  {/* Bottom bar: Status buttons */}
                  <div
                    className="flex items-center justify-between pt-2 border-t border-slate-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">
                      Status:
                    </span>
                    <div className="flex items-center gap-1">
                      {(['Waiting', 'In Treatment', 'Discharged'] as PatientStatus[]).map(
                        (st) => {
                          const isActive = patient.status === st;
                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() => updatePatientStatus(patient.id, st)}
                              className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                                isActive
                                  ? st === 'Waiting'
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : st === 'In Treatment'
                                    ? 'bg-teal-600 text-white shadow-xs'
                                    : 'bg-slate-200 text-slate-700'
                                  : 'text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              {st}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Patient Detail Drawer / Modal */}
      {selectedPatientForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-scaleUp">
            {/* Drawer Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`px-2.5 py-1 rounded-lg text-sm font-bold font-mono border ${getEsiBadge(
                    selectedPatientForDetail.esiLevel
                  )}`}
                >
                  ESI {selectedPatientForDetail.esiLevel}
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedPatientForDetail.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Token #{selectedPatientForDetail.token} • {selectedPatientForDetail.age}y,{' '}
                    {selectedPatientForDetail.sex} •{' '}
                    {selectedPatientForDetail.language.toUpperCase()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedPatientForDetail(null)}
                className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700 font-bold transition-colors"
                title="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {/* Urgency & Recommended Action */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Triage Classification
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {selectedPatientForDetail.triageResult.urgency_label}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Action Mandate
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded bg-teal-100 text-teal-800">
                    {selectedPatientForDetail.triageResult.next_action}
                  </span>
                </div>
              </div>

              {/* Red flags */}
              {selectedPatientForDetail.triageResult.red_flags?.length > 0 && (
                <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200">
                  <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5 mb-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>Deterministic Red Flags (Safety Locked):</span>
                  </h4>
                  <ul className="list-disc list-inside text-xs text-rose-800 space-y-0.5">
                    {selectedPatientForDetail.triageResult.red_flags.map((f, i) => (
                      <li key={i} className="font-semibold">
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Explainable AI Clinical Reasoning */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  <span>Explainable AI Clinical Reasoning:</span>
                </h4>
                <div className="space-y-1.5">
                  {selectedPatientForDetail.triageResult.reasoning.map((r, i) => (
                    <div
                      key={i}
                      className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-start gap-2"
                    >
                      <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vitals Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Recorded Vital Signs
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">SpO2</span>
                    <span className="text-sm font-bold text-slate-900">
                      {selectedPatientForDetail.vitals.spO2 || '--'}%
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Heart Rate</span>
                    <span className="text-sm font-bold text-slate-900">
                      {selectedPatientForDetail.vitals.heartRate || '--'} bpm
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Blood Pressure</span>
                    <span className="text-sm font-bold text-slate-900">
                      {selectedPatientForDetail.vitals.systolicBp || '--'}/
                      {selectedPatientForDetail.vitals.diastolicBp || '--'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Temperature</span>
                    <span className="text-sm font-bold text-slate-900">
                      {selectedPatientForDetail.vitals.temperature || '--'}°F
                    </span>
                  </div>
                </div>
              </div>

              {/* Chat Intake Transcript */}
              {selectedPatientForDetail.chatTranscript?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Intake Transcript ({selectedPatientForDetail.chatTranscript.length} entries)
                  </h4>
                  <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    {selectedPatientForDetail.chatTranscript.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-2 rounded-lg ${
                          msg.sender === 'user'
                            ? 'bg-indigo-50 text-indigo-900 ml-4'
                            : 'bg-white text-slate-800 border border-slate-200 mr-4'
                        }`}
                      >
                        <span className="font-bold text-[10px] uppercase block text-slate-400 mb-0.5">
                          {msg.sender === 'user' ? selectedPatientForDetail.name : 'Aarogya AI'}
                        </span>
                        <p>{msg.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Update Status:</span>
                {(['Waiting', 'In Treatment', 'Discharged'] as PatientStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => updatePatientStatus(selectedPatientForDetail.id, st)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedPatientForDetail.status === st
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setSelectedPatientForDetail(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
