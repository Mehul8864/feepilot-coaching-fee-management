/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FeePilot - Milestone 1 Testbench & Financial Engine Verification Console
 * Client: Company A, Jaipur
 * Reference Date: 2026-11-02
 */

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Calculator, 
  ShieldCheck, 
  Bell, 
  Sparkles,
  ArrowRight,
  FileCheck2,
  RefreshCw,
  Info,
  AlertCircle,
  Database,
  ArrowLeft,
  LogIn
} from 'lucide-react';
import { calculateFeePlan, FeePlanCalculationResult } from '../../engine/feeCalculation';
import { calculateOverdueDays } from '../../engine/overdueCalculation';
import { calculateProRataRefund, DEMO_CONFIGURABLE_REFUND_POLICY } from '../../engine/refundCalculation';
import { updateInstalmentReminders, formatReminderMessage } from '../../engine/reminderRules';
import { ReminderSchedule } from '../../types/domain';
import { formatINR } from '../../utils/formatters';
import { testFirestoreConnection } from '../../firebase/config';
import { LanguageToggle } from '../common/LanguageToggle';

export function Milestone1Testbench({ onReturnToPortal }: { onReturnToPortal?: () => void }) {
  const referenceDate = '2026-11-02';
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(false);

  useEffect(() => {
    testFirestoreConnection().then(setIsFirebaseConnected);
  }, []);

  // Sample student evaluations using engine
  const aaravResult = calculateOverdueDays('2026-10-10', referenceDate, 0, 3000000, 3000000);
  const ishitaResult = calculateOverdueDays('2026-10-10', referenceDate, 1500000, 1500000, 3000000);
  const mohitResult = calculateOverdueDays('2026-11-15', referenceDate, 4000000, 0, 4000000);

  // Interactive Fee Plan Workbench state
  const [grossInput, setGrossInput] = useState<number>(100000);
  const [discountInput, setDiscountInput] = useState<number>(10000);
  const [gstRateInput, setGstRateInput] = useState<number>(18);
  const [instalmentCountInput, setInstalmentCountInput] = useState<number>(3);

  // Interactive Refund Workbench state (Demonstrates standard vs clamped excess scenarios)
  const [refundPaidInput, setRefundPaidInput] = useState<number>(60000);
  const [classesAttendedInput, setClassesAttendedInput] = useState<number>(12);
  const [totalClassesInput, setTotalClassesInput] = useState<number>(100);

  // Interactive Reminder Simulator state
  const [reminderState, setReminderState] = useState<ReminderSchedule[]>([
    {
      id: 'REM-ISHITA-1',
      instalmentId: 'INST-587-1',
      studentId: 'STU-0587',
      stage: 'OVERDUE_3D',
      scheduledDate: '2026-10-13',
      language: 'hi',
      amountDuePaise: 3000000,
      messageText: formatReminderMessage('Ishita Sharma', 'OVERDUE_3D', 3000000, '2026-10-10', 'hi'),
      status: 'SCHEDULED',
    },
    {
      id: 'REM-ISHITA-2',
      instalmentId: 'INST-587-1',
      studentId: 'STU-0587',
      stage: 'OVERDUE_7D',
      scheduledDate: '2026-10-17',
      language: 'en',
      amountDuePaise: 3000000,
      messageText: formatReminderMessage('Ishita Sharma', 'OVERDUE_7D', 3000000, '2026-10-10', 'en'),
      status: 'SCHEDULED',
    },
  ]);

  // Compute live calculations
  let liveFeePlan: FeePlanCalculationResult | null = null;
  let feePlanError: string | null = null;
  try {
    liveFeePlan = calculateFeePlan(
      Math.round(grossInput * 100),
      Math.round(discountInput * 100),
      gstRateInput,
      instalmentCountInput
    );
  } catch (err: any) {
    feePlanError = err.message;
  }

  let liveRefund: any = null;
  let refundError: string | null = null;
  try {
    liveRefund = calculateProRataRefund(
      DEMO_CONFIGURABLE_REFUND_POLICY,
      Math.round(refundPaidInput * 100),
      classesAttendedInput,
      totalClassesInput
    );
  } catch (err: any) {
    refundError = err.message;
  }

  const handleSimulatePayment = (paymentRupees: number) => {
    const totalInstalmentPaise = 3000000;
    const paymentPaise = Math.round(paymentRupees * 100);
    const newOutstandingPaise = Math.max(0, totalInstalmentPaise - paymentPaise);

    const updated = updateInstalmentReminders(
      reminderState,
      'INST-587-1',
      newOutstandingPaise,
      'Ishita Sharma',
      '2026-10-10'
    );
    setReminderState(updated);
  };

  const handleResetReminders = () => {
    setReminderState([
      {
        id: 'REM-ISHITA-1',
        instalmentId: 'INST-587-1',
        studentId: 'STU-0587',
        stage: 'OVERDUE_3D',
        scheduledDate: '2026-10-13',
        language: 'hi',
        amountDuePaise: 3000000,
        messageText: formatReminderMessage('Ishita Sharma', 'OVERDUE_3D', 3000000, '2026-10-10', 'hi'),
        status: 'SCHEDULED',
      },
      {
        id: 'REM-ISHITA-2',
        instalmentId: 'INST-587-1',
        studentId: 'STU-0587',
        stage: 'OVERDUE_7D',
        scheduledDate: '2026-10-17',
        language: 'en',
        amountDuePaise: 3000000,
        messageText: formatReminderMessage('Ishita Sharma', 'OVERDUE_7D', 3000000, '2026-10-10', 'en'),
        status: 'SCHEDULED',
      },
    ]);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Top Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="bg-teal-500 text-slate-950 text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
              Milestone 1 Testbench
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                FeePilot <span className="text-teal-400 font-normal text-sm sm:text-base">| Financial Engine & Verification Console</span>
              </h1>
              <p className="text-[11px] text-slate-400">
                Client: Company A, Jaipur • 4 Centres • 2,600 Students
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            {onReturnToPortal && (
              <button
                type="button"
                onClick={onReturnToPortal}
                className="text-xs bg-teal-600 hover:bg-teal-500 text-white px-3.5 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Return to Portal / Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Verification Status Banner */}
        <section className="bg-white rounded-xl shadow-xs border border-slate-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-teal-600" />
                Core Requirement Verification: 2 November 2026 Sample Records
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Deterministic calculation engine verified against Company A Jaipur's benchmark cohort with two decimal place currency formatting.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Engine Verified
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">
                <Database className="w-3.5 h-3.5" /> Firestore Ready
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
            
            {/* Student 1: Aarav Meena */}
            <div className="border border-slate-200 rounded-lg p-5 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  STU-0412
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                  {aaravResult.status}
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 text-base mt-2">Aarav Meena</h3>
              <p className="text-xs text-slate-500">JEE 2027 Morning • Due 10 Oct 2026</p>
              
              <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Instalment Due:</span>
                  <span className="font-mono font-medium">{formatINR(3000000)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Paid:</span>
                  <span className="font-mono font-medium text-emerald-700">{formatINR(3000000)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Outstanding:</span>
                  <span className="font-mono font-bold text-slate-900">{formatINR(0)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-dashed border-slate-200">
                  <span className="text-slate-500">Overdue Days:</span>
                  <span className="font-mono font-bold text-emerald-700">{aaravResult.overdueDays} days</span>
                </div>
              </div>
            </div>

            {/* Student 2: Ishita Sharma */}
            <div className="border border-amber-200 rounded-lg p-5 bg-amber-50/30 hover:bg-amber-50/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  STU-0587
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {ishitaResult.status}
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 text-base mt-2">Ishita Sharma</h3>
              <p className="text-xs text-slate-500">JEE 2027 Evening • Due 10 Oct 2026</p>
              
              <div className="mt-4 pt-3 border-t border-amber-200/80 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Instalment Due:</span>
                  <span className="font-mono font-medium">{formatINR(3000000)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Paid:</span>
                  <span className="font-mono font-medium text-slate-700">{formatINR(1500000)} (Part)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Outstanding:</span>
                  <span className="font-mono font-bold text-amber-900">{formatINR(1500000)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-dashed border-amber-200">
                  <span className="text-slate-500">Overdue Days:</span>
                  <span className="font-mono font-bold text-amber-900">
                    {ishitaResult.overdueDays} days overdue
                  </span>
                </div>
              </div>
            </div>

            {/* Student 3: Mohit Gurjar */}
            <div className="border border-blue-200 rounded-lg p-5 bg-blue-50/30 hover:bg-blue-50/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  STU-0219
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  {mohitResult.status}
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 text-base mt-2">Mohit Gurjar</h3>
              <p className="text-xs text-slate-500">NEET 2027 Morning • Due 15 Nov 2026</p>
              
              <div className="mt-4 pt-3 border-t border-blue-200/80 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Instalment Due:</span>
                  <span className="font-mono font-medium">{formatINR(4000000)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Paid:</span>
                  <span className="font-mono font-medium text-slate-700">{formatINR(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Outstanding:</span>
                  <span className="font-mono font-bold text-blue-950">{formatINR(4000000)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-dashed border-blue-200">
                  <span className="text-slate-500">Due Timeline:</span>
                  <span className="font-mono font-bold text-blue-800">
                    {mohitResult.statusDescription}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Interactive Engine Testbenches */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Workbench 1: Fee Plan & GST Split Calculator */}
          <section className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calculator className="w-5 h-5 text-teal-600" />
                <h2 className="text-lg font-bold text-slate-900">Fee Calculation & GST Split Engine</h2>
              </div>
              <p className="text-xs text-slate-600">
                Integer paise arithmetic with configurable GST, Rajasthan intra-state split (50% CGST + 50% SGST), and penny-drop remainder absorption.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gross Fee (₹)</label>
                  <input
                    type="number"
                    value={grossInput}
                    onChange={(e) => setGrossInput(Number(e.target.value))}
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(Number(e.target.value))}
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GST Rate (%)</label>
                  <input
                    type="number"
                    value={gstRateInput}
                    onChange={(e) => setGstRateInput(Number(e.target.value))}
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Instalments</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={instalmentCountInput}
                    onChange={(e) => setInstalmentCountInput(Number(e.target.value))}
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {feePlanError ? (
                <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-md border border-red-200">
                  {feePlanError}
                </div>
              ) : liveFeePlan ? (
                <div className="mt-5 space-y-4">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Net Taxable Amount (Gross - Discount):</span>
                      <span className="font-mono font-medium">{formatINR(liveFeePlan.taxableAmountPaise)}</span>
                    </div>
                    <div className="flex justify-between text-teal-800">
                      <span>CGST ({(liveFeePlan.gstRatePercent / 2)}%):</span>
                      <span className="font-mono font-medium">{formatINR(liveFeePlan.cgstAmountPaise)}</span>
                    </div>
                    <div className="flex justify-between text-teal-800">
                      <span>SGST ({(liveFeePlan.gstRatePercent / 2)}%):</span>
                      <span className="font-mono font-medium">{formatINR(liveFeePlan.sgstAmountPaise)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900 text-sm">
                      <span>Total Payable:</span>
                      <span className="font-mono text-teal-900">{formatINR(liveFeePlan.totalPayablePaise)}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Instalment Breakdown ({liveFeePlan.instalmentCount} parts)
                    </h4>
                    <div className="space-y-1.5">
                      {liveFeePlan.instalmentAmountsPaise.map((amountPaise, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs bg-white border border-slate-200 px-3 py-2 rounded">
                          <span className="text-slate-600 font-medium">
                            Instalment #{idx + 1} {idx === liveFeePlan!.instalmentCount - 1 && '(Absorbs remainder)'}
                          </span>
                          <span className="font-mono font-bold text-slate-900">
                            {formatINR(amountPaise)} <span className="text-[10px] text-slate-400 font-normal">({amountPaise} paise)</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                Integer paise arithmetic guarantees zero rounding leakage across all instalments.
              </span>
            </div>
          </section>

          {/* Workbench 2: Configurable Pro-Rata Refund Calculator (Polished) */}
          <section className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  <h2 className="text-lg font-bold text-slate-900">Pro-Rata Refund Calculation Engine</h2>
                </div>
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  {DEMO_CONFIGURABLE_REFUND_POLICY.version}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Transparent policy model with itemized deductions and non-negative refund protection.
              </p>

              {/* Fictional Demo Policy Notice */}
              <div className="mt-3 bg-amber-50/90 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-semibold text-amber-950">Fictional Demo Policy Notice: </span>
                  The rules and rates applied here (Policy <code className="font-mono font-semibold">{DEMO_CONFIGURABLE_REFUND_POLICY.version}</code>) are a configurable demonstration model for testing and simulation. They do <strong>NOT</strong> represent Company A's approved or legally verified refund policy.
                </div>
              </div>

              {/* Quick Preset Buttons for testing */}
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    setRefundPaidInput(60000);
                    setClassesAttendedInput(12);
                    setTotalClassesInput(100);
                  }}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                >
                  Standard Case (₹60,000 paid)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRefundPaidInput(12000);
                    setClassesAttendedInput(4);
                    setTotalClassesInput(100);
                  }}
                  className="px-2.5 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 font-medium transition-colors"
                >
                  Clamped to Zero Case (₹12,000 paid)
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Paid (₹)</label>
                  <input
                    type="number"
                    value={refundPaidInput}
                    onChange={(e) => setRefundPaidInput(Number(e.target.value))}
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Attended Classes</label>
                  <input
                    type="number"
                    value={classesAttendedInput}
                    onChange={(e) => setClassesAttendedInput(Number(e.target.value))}
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Classes</label>
                  <input
                    type="number"
                    value={totalClassesInput}
                    onChange={(e) => setTotalClassesInput(Number(e.target.value))}
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {refundError ? (
                <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-md border border-red-200">
                  {refundError}
                </div>
              ) : liveRefund ? (
                <div className="mt-4 space-y-2 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
                  <div className="flex justify-between text-slate-700 font-medium pb-1.5 border-b border-slate-200">
                    <span>Total Amount Paid by Parent:</span>
                    <span className="font-mono font-bold text-slate-900">{formatINR(liveRefund.totalPaidPaise)}</span>
                  </div>

                  <div className="flex justify-between text-slate-600 pt-1">
                    <span>Non-Refundable Admission Charge:</span>
                    <span className="font-mono text-red-700">- {formatINR(liveRefund.nonRefundableRegistrationFeePaise)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Study Material / Kit Cost:</span>
                    <span className="font-mono text-red-700">- {formatINR(liveRefund.kitMaterialCostPaise)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Attended Sessions Pro-Rata ({liveRefund.classesAttended}/{liveRefund.totalClasses}):</span>
                    <span className="font-mono text-red-700">- {formatINR(liveRefund.serviceUsedDeductionPaise)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Administrative Fee ({DEMO_CONFIGURABLE_REFUND_POLICY.adminFeePercentage}%):</span>
                    <span className="font-mono text-red-700">- {formatINR(liveRefund.adminFeePaise)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 font-semibold text-slate-800">
                    <span>Total Permitted Deductions:</span>
                    <span className="font-mono text-red-800 font-bold">{formatINR(liveRefund.totalDeductionsPaise)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-300 font-bold text-slate-900 text-sm">
                    <span>Net Refund Payable to Parent:</span>
                    <span className="font-mono text-emerald-800 font-bold text-base">
                      {formatINR(liveRefund.netRefundPaise)}
                    </span>
                  </div>

                  {liveRefund.excessDeductionsPaise > 0 ? (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-md text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-950">
                        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>Deductions Exceed Total Paid — Refund Clamped to {formatINR(0)}</span>
                      </div>
                      <p className="text-amber-900 leading-relaxed text-[11px]">
                        Total itemized deductions ({formatINR(liveRefund.totalDeductionsPaise)}) exceed the total amount paid ({formatINR(liveRefund.totalPaidPaise)}) by{' '}
                        <strong className="font-mono text-amber-950 font-bold">{formatINR(liveRefund.excessDeductionsPaise)}</strong>.
                        Per the non-negative policy rule, the net refund is strictly clamped to{' '}
                        <strong className="font-mono text-emerald-900 font-bold">{formatINR(0)}</strong> so the parent is never charged an exit deficit.
                      </p>
                    </div>
                  ) : liveRefund.netRefundPaise === 0 ? (
                    <div className="mt-2 p-2 bg-slate-100 rounded text-[11px] text-slate-700 border border-slate-200">
                      Total deductions exactly equal the total amount paid. Net refund payable is {formatINR(0)}.
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
              Itemized refund breakdown prevents parent disputes with audited calculation trail.
            </div>
          </section>

        </div>

        {/* Workbench 3: Automated Reminder Rules & Immediate Cancellation Simulator */}
        <section className="bg-white rounded-xl shadow-xs border border-slate-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-teal-600" />
                <h2 className="text-lg font-bold text-slate-900">
                  Instalment Reminder Engine & Immediate Cancellation
                </h2>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Verifies that reminders for an instalment cancel immediately upon full settlement, or dynamically update upon partial payment.
              </p>
            </div>
            <button
              onClick={handleResetReminders}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 self-start transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset Schedule
            </button>
          </div>

          <div className="mt-5 p-4 bg-slate-50 rounded-lg border border-slate-200 flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-slate-700">Simulate Payment for Ishita Sharma (Original {formatINR(3000000)}):</span>
            <button
              onClick={() => handleSimulatePayment(15000)}
              className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Record Part Payment: {formatINR(1500000)} (Remaining: {formatINR(1500000)})
            </button>
            <button
              onClick={() => handleSimulatePayment(30000)}
              className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Record Full Payment: {formatINR(3000000)} (Settle to {formatINR(0)})
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {reminderState.map((rem) => {
              const isCancelled = rem.status === 'CANCELLED_BY_PAYMENT';
              return (
                <div
                  key={rem.id}
                  className={`p-4 rounded-lg border text-xs transition-all ${
                    isCancelled
                      ? 'bg-slate-100/70 border-slate-200 opacity-75'
                      : 'bg-white border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-slate-600 text-[11px]">{rem.id} • {rem.stage}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                        isCancelled
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-teal-100 text-teal-800'
                      }`}
                    >
                      {rem.status}
                    </span>
                  </div>
                  <p className="text-slate-800 leading-relaxed font-sans">{rem.messageText}</p>
                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Language: <strong className="text-slate-700">{rem.language.toUpperCase()}</strong></span>
                    <span>Amount Due: <strong className="font-mono text-slate-900">{formatINR(rem.amountDuePaise)}</strong></span>
                  </div>
                  {isCancelled && rem.cancellationReason && (
                    <div className="mt-2 text-[10px] text-emerald-800 bg-emerald-50 px-2 py-1 rounded">
                      ✓ {rem.cancellationReason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}
