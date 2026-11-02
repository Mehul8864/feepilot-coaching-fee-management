/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FeePilot - Root Application & Authentication Routing
 * Client: Company A, Jaipur
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { ParentPortalView } from './components/portal/ParentPortalView';
import { StaffDashboardView } from './components/portal/StaffDashboardView';
import { AccessDeniedPage } from './components/auth/AccessDeniedPage';
import { Milestone1Testbench } from './components/testbench/Milestone1Testbench';
import { RefreshCw, ShieldCheck } from 'lucide-react';

function AppContent() {
  const { currentUser, userProfile, role, loading } = useAuth();
  const [activeView, setActiveView] = useState<'PORTAL' | 'TESTBENCH'>('PORTAL');

  // If user requested to view Milestone 1 testbench
  if (activeView === 'TESTBENCH') {
    return <Milestone1Testbench onReturnToPortal={() => setActiveView('PORTAL')} />;
  }

  // Initial authentication synchronization state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-12 h-12 rounded-xl bg-teal-500 text-slate-950 flex items-center justify-center font-black text-xl mb-4 shadow-lg shadow-teal-500/20">
          FP
        </div>
        <div className="flex items-center gap-2 text-teal-400 text-sm font-semibold mb-1">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Synchronizing FeePilot Secure Session...</span>
        </div>
        <p className="text-xs text-slate-400 font-mono">
          Firebase Auth & Firestore (asia-south1)
        </p>
      </div>
    );
  }

  // Unauthenticated -> Show Premium Login Page
  if (!currentUser && !userProfile) {
    return <LoginPage onOpenTestbench={() => setActiveView('TESTBENCH')} />;
  }

  // Authenticated Role Routing
  if (role === 'PARENT') {
    return <ParentPortalView onOpenTestbench={() => setActiveView('TESTBENCH')} />;
  }

  if (role === 'ACCOUNTS_EXECUTIVE') {
    return <StaffDashboardView onOpenTestbench={() => setActiveView('TESTBENCH')} />;
  }

  // Access Denied if unknown or mismatched role
  return <AccessDeniedPage onBackToLogin={() => setActiveView('PORTAL')} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
