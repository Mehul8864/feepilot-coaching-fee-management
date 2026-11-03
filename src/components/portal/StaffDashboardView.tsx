/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FeePilot Accounts Executive Live Dashboard
 * Role: ACCOUNTS_EXECUTIVE (Strict Centre RBAC & Live Cloud Firestore Synchronization)
 * 
 * Invariants:
 * 1. Zero hardcoded cohort or static figures.
 * 2. Scoped to trusted authorizedCentreIds from user profile.
 * 3. Real-time updates via onSnapshot with automatic lifecycle disposal.
 * 4. Error states with retry controls; NEVER silently falls back to mock data.
 * 5. All monetary calculations in integer paise.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Plus,
  Database,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Calendar,
  Layers,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getTranslation } from '../../utils/i18n';
import { formatINR, maskPhoneNumber } from '../../utils/formatters';
import { LanguageToggle } from '../common/LanguageToggle';
import { SeedDemoDataModal } from './SeedDemoDataModal';
import { 
  subscribeToDashboard, 
  fetchDashboardOnce,
  computeDashboardMetrics, 
  DashboardData, 
  StudentLedgerRow,
  canUserAccessDashboard
} from '../../services/dashboardService';
import { StudentLedgerDrawer } from './StudentLedgerDrawer';
import { REFERENCE_DATE } from '../../services/seedData';

export function StaffDashboardView({ onOpenTestbench }: { onOpenTestbench: () => void }) {
  const { userProfile, currentUser, logout, language } = useAuth();
  const t = getTranslation(language);

  // Modals and Drawer state
  const [seedModalOpen, setSeedModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentLedgerRow | null>(null);

  // Firestore live state
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [useBenchmarkDate, setUseBenchmarkDate] = useState<boolean>(false);

  // Filter state
  const [selectedCentre, setSelectedCentre] = useState<string>('ALL');
  const [selectedBatch, setSelectedBatch] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Validate authorization
  const authCheck = useMemo(() => canUserAccessDashboard(userProfile), [userProfile]);
  const authorizedCentres = authCheck.authorizedCentres;

  // Real-time Firestore subscription
  useEffect(() => {
    if (!authCheck.allowed) {
      setLoading(false);
      setError(authCheck.reason || 'Unauthorized access to executive dashboard.');
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToDashboard(
      userProfile,
      (data) => {
        setDashboardData(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[FeePilot Live Dashboard] Firestore Error:', err);
        setError(err?.message || 'Failed to load live data from Cloud Firestore.');
        setLoading(false);
        // Strict invariant: Never fall back to mock data
      }
    );

    return () => {
      unsubscribe();
    };
  }, [userProfile, authCheck.allowed, authCheck.reason]);

  // Manual safe refresh
  const handleRefresh = useCallback(async () => {
    if (!authCheck.allowed) return;
    setIsRefreshing(true);
    setError(null);
    try {
      const freshData = await fetchDashboardOnce(userProfile);
      setDashboardData(freshData);
    } catch (err: any) {
      setError(err?.message || 'Failed to refresh data from Cloud Firestore.');
    } finally {
      setIsRefreshing(false);
    }
  }, [userProfile, authCheck.allowed]);

  // Dynamic calculations based on live or benchmark evaluation date
  const evaluationDate = useBenchmarkDate
    ? REFERENCE_DATE
    : new Date().toISOString().split('T')[0];

  const metrics = useMemo(() => {
    if (!dashboardData) return null;
    return computeDashboardMetrics(dashboardData, evaluationDate);
  }, [dashboardData, evaluationDate]);

  // Filtered rows for the student ledger table
  const filteredStudents = useMemo(() => {
    if (!metrics) return [];
    return metrics.studentRows.filter((s) => {
      const matchesCentre = selectedCentre === 'ALL' || s.centreId === selectedCentre;
      const matchesBatch = selectedBatch === 'ALL' || s.batchId === selectedBatch;
      const matchesStatus = selectedStatus === 'ALL' || s.status === selectedStatus;
      const matchesQuery = 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.roll.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCentre && matchesBatch && matchesStatus && matchesQuery;
    });
  }, [metrics, selectedCentre, selectedBatch, selectedStatus, searchQuery]);

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
                <span className="flex items-center gap-1.5 text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>LIVE FIRESTORE</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {t.clientName} • Accounts Department
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <LanguageToggle />
            
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700 disabled:opacity-50"
              title="Refresh live Firestore data"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setSeedModalOpen(true)}
              className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs border border-amber-400/30"
              title="Open safe demo seeding and database verification console"
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Seed & Audit</span>
            </button>

            <button
              type="button"
              onClick={onOpenTestbench}
              className="text-xs bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.engineConsole}</span>
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
        
        {/* Executive Profile & Centre RBAC Scope */}
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

          <div className="flex flex-wrap items-center gap-3">
            {/* Live vs Benchmark Date Toggle */}
            <div className="flex items-center gap-2 text-xs bg-slate-50 p-2 rounded-lg border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              <span className="text-slate-500">Ageing Date:</span>
              <button
                type="button"
                onClick={() => setUseBenchmarkDate(!useBenchmarkDate)}
                className="font-mono font-bold text-slate-900 hover:text-teal-700 underline decoration-dotted cursor-pointer"
                title="Click to toggle between live calendar date and 2026-11-02 benchmark audit date"
              >
                {evaluationDate} {useBenchmarkDate ? '(Benchmark)' : '(Live)'}
              </button>
            </div>

            {/* Sync Timestamp */}
            {dashboardData && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Synced: {dashboardData.lastFetched.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* ERROR STATE */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
              <div>
                <h4 className="font-bold text-sm">Firestore Database Connection Error</h4>
                <p className="text-xs text-red-700 mt-0.5">{error}</p>
                <p className="text-[11px] text-red-500 mt-1 font-mono">
                  Zero mock data displayed. FeePilot never fabricates ledger figures.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* LOADING STATE SKELETON */}
        {loading && !dashboardData && (
          <div className="space-y-5 animate-pulse">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-slate-200 rounded-xl"></div>
              ))}
            </div>
            <div className="h-64 bg-slate-200 rounded-xl"></div>
          </div>
        )}

        {/* MAIN METRICS & LEDGER VIEW */}
        {!loading && metrics && (
          <>
            {/* Primary Ledger Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Active Cohort Billed</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-medium">
                    {metrics.studentRows.length} Students
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-slate-900">
                  {formatINR(metrics.totalBilledPaise)}
                </div>
                <p className="text-[11px] text-slate-400">
                  Active instalment cycle total across {authorizedCentres.length} centres
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Verified Collections</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                    VERIFIED ONLY
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-700">
                  {formatINR(metrics.totalCollectedPaise)}
                </div>
                <p className="text-[11px] text-emerald-600">
                  Reconciled electronic GST receipts (Pending excluded)
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Total Outstanding Receivables</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    metrics.totalOverduePaise > 0 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {formatINR(metrics.totalOverduePaise)} OVERDUE
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-amber-800">
                  {formatINR(metrics.totalOutstandingPaise)}
                </div>
                <p className="text-[11px] text-amber-700">
                  Overdue: {formatINR(metrics.totalOverduePaise)} • Upcoming: {formatINR(metrics.totalUpcomingPaise)}
                </p>
              </div>
            </div>

            {/* Ageing Buckets & Centre Breakdown Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              
              {/* Ageing Analysis */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-teal-600" />
                    <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                      Receivables Ageing Analysis
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">As of {evaluationDate}</span>
                </div>

                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-500 block font-medium">Not Due</span>
                    <span className="font-mono font-bold text-slate-900 block mt-1 text-xs sm:text-sm">
                      {formatINR(metrics.ageingBuckets.notDue)}
                    </span>
                  </div>

                  <div className={`p-2.5 rounded-lg border ${
                    metrics.ageingBuckets.days1to30 > 0 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-100 text-slate-400'
                  }`}>
                    <span className="text-[10px] block font-medium">1-30 Days</span>
                    <span className="font-mono font-bold block mt-1 text-xs sm:text-sm">
                      {formatINR(metrics.ageingBuckets.days1to30)}
                    </span>
                  </div>

                  <div className={`p-2.5 rounded-lg border ${
                    metrics.ageingBuckets.days31to60 > 0 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-100 text-slate-400'
                  }`}>
                    <span className="text-[10px] block font-medium">31-60 Days</span>
                    <span className="font-mono font-bold block mt-1 text-xs sm:text-sm">
                      {formatINR(metrics.ageingBuckets.days31to60)}
                    </span>
                  </div>

                  <div className={`p-2.5 rounded-lg border ${
                    metrics.ageingBuckets.days61to90 > 0 ? 'bg-red-50 border-red-200 text-red-900' : 'bg-slate-50 border-slate-100 text-slate-400'
                  }`}>
                    <span className="text-[10px] block font-medium">61-90 Days</span>
                    <span className="font-mono font-bold block mt-1 text-xs sm:text-sm">
                      {formatINR(metrics.ageingBuckets.days61to90)}
                    </span>
                  </div>

                  <div className={`p-2.5 rounded-lg border ${
                    metrics.ageingBuckets.days90Plus > 0 ? 'bg-red-100 border-red-300 text-red-950' : 'bg-slate-50 border-slate-100 text-slate-400'
                  }`}>
                    <span className="text-[10px] block font-medium">90+ Days</span>
                    <span className="font-mono font-bold block mt-1 text-xs sm:text-sm">
                      {formatINR(metrics.ageingBuckets.days90Plus)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Full Annual Academic Commitment:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatINR(metrics.annualCommitmentBilledPaise)} (All 3 instalments)
                  </span>
                </div>
              </div>

              {/* Centre-wise Performance */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-teal-600" />
                    <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                      Branch Centre Totals
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500">{metrics.centreMetrics.length} Branches</span>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {metrics.centreMetrics.map((c) => (
                    <div key={c.centreId} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <div>
                        <span className="font-bold text-slate-900">{c.centreName}</span>
                        <span className="text-[11px] text-slate-400 ml-1.5 font-mono">({c.studentCount} stu)</span>
                      </div>
                      <div className="font-mono text-right">
                        <span className="text-emerald-700 font-bold">{formatINR(c.collectedPaise)}</span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="text-slate-700">{formatINR(c.billedPaise)}</span>
                        {c.outstandingPaise > 0 && (
                          <span className="ml-2 text-amber-800 font-bold">
                            ({formatINR(c.outstandingPaise)} due)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Student Ledger Table & Filter Controls */}
            <section className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Search Bar */}
                <div className="flex items-center gap-3 flex-1 max-w-md">
                  <div className="relative w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search student by name or roll number (e.g. STU-0412)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs pl-9 pr-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                    />
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
                    <Filter className="w-3.5 h-3.5 text-slate-500 ml-1" />
                    
                    {/* Centre filter */}
                    <select
                      value={selectedCentre}
                      onChange={(e) => setSelectedCentre(e.target.value)}
                      className="text-xs px-2 py-1 border-0 bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">All Centres ({authorizedCentres.length})</option>
                      {metrics.centreMetrics.map((c) => (
                        <option key={c.centreId} value={c.centreId}>{c.centreName}</option>
                      ))}
                    </select>

                    {/* Batch filter */}
                    <select
                      value={selectedBatch}
                      onChange={(e) => setSelectedBatch(e.target.value)}
                      className="text-xs px-2 py-1 border-l border-slate-200 bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">All Batches</option>
                      {metrics.batchMetrics.map((b) => (
                        <option key={b.batchId} value={b.batchId}>{b.batchName}</option>
                      ))}
                    </select>

                    {/* Payment status filter */}
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="text-xs px-2 py-1 border-l border-slate-200 bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="PAID">PAID</option>
                      <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
                      <option value="OVERDUE">OVERDUE</option>
                      <option value="UPCOMING">UPCOMING</option>
                      <option value="DUE_SOON">DUE_SOON</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Table / Empty State */}
              {filteredStudents.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Search className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-800">No Student Records Found</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    No student records matched your current query or filter criteria in the live database.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Student & Roll No</th>
                        <th className="py-3 px-4">Centre & Academic Batch</th>
                        <th className="py-3 px-4">Due Date</th>
                        <th className="py-3 px-4 text-right">Instalment Due</th>
                        <th className="py-3 px-4 text-right">Verified Paid</th>
                        <th className="py-3 px-4 text-right">Outstanding</th>
                        <th className="py-3 px-4 text-center">Status / Ageing</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map((s) => (
                        <tr 
                          key={s.roll} 
                          onClick={() => setSelectedStudent(s)}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{s.name}</div>
                            <div className="font-mono text-[11px] text-slate-500">
                              {s.roll} • {s.maskedPhone}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            <div>{s.batchName}</div>
                            <div className="text-[11px] text-slate-400">{s.centreName}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-700">
                            {s.dueDate}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-medium text-right text-slate-900">
                            {formatINR(s.instalmentAmountPaise)}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-medium text-right text-emerald-700">
                            {formatINR(s.paidAmountPaise)}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-right text-slate-900">
                            {formatINR(s.outstandingAmountPaise)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              s.isOverdue
                                ? 'bg-amber-100 text-amber-900'
                                : s.status === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {s.status} ({s.statusDescription})
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStudent(s);
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 transition-colors cursor-pointer"
                            >
                              Ledger
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

      </main>

      {/* Student Detail Ledger Drawer */}
      <StudentLedgerDrawer 
        student={selectedStudent} 
        onClose={() => setSelectedStudent(null)} 
      />

      {/* Safe Demo Data Seed & Verification Modal */}
      <SeedDemoDataModal 
        isOpen={seedModalOpen} 
        onClose={() => setSeedModalOpen(false)} 
      />
    </div>
  );
}
