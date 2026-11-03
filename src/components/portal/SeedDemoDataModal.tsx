/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FeePilot Safe Demo Data Seed & Verification Modal
 * Accessible only to authorized Accounts Executives with all four Jaipur centres.
 */

import React, { useState } from 'react';
import { 
  Database, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  CheckSquare, 
  Square, 
  X, 
  ChevronRight,
  FileCheck2,
  Lock,
  Layers,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  canUserSeedDemoData, 
  executeSafeDemoSeed, 
  verifyPersistedDemoData, 
  getDatabaseSeedStatus,
  SeedExecutionReport, 
  DatabaseVerificationReport,
  SEED_CENTRES,
  SEED_STUDENTS,
  SEED_FEE_PLANS,
  SEED_INSTALMENTS,
  SEED_PAYMENTS,
  SEED_REMINDERS,
  ALL_JAIPUR_CENTRE_IDS
} from '../../services/seedData';
import { maskPhoneNumber, formatINR } from '../../utils/formatters';

interface SeedDemoDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SeedDemoDataModal({ isOpen, onClose }: SeedDemoDataModalProps) {
  const { userProfile } = useAuth();
  
  const authCheck = canUserSeedDemoData(userProfile);
  const [confirmed, setConfirmed] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [currentStage, setCurrentStage] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  
  const [seedReport, setSeedReport] = useState<SeedExecutionReport | null>(null);
  const [verificationReport, setVerificationReport] = useState<DatabaseVerificationReport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dbState, setDbState] = useState<{ status: 'NOT_SEEDED' | 'PARTIAL' | 'COMPLETE'; persistedCount: number } | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      getDatabaseSeedStatus()
        .then((res) => setDbState({ status: res.status, persistedCount: res.persistedCount }))
        .catch(() => setDbState(null));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExecuteSeed = async () => {
    if (!authCheck.allowed || !confirmed || !userProfile) return;
    setSeeding(true);
    setErrorMsg(null);
    setSeedReport(null);
    setVerificationReport(null);
    setProgressPercent(0);

    try {
      const report = await executeSafeDemoSeed(
        userProfile,
        undefined,
        (stage, current, total) => {
          setCurrentStage(stage);
          setProgressPercent(Math.round((current / total) * 100));
        }
      );
      setSeedReport(report);

      // Automatically run readback verification after completed seed
      setVerifying(true);
      setCurrentStage('Performing readback database verification...');
      const vReport = await verifyPersistedDemoData();
      setVerificationReport(vReport);
    } catch (err: any) {
      console.error('Demo seed execution error:', err);
      setErrorMsg(err?.message || 'Failed to complete demo seeding workflow.');
    } finally {
      setSeeding(false);
      setVerifying(false);
    }
  };

  const handleManualVerification = async () => {
    setVerifying(true);
    setErrorMsg(null);
    try {
      const vReport = await verifyPersistedDemoData();
      setVerificationReport(vReport);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Database verification query failed.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight text-white">Seed Demo Data</h3>
                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                  DEVELOPER & DEMO ONLY
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Idempotent one-time provisioning into Cloud Firestore (database: <span className="font-mono text-teal-300">ai-studio-feepilotcoaching...</span>)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={seeding || verifying}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Security Precondition Gate */}
          <div className={`p-4 rounded-xl border text-xs space-y-2 ${
            authCheck.allowed 
              ? 'bg-teal-50/80 border-teal-200 text-teal-900' 
              : 'bg-red-50/80 border-red-200 text-red-900'
          }`}>
            <div className="flex items-center gap-2 font-bold text-sm">
              {authCheck.allowed ? (
                <>
                  <ShieldCheck className="w-5 h-5 text-teal-700" />
                  <span>Security Authorization Check: PASSED</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-red-700" />
                  <span>Security Authorization Check: BLOCKED</span>
                </>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-slate-500 font-medium">User Role:</span>{' '}
                <span className="font-mono font-bold">{userProfile?.role || 'None'}</span>{' '}
                {userProfile?.role === 'ACCOUNTS_EXECUTIVE' ? '✓' : '✗'}
              </div>
              <div>
                <span className="text-slate-500 font-medium">Jaipur Centre Permissions:</span>{' '}
                <span className="font-mono font-bold">
                  {userProfile?.authorizedCentreIds?.length || 0}/4 centres
                </span>{' '}
                {authCheck.allowed ? '✓ (All 4 Authorized)' : '✗'}
              </div>
            </div>
            {!authCheck.allowed && (
              <p className="text-red-700 font-medium pt-1 border-t border-red-200">
                {authCheck.reason}
              </p>
            )}
          </div>

          {/* Partial Seed Recovery Alert */}
          {dbState?.status === 'PARTIAL' && !seedReport && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs flex items-start gap-2.5 shadow-2xs">
              <Layers className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Partial Seed State Detected ({dbState.persistedCount}/27 records):</span>
                <p className="mt-0.5 text-amber-900 leading-relaxed">
                  The live Firestore database already holds the 4 branch centres and 4 academic batches. 
                  When you proceed, existing records will be <strong>strictly skipped</strong> and only the missing 19 documents 
                  (students, fee plans, instalments, and receipts) will be provisioned.
                </p>
              </div>
            </div>
          )}

          {/* Scope Review Table */}
          {!seedReport && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Exact Seed Payload Inventory (Zero Users Modified)
                </h4>
                <span className="text-[11px] font-mono text-slate-500">
                  Total Documents: {SEED_CENTRES.length + 4 + SEED_STUDENTS.length + SEED_FEE_PLANS.length + SEED_INSTALMENTS.length + SEED_PAYMENTS.length + SEED_REMINDERS.length + 1}
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                
                {/* 1. Centres */}
                <div className="p-3 bg-slate-50 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900">4 Jaipur Branch Centres</span>
                    <p className="text-[11px] text-slate-500">
                      Vaishali Nagar, Tonk Road, Malviya Nagar, Vidhyadhar Nagar
                    </p>
                  </div>
                  <span className="font-mono font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded text-[11px]">
                    4 records
                  </span>
                </div>

                {/* 2. Students with privacy masked numbers */}
                <div className="p-3 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">3 Sample Coaching Students</span>
                    <span className="font-mono font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded text-[11px]">
                      3 records
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                    {SEED_STUDENTS.map((s) => (
                      <div key={s.id} className="p-2 bg-slate-50 rounded-lg border border-slate-200/60">
                        <div className="font-bold text-slate-900">{s.fullName}</div>
                        <div className="font-mono text-slate-500">{s.rollNumber}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Phone: {maskPhoneNumber(s.parentPhone)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Fee Plans */}
                <div className="p-3 bg-slate-50 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900">3 Annual Fee Plans (Reconciled with 18% GST)</span>
                    <p className="text-[11px] text-slate-500">
                      Aarav: ₹1,06,200 | Ishita: ₹1,06,200 | Mohit: ₹1,41,600
                    </p>
                  </div>
                  <span className="font-mono font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded text-[11px]">
                    3 records
                  </span>
                </div>

                {/* 4. Instalments */}
                <div className="p-3 bg-white flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900">9 Scheduled Instalments</span>
                    <p className="text-[11px] text-slate-500">
                      Aarav (₹30k paid) • Ishita (₹15k paid, ₹15k overdue) • Mohit (₹40k upcoming)
                    </p>
                  </div>
                  <span className="font-mono font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded text-[11px]">
                    9 records
                  </span>
                </div>

                {/* 5. Payments & Receipts */}
                <div className="p-3 bg-slate-50 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900">2 Verified GST Electronic Receipts</span>
                    <p className="text-[11px] text-slate-500">
                      REC-2026-00412 (₹30,000 via UPI) • REC-2026-00587 (₹15,000 via NetBanking)
                    </p>
                  </div>
                  <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                    2 records (₹45,000)
                  </span>
                </div>

                {/* 6. Reminders */}
                <div className="p-3 bg-white flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900">2 Notification & Reminder Schedules</span>
                    <p className="text-[11px] text-slate-500">
                      Aarav (Cancelled by payment) • Ishita (Active 15-day overdue notice)
                    </p>
                  </div>
                  <span className="font-mono font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded text-[11px]">
                    2 records
                  </span>
                </div>
              </div>

              {/* Strict Invariant Callout */}
              <div className="flex items-start gap-3 p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 text-xs">
                <Lock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold">Privilege Protection Invariant:</span>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    This operation uses deterministic IDs, verifies existing documents before writing, and strictly leaves the 
                    <code className="mx-1 px-1 bg-blue-100 rounded text-blue-900 font-bold">users</code> collection untouched. 
                    Parents are NOT automatically linked; retrying this action is safe and idempotent.
                  </p>
                </div>
              </div>

              {/* 2nd Explicit Confirmation Checkbox */}
              <div className="pt-2">
                <label 
                  onClick={() => authCheck.allowed && setConfirmed(!confirmed)}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer select-none transition-colors ${
                    confirmed 
                      ? 'bg-teal-50 border-teal-300 text-teal-950' 
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/80'
                  } ${!authCheck.allowed ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="mt-0.5 text-teal-700">
                    {confirmed ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </div>
                  <div className="text-xs">
                    <span className="font-bold">Explicit Operational Confirmation:</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      I confirm that I am an authorized Accounts Executive and wish to populate the initial benchmark demo cohort 
                      into the live Cloud Firestore database.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Progress Display */}
          {(seeding || verifying) && (
            <div className="p-6 bg-slate-900 text-white rounded-xl space-y-4 shadow-inner">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-teal-400" />
                  <span className="font-medium text-teal-300">{currentStage}</span>
                </div>
                <span className="font-mono font-bold text-slate-400">{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-teal-500 h-2 transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs flex items-start gap-2.5">
              <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Error during operation:</span>
                <p className="mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Seed Execution Report */}
          {seedReport && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm">Firestore Seeding Completed</h4>
                    <p className="text-xs text-emerald-800">
                      Persisted writes acknowledged by Cloud Firestore.
                    </p>
                  </div>
                </div>
                <span className="font-mono text-xs text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-md border border-emerald-300">
                  {new Date(seedReport.timestamp).toLocaleTimeString()}
                </span>
              </div>

              {/* Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <span className="text-[11px] text-slate-500">Records Created</span>
                  <div className="text-xl font-bold font-mono text-emerald-700">{seedReport.recordsCreated}</div>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <span className="text-[11px] text-slate-500">Records Skipped</span>
                  <div className="text-xl font-bold font-mono text-slate-700">{seedReport.recordsSkipped}</div>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <span className="text-[11px] text-slate-500">Data Conflicts</span>
                  <div className="text-xl font-bold font-mono text-amber-700">{seedReport.conflictsCount}</div>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <span className="text-[11px] text-slate-500">Errors</span>
                  <div className="text-xl font-bold font-mono text-red-700">{seedReport.errorsCount}</div>
                </div>
              </div>

              {/* Live Readback Verification Section */}
              {verificationReport && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-teal-700" />
                      <span className="font-bold text-xs text-slate-900">
                        Live Database Readback Verification:
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        verificationReport.allPassed 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {verificationReport.allPassed ? 'ALL CHECKS PASSED' : 'CHECK FAILED'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleManualVerification}
                      disabled={verifying}
                      className="text-xs text-teal-700 hover:text-teal-900 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
                      <span>Re-verify</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {verificationReport.checks.map((chk, idx) => (
                      <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs flex items-start gap-2.5">
                        {chk.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 space-y-0.5">
                          <div className="font-semibold text-slate-900 flex items-center justify-between">
                            <span>{chk.name}</span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {chk.passed ? 'VERIFIED' : 'FAILED'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600">{chk.actual}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Itemized Log Accordion */}
              <details className="border border-slate-200 rounded-xl bg-white p-3 text-xs">
                <summary className="font-bold text-slate-700 cursor-pointer select-none">
                  View Detailed Firestore Write Log ({seedReport.items.length} items)
                </summary>
                <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto font-mono text-[11px]">
                  {seedReport.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-1.5 bg-slate-50 rounded border border-slate-100">
                      <span className="text-slate-700">
                        {item.collection}/<span className="font-bold">{item.id}</span>
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        item.status === 'CREATED' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : item.status === 'SKIPPED'
                          ? 'bg-slate-200 text-slate-700'
                          : item.status === 'CONFLICT'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500">
            {seedReport ? (
              <span>Safe seed completed. Retrying will safely skip existing records.</span>
            ) : (
              <span>Requires 2nd confirmation check above before execution.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={seeding || verifying}
              className="text-xs px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-medium transition-colors cursor-pointer"
            >
              {seedReport ? 'Done' : 'Cancel'}
            </button>

            {!seedReport ? (
              <button
                type="button"
                onClick={handleExecuteSeed}
                disabled={!authCheck.allowed || !confirmed || seeding}
                className="text-xs px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {seeding ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Seeding Firestore...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5" />
                    <span>Execute Safe Demo Seed</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleManualVerification}
                disabled={verifying}
                className="text-xs px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
                <span>Re-verify Database</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
