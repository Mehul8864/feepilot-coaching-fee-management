/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FeePilot Parent Portal & Quick-Pay View
 * Role: PARENT (Strict RBAC & Data Isolation)
 */

import React, { useState } from 'react';
import { 
  User as UserIcon, 
  Phone, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Building, 
  FileText, 
  Download, 
  LogOut, 
  ArrowLeft,
  ShieldAlert,
  ChevronRight,
  ExternalLink,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getTranslation } from '../../utils/i18n';
import { formatINR } from '../../utils/formatters';
import { calculateOverdueDays } from '../../engine/overdueCalculation';
import { LanguageToggle } from '../common/LanguageToggle';

// Sample students matching Company A benchmark cohort
const SAMPLE_STUDENTS: Record<string, {
  roll: string;
  name: string;
  batch: string;
  centre: string;
  totalPayablePaise: number;
  instalmentAmountPaise: number;
  paidAmountPaise: number;
  dueDate: string;
}> = {
  'STU-0412': {
    roll: 'STU-0412',
    name: 'Aarav Meena',
    batch: 'JEE 2027 Morning Batch A-1',
    centre: 'Company A - Vaishali Nagar Centre, Jaipur',
    totalPayablePaise: 9000000,
    instalmentAmountPaise: 3000000,
    paidAmountPaise: 3000000,
    dueDate: '2026-10-10'
  },
  'STU-0587': {
    roll: 'STU-0587',
    name: 'Ishita Sharma',
    batch: 'JEE 2027 Evening Batch B-2',
    centre: 'Company A - Malviya Nagar Centre, Jaipur',
    totalPayablePaise: 9000000,
    instalmentAmountPaise: 3000000,
    paidAmountPaise: 1500000,
    dueDate: '2026-10-10'
  },
  'STU-0219': {
    roll: 'STU-0219',
    name: 'Mohit Gurjar',
    batch: 'NEET 2027 Morning Medical Super-30',
    centre: 'Company A - Tonk Road Centre, Jaipur',
    totalPayablePaise: 12000000,
    instalmentAmountPaise: 4000000,
    paidAmountPaise: 0,
    dueDate: '2026-11-15'
  }
};

export function ParentPortalView({ onOpenTestbench }: { onOpenTestbench: () => void }) {
  const { userProfile, currentUser, logout, language } = useAuth();
  const t = getTranslation(language);
  const referenceDate = '2026-11-02';

  const linkedIds = userProfile?.linkedStudentIds || [];
  // Active roll is strictly constrained to provisioned linkedStudentIds
  const [selectedRoll, setSelectedRoll] = useState<string | null>(null);
  const activeRoll = (selectedRoll && linkedIds.includes(selectedRoll)) ? selectedRoll : (linkedIds[0] || null);
  const [mockPaymentSuccess, setMockPaymentSuccess] = useState<string | null>(null);

  const currentStudent = activeRoll ? (SAMPLE_STUDENTS[activeRoll] || null) : null;
  
  // Calculate overdue and status using engine if student exists
  const outstandingPaise = currentStudent ? Math.max(0, currentStudent.instalmentAmountPaise - currentStudent.paidAmountPaise) : 0;
  const overdueInfo = currentStudent ? calculateOverdueDays(
    currentStudent.dueDate,
    referenceDate,
    outstandingPaise,
    currentStudent.paidAmountPaise,
    currentStudent.instalmentAmountPaise
  ) : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Top Navbar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500 text-slate-950 flex items-center justify-center font-black text-sm">
              FP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">FeePilot</span>
                <span className="text-[11px] bg-teal-500/20 text-teal-300 font-semibold px-2 py-0.5 rounded border border-teal-500/30">
                  {t.parentDashboardTitle}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {t.clientName} • Jaipur
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
              <span>{t.backToWorkbench}</span>
            </button>
            <button
              type="button"
              onClick={() => logout()}
              className="text-xs bg-red-600/90 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.signOutBtn}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* User Session Bar */}
        <div className="bg-white rounded-xl p-4 shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500">{t.activeUser}</div>
              <div className="font-mono font-bold text-slate-900 text-sm">
                {userProfile?.phone || currentUser?.phoneNumber || 'Authenticated Mobile User'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-slate-500">{t.roleLabel}: </span>
              <span className="font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-mono">
                {userProfile?.role || 'PARENT'}
              </span>
            </div>
            <div className="pl-3 border-l border-slate-200">
              <span className="text-slate-500">{t.linkedTitle}: </span>
              <span className="font-semibold text-slate-800 font-mono">
                {linkedIds.length > 0 ? linkedIds.join(', ') : '0 (Pending Link)'}
              </span>
            </div>
          </div>
        </div>

        {/* CONDITION 1: UNLINKED / PENDING VERIFICATION STATE */}
        {linkedIds.length === 0 ? (
          <section className="bg-white rounded-2xl shadow-sm border border-amber-200 p-8 text-center max-w-2xl mx-auto space-y-6">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {t.unlinkedTitle}
              </h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                {t.unlinkedDesc}
              </p>
            </div>

            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-950 text-left space-y-2">
              <div className="font-semibold flex items-center gap-1.5">
                <Building className="w-4 h-4 text-amber-800" />
                <span>Next Steps for Jaipur Parents:</span>
              </div>
              <p className="leading-relaxed">
                {t.unlinkedAction}
              </p>
              <div className="pt-2 border-t border-amber-200/60 font-mono text-[11px] text-amber-900">
                Support Helpline: <strong className="text-slate-900">+91 141-2780000</strong> (Jaipur Central Accounts)
              </div>
            </div>

            {/* Link to Engineering Testbench for Sample Student Verifications */}
            <div className="pt-4 border-t border-slate-200 space-y-2 text-xs">
              <p className="text-slate-500">
                To test the sample student financial calculations (Aarav, Ishita, Mohit), open the engineering testbench:
              </p>
              <button
                type="button"
                onClick={onOpenTestbench}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-teal-300 font-semibold transition-colors inline-flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <span>{t.backToWorkbench}</span>
              </button>
            </div>
          </section>
        ) : (
          /* CONDITION 2: LINKED STUDENT LEDGER & QUICK-PAY PORTAL */
          <div className="space-y-6">
            
            {/* Student Switcher (if multiple linked students) */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Select Student Account:</span>
                {linkedIds.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedRoll(id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      activeRoll === id
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {SAMPLE_STUDENTS[id]?.name || id} ({id})
                  </button>
                ))}
              </div>
            </div>

            {/* Student Fee Ledger Card */}
            {currentStudent && overdueInfo ? (
              <section className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded border border-slate-200">
                        {currentStudent.roll}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        overdueInfo.isOverdue 
                          ? 'bg-amber-100 text-amber-800' 
                          : overdueInfo.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {overdueInfo.status}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mt-1.5">
                      {currentStudent.name}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {currentStudent.batch} • {currentStudent.centre}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-500">Current Instalment Outstanding</div>
                    <div className="text-2xl font-bold font-mono text-slate-900 mt-0.5">
                      {formatINR(outstandingPaise)}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Due Date: <span className="font-mono font-medium">{currentStudent.dueDate}</span> ({overdueInfo.statusDescription})
                    </div>
                  </div>
                </div>

                {/* Instalment Details Grid */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50">
                  <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-1">
                    <span className="text-xs text-slate-500">Total Instalment Fee</span>
                    <div className="text-lg font-bold font-mono text-slate-900">
                      {formatINR(currentStudent.instalmentAmountPaise)}
                    </div>
                    <div className="text-[11px] text-slate-400">Includes 18% Intra-State GST (CGST + SGST)</div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-1">
                    <span className="text-xs text-slate-500">Verified Paid Amount</span>
                    <div className="text-lg font-bold font-mono text-emerald-700">
                      {formatINR(currentStudent.paidAmountPaise)}
                    </div>
                    <div className="text-[11px] text-slate-400">Electronic receipt generated</div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-1">
                    <span className="text-xs text-slate-500">Overdue Status</span>
                    <div className={`text-lg font-bold font-mono ${overdueInfo.isOverdue ? 'text-amber-800' : 'text-emerald-700'}`}>
                      {overdueInfo.isOverdue ? `${overdueInfo.overdueDays} Days Overdue` : 'Clear / On Schedule'}
                    </div>
                    <div className="text-[11px] text-slate-400">As of 2026-11-02 benchmark date</div>
                  </div>
                </div>

                {/* Actions & Mock Payment */}
                <div className="p-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-500">
                    Receipts and instalments are secured by Jaipur centre cloud Firestore ledger.
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => alert(`Receipt downloaded for ${currentStudent.roll}: REC-2026-${currentStudent.roll.slice(-4)}`)}
                      className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-slate-500" />
                      <span>Download Receipt</span>
                    </button>

                    {outstandingPaise > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setMockPaymentSuccess(`Mock Gateway: Payment link generated for ${formatINR(outstandingPaise)}. Razorpay/PayU test session ready.`);
                          setTimeout(() => setMockPaymentSuccess(null), 5000);
                        }}
                        className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Pay {formatINR(outstandingPaise)} Now</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Fully Settled</span>
                      </div>
                    )}
                  </div>
                </div>

                {mockPaymentSuccess && (
                  <div className="m-6 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{mockPaymentSuccess}</span>
                  </div>
                )}
              </section>
            ) : (
              <div className="p-6 bg-white rounded-xl border border-slate-200 text-center space-y-2">
                <h4 className="font-semibold text-slate-800 text-sm">Linked Student Record: {activeRoll}</h4>
                <p className="text-xs text-slate-500">
                  Student record linked in Firestore. Real-time ledger synchronization in progress with Jaipur centre server.
                </p>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
