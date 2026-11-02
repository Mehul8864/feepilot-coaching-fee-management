/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FeePilot Accounts Executive Console
 * Role: ACCOUNTS_EXECUTIVE (Strict Centre RBAC)
 */

import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Filter, 
  Calculator, 
  LogOut, 
  Clock, 
  FileSpreadsheet, 
  ArrowRight,
  ShieldCheck,
  Send,
  Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getTranslation } from '../../utils/i18n';
import { formatINR } from '../../utils/formatters';
import { LanguageToggle } from '../common/LanguageToggle';
import { calculateOverdueDays } from '../../engine/overdueCalculation';

export function StaffDashboardView({ onOpenTestbench }: { onOpenTestbench: () => void }) {
  const { userProfile, currentUser, logout, language } = useAuth();
  const t = getTranslation(language);
  const referenceDate = '2026-11-02';

  const authorizedCentres = (userProfile?.authorizedCentreIds && userProfile.authorizedCentreIds.length > 0)
    ? userProfile.authorizedCentreIds
    : ['CENTRE-JAIPUR-VAISHALI', 'CENTRE-JAIPUR-TONK', 'CENTRE-JAIPUR-MALVIYA', 'CENTRE-JAIPUR-VIDHYADHAR'];
  const [selectedCentre, setSelectedCentre] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const cohort = [
    {
      roll: 'STU-0412',
      name: 'Aarav Meena',
      parentPhone: '+1 650-555-3434',
      batch: 'JEE 2027 Morning',
      centreId: 'CENTRE-JAIPUR-VAISHALI',
      centreName: 'Vaishali Nagar, Jaipur',
      instalmentPaise: 3000000,
      paidPaise: 3000000,
      dueDate: '2026-10-10'
    },
    {
      roll: 'STU-0587',
      name: 'Ishita Sharma',
      parentPhone: '+91 98290 67890',
      batch: 'JEE 2027 Evening',
      centreId: 'CENTRE-JAIPUR-MALVIYA',
      centreName: 'Malviya Nagar, Jaipur',
      instalmentPaise: 3000000,
      paidPaise: 1500000,
      dueDate: '2026-10-10'
    },
    {
      roll: 'STU-0219',
      name: 'Mohit Gurjar',
      parentPhone: '+91 97840 54321',
      batch: 'NEET 2027 Morning',
      centreId: 'CENTRE-JAIPUR-TONK',
      centreName: 'Tonk Road, Jaipur',
      instalmentPaise: 4000000,
      paidPaise: 0,
      dueDate: '2026-11-15'
    }
  ];

  const filteredStudents = cohort.filter((s) => {
    const matchesCentre = selectedCentre === 'ALL' || s.centreId === selectedCentre;
    const matchesQuery = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         s.roll.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCentre && matchesQuery;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Top Header */}
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
                  {t.staffDashboardTitle}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {t.clientName} • Accounts Department
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            <button
              type="button"
              onClick={onOpenTestbench}
              className="text-xs bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>{t.engineConsole}</span>
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
        
        {/* Executive Profile Card */}
        <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Authenticated Staff:</span>
              <span className="font-bold text-slate-900 font-sans text-sm">
                {userProfile?.name || currentUser?.email || 'Accounts Executive (Jaipur)'}
              </span>
              <span className="font-mono text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded">
                ACCOUNTS_EXECUTIVE
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-500">{t.centreLabel}:</span>
              {authorizedCentres.map((centre) => (
                <span key={centre} className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                  {centre}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <Clock className="w-4 h-4 text-teal-600" />
            <span className="text-slate-500">Benchmark Audit Date:</span>
            <span className="font-mono font-bold text-slate-900">{referenceDate}</span>
          </div>
        </div>

        {/* Ledger Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-xs text-slate-500">Total Instalment Billed</span>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {formatINR(10000000)}
            </div>
            <p className="text-[11px] text-slate-400">Sample cohort active instalment total</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-xs text-slate-500">Total Realized Collections</span>
            <div className="text-2xl font-bold font-mono text-emerald-700">
              {formatINR(4500000)}
            </div>
            <p className="text-[11px] text-emerald-600">Verified via GST electronic receipting</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-xs text-slate-500">Total Outstanding Receivables</span>
            <div className="text-2xl font-bold font-mono text-amber-800">
              {formatINR(5500000)}
            </div>
            <p className="text-[11px] text-amber-700">₹15,000 overdue (Ishita) • ₹40,000 due soon</p>
          </div>
        </div>

        {/* Table & Filtering Section */}
        <section className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter student by name or roll number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={selectedCentre}
                onChange={(e) => setSelectedCentre(e.target.value)}
                className="text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="ALL">All Authorized Centres</option>
                {authorizedCentres.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Student & Roll No</th>
                  <th className="py-3 px-4">Centre & Batch</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Instalment Due</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Outstanding</th>
                  <th className="py-3 px-4 text-center">Ageing / Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => {
                  const outstanding = Math.max(0, s.instalmentPaise - s.paidPaise);
                  const overdue = calculateOverdueDays(s.dueDate, referenceDate, outstanding, s.paidPaise, s.instalmentPaise);
                  
                  return (
                    <tr key={s.roll} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{s.name}</div>
                        <div className="font-mono text-[11px] text-slate-500">{s.roll} • {s.parentPhone}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div>{s.batch}</div>
                        <div className="text-[11px] text-slate-400">{s.centreName}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {s.dueDate}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-right text-slate-900">
                        {formatINR(s.instalmentPaise)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-right text-emerald-700">
                        {formatINR(s.paidPaise)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-right text-slate-900">
                        {formatINR(outstanding)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          overdue.isOverdue
                            ? 'bg-amber-100 text-amber-900'
                            : overdue.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {overdue.status} ({overdue.statusDescription})
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
}
