/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FeePilot Student Ledger Drawer Component
 * Displays complete 3-instalment fee plan itemization, verified payments, GST breakdowns,
 * and reminder statuses for a selected student.
 */

import React from 'react';
import { 
  X, 
  User, 
  Building2, 
  GraduationCap, 
  Calendar, 
  CreditCard, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Receipt, 
  Bell, 
  ShieldCheck,
  Phone
} from 'lucide-react';
import { StudentLedgerRow } from '../../services/dashboardService';
import { formatINR } from '../../utils/formatters';

interface StudentLedgerDrawerProps {
  student: StudentLedgerRow | null;
  onClose: () => void;
}

export function StudentLedgerDrawer({ student, onClose }: StudentLedgerDrawerProps) {
  if (!student) return null;

  const plan = student.feePlan;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Drawer Header */}
        <div className="bg-slate-900 text-white p-6 sticky top-0 z-10 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500 text-slate-950 flex items-center justify-center font-bold text-base shadow-xs">
              {student.roll.slice(-2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="drawer-title" className="text-lg font-bold text-white tracking-tight">
                  {student.name}
                </h2>
                <span className="font-mono text-xs bg-teal-400/20 text-teal-300 font-bold px-2 py-0.5 rounded border border-teal-400/30">
                  {student.roll}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {student.batchName} • {student.centreName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close ledger"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1 text-xs text-slate-700">
          
          {/* Quick Contact & Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-[11px] text-slate-500 font-semibold">Parent Contact:</span>
              <div className="font-mono font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-teal-600" />
                <span>{student.maskedPhone}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 font-semibold">Active Instalment:</span>
              <div className="font-mono font-bold text-slate-900 mt-0.5">
                Instalment #{student.instalmentNumber}
              </div>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 font-semibold">Current Ledger Status:</span>
              <div className="mt-0.5">
                <span className={`inline-block px-2 py-0.5 rounded font-semibold text-[11px] ${
                  student.isOverdue
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : student.status === 'PAID'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-blue-100 text-blue-800 border border-blue-300'
                }`}>
                  {student.status}
                </span>
              </div>
            </div>
          </div>

          {/* Fee Plan Itemization */}
          {plan && (
            <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-teal-600" />
                  <h3 className="font-bold text-sm text-slate-900">Annual Fee Plan & Tax Breakdown</h3>
                </div>
                <span className="font-mono text-[11px] text-slate-500">ID: {plan.id}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-slate-500 text-[11px]">Gross Course Fee</span>
                  <div className="font-mono font-bold text-slate-900 mt-1">
                    {formatINR(plan.grossAmountPaise)}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-slate-500 text-[11px]">Scholarship/Rebate</span>
                  <div className="font-mono font-bold text-emerald-700 mt-1">
                    -{formatINR(plan.discountAmountPaise)}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-slate-500 text-[11px]">Total 18% GST</span>
                  <div className="font-mono font-bold text-slate-900 mt-1">
                    +{formatINR(plan.totalGstAmountPaise)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    CGST: {formatINR(plan.cgstAmountPaise)} | SGST: {formatINR(plan.sgstAmountPaise)}
                  </div>
                </div>

                <div className="bg-teal-50/70 p-3 rounded-lg border border-teal-200">
                  <span className="text-teal-800 font-semibold text-[11px]">Total Annual Payable</span>
                  <div className="font-mono font-bold text-teal-900 text-sm mt-1">
                    {formatINR(plan.totalPayablePaise)}
                  </div>
                  <div className="text-[10px] text-teal-700 mt-0.5">Across {plan.instalmentCount} instalments</div>
                </div>
              </div>

              {plan.discountReason && (
                <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <strong className="text-slate-700">Rebate Note:</strong> {plan.discountReason}
                </div>
              )}
            </section>
          )}

          {/* All 3 Scheduled Instalments */}
          <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                <h3 className="font-bold text-sm text-slate-900">Instalment Schedule & Balances</h3>
              </div>
              <span className="text-xs text-slate-500">{student.allInstalments.length} Total Instalments</span>
            </div>

            <div className="space-y-3">
              {student.allInstalments.map((inst) => {
                const balance = Math.max(0, inst.amountPaise - inst.paidAmountPaise);
                const isPaid = balance === 0;

                return (
                  <div 
                    key={inst.id} 
                    className={`p-3.5 rounded-xl border transition-colors ${
                      inst.id === student.activeInstalmentId 
                        ? 'border-teal-300 bg-teal-50/30 ring-1 ring-teal-400/40' 
                        : 'border-slate-200 bg-white hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          #{inst.instalmentNumber}
                        </span>
                        <span className="font-mono text-slate-600 text-xs">
                          Due: <strong>{inst.dueDate}</strong>
                        </span>
                        {inst.id === student.activeInstalmentId && (
                          <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.5 rounded">
                            ACTIVE CYCLE
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-right font-mono text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Total Due</span>
                          <span className="font-bold text-slate-900">{formatINR(inst.amountPaise)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Verified Paid</span>
                          <span className="font-bold text-emerald-700">{formatINR(inst.paidAmountPaise)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Balance</span>
                          <span className={`font-bold ${balance > 0 ? 'text-amber-800' : 'text-slate-400'}`}>
                            {formatINR(balance)}
                          </span>
                        </div>
                        <div>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : inst.isOverdue
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {inst.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Verified Payments History */}
          <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-teal-600" />
                <h3 className="font-bold text-sm text-slate-900">Verified Electronic Payments</h3>
              </div>
              <span className="text-xs text-slate-500 font-semibold text-emerald-700">
                {student.payments.length} Verified
              </span>
            </div>

            {student.payments.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-500">
                No electronic payments recorded yet for this student account.
              </div>
            ) : (
              <div className="space-y-2.5">
                {student.payments.map((p) => (
                  <div key={p.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-bold text-slate-900">{p.receiptNumber}</span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-sans font-medium">
                          {p.paymentMethod}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Ref: {p.transactionRef} • Paid: {p.paidAt.split('T')[0]}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-700">
                        {formatINR(p.amountPaise)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        CGST: {formatINR(p.cgstPaise)} | SGST: {formatINR(p.sgstPaise)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>

        {/* Drawer Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>Strict Centre RBAC • Authenticated Accounts Executive Access</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors cursor-pointer"
          >
            Close Ledger
          </button>
        </div>
      </div>
    </div>
  );
}
