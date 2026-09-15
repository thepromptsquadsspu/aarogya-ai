/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TriageProvider, useTriage } from './context/TriageContext';
import { TopNav } from './components/TopNav';
import { PatientView } from './components/PatientView';
import { HospitalDashboard } from './components/HospitalDashboard';

const AppContent: React.FC = () => {
  const { view } = useTriage();

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 flex flex-col font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* Universal Top Navigation with view switcher & emergency 108 shortcut */}
      <TopNav />

      {/* Main Content Area */}
      <main className="flex-1 w-full pb-12">
        {view === 'patient' ? (
          <div className="w-full">
            <PatientView />
          </div>
        ) : (
          <div className="w-full">
            <HospitalDashboard />
          </div>
        )}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <TriageProvider>
      <AppContent />
    </TriageProvider>
  );
}
