/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FeePilot Premium SaaS Login View
 * Strictly separates Parent Phone OTP and Accounts Executive Email/Password authentication.
 */

import React, { useState } from 'react';
import { 
  Building2, 
  Smartphone, 
  Calculator, 
  ShieldCheck, 
  Sparkles,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { ParentPhoneLoginForm } from './ParentPhoneLoginForm';
import { StaffEmailLoginForm } from './StaffEmailLoginForm';
import { LanguageToggle } from '../common/LanguageToggle';
import { useAuth } from '../../context/AuthContext';
import { getTranslation } from '../../utils/i18n';

export function LoginPage({ onOpenTestbench }: { onOpenTestbench: () => void }) {
  const { language } = useAuth();
  const t = getTranslation(language);

  const [activeTab, setActiveTab] = useState<'PARENT' | 'STAFF'>('PARENT');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans antialiased text-slate-900">
      {/* Top Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500 text-slate-950 flex items-center justify-center font-black text-sm tracking-tighter">
              FP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">{t.appTitle}</span>
                <span className="hidden sm:inline-block text-[11px] bg-slate-800 text-slate-400 font-medium px-2 py-0.5 rounded border border-slate-700">
                  {t.clientName}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                {t.clientMeta}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            <button
              type="button"
              onClick={onOpenTestbench}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-teal-300 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">{t.engineConsole}</span>
              <span className="sm:hidden">Engine</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-lg">
          
          {/* Card Container */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden">
            
            {/* Top Brand Banner inside Card */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white text-center border-b border-slate-800">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 mb-3">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>Enterprise RBAC Security • Jaipur Cluster</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                FeePilot Secure Portal
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto leading-relaxed">
                {t.appSubtitle}
              </p>
            </div>

            {/* Role Tab Selector (STRICT: PARENT vs ACCOUNTS_EXECUTIVE) */}
            <div className="grid grid-cols-2 p-1.5 bg-slate-100/80 border-b border-slate-200 gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('PARENT')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'PARENT'
                    ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-4 h-4 text-teal-600" />
                <span className="truncate">{t.parentTab}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('STAFF')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'STAFF'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-4 h-4 text-slate-700" />
                <span className="truncate">{t.staffTab}</span>
              </button>
            </div>

            {/* Active Tab Form Body */}
            <div className="p-6 sm:p-8">
              {activeTab === 'PARENT' ? (
                <ParentPhoneLoginForm />
              ) : (
                <StaffEmailLoginForm />
              )}
            </div>

          </div>

          {/* Bottom Security Note */}
          <div className="mt-6 text-center text-xs text-slate-500 space-y-1">
            <p>
              Secured by Google Cloud Platform & Firebase Authentication (Mumbai, <code className="font-mono text-slate-700">asia-south1</code>).
            </p>
            <p className="text-[11px] text-slate-400">
              Company A, Jaipur • Vaishali Nagar • Malviya Nagar • Tonk Road • JLN Marg
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-[11px] py-4 border-t border-slate-800 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>FeePilot © 2026. Confidential Client System for Company A, Jaipur.</span>
          <div className="flex items-center gap-4">
            <span className="text-teal-400 font-medium">Integer Paise Engine</span>
            <span>•</span>
            <span className="text-slate-300">Intra-State GST Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
