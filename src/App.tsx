/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TriageProvider, useTriage } from './context/TriageContext';
import { TopNav } from './components/TopNav';
import { PatientView } from './components/PatientView';
import { HospitalDashboard } from './components/HospitalDashboard';
import { LandingPage } from './components/LandingPage';
import { EmergencyContactsModal } from './components/EmergencyContactsModal';

const AppContent: React.FC = () => {
  const { view, setView, setStep } = useTriage();
  const [showContactsModal, setShowContactsModal] = useState(false);

  const handleStartChatFromLanding = () => {
    setView('patient');
    setStep('intake');
  };

  const handleOpenBodyMapFromLanding = () => {
    setView('patient');
    setStep('onboarding');
  };

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 flex flex-col font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* Universal Top Navigation */}
      <TopNav onOpenContacts={() => setShowContactsModal(true)} />

      {/* Main Content Area */}
      <main className="flex-1 w-full pb-12">
        {view === 'landing' && (
          <LandingPage
            onStartChat={handleStartChatFromLanding}
            onOpenBodyMap={handleOpenBodyMapFromLanding}
            onOpenContacts={() => setShowContactsModal(true)}
          />
        )}

        {view === 'patient' && (
          <div className="w-full">
            <PatientView />
          </div>
        )}

        {view === 'hospital' && (
          <div className="w-full">
            <HospitalDashboard />
          </div>
        )}
      </main>

      {/* Emergency Contacts Modal */}
      {showContactsModal && (
        <EmergencyContactsModal onClose={() => setShowContactsModal(false)} />
      )}
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
