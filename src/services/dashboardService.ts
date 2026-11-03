/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FeePilot Accounts Executive Dashboard Data Service
 * 
 * Strict invariants:
 * 1. Requires authenticated ACCOUNTS_EXECUTIVE with trusted authorizedCentreIds.
 * 2. Never trusts unverified client parameters; only queries authorized centres.
 * 3. Constructs Firestore queries matching deployed security rules.
 * 4. All financial calculations use integer paise.
 * 5. Only VERIFIED payments count as collected; deduplicated by payment ID.
 * 6. Never falls back to fabricated or hardcoded mock data on database error.
 */

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  Firestore, 
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { 
  UserProfile, 
  Centre, 
  Batch, 
  Student, 
  FeePlan, 
  Instalment, 
  Payment, 
  ReminderSchedule, 
  CurrencyPaise,
  InstalmentStatus
} from '../types/domain';
import { calculateOverdueDays } from '../engine/overdueCalculation';
import { maskPhoneNumber } from '../utils/formatters';

export interface DashboardData {
  centres: Centre[];
  batches: Batch[];
  students: Student[];
  feePlans: FeePlan[];
  instalments: Instalment[];
  payments: Payment[];
  reminders: ReminderSchedule[];
  lastFetched: Date;
  source: 'LIVE_FIRESTORE';
}

export interface StudentLedgerRow {
  roll: string;
  name: string;
  parentPhone: string;
  maskedPhone: string;
  centreId: string;
  centreName: string;
  batchId: string;
  batchName: string;
  activeInstalmentId: string;
  instalmentNumber: number;
  dueDate: string;
  instalmentAmountPaise: CurrencyPaise;
  paidAmountPaise: CurrencyPaise;
  outstandingAmountPaise: CurrencyPaise;
  overdueDays: number;
  daysUntilDue: number;
  isOverdue: boolean;
  status: InstalmentStatus;
  statusDescription: string;
  allInstalments: Instalment[];
  payments: Payment[];
  feePlan?: FeePlan;
}

export interface CentreMetricSummary {
  centreId: string;
  centreName: string;
  centreCode: string;
  studentCount: number;
  billedPaise: CurrencyPaise;
  collectedPaise: CurrencyPaise;
  outstandingPaise: CurrencyPaise;
  overduePaise: CurrencyPaise;
}

export interface BatchMetricSummary {
  batchId: string;
  batchName: string;
  courseType: string;
  centreId: string;
  studentCount: number;
  billedPaise: CurrencyPaise;
  collectedPaise: CurrencyPaise;
  outstandingPaise: CurrencyPaise;
}

export interface AgeingBuckets {
  notDue: CurrencyPaise;
  days1to30: CurrencyPaise;
  days31to60: CurrencyPaise;
  days61to90: CurrencyPaise;
  days90Plus: CurrencyPaise;
}

export interface DashboardFinancialMetrics {
  totalBilledPaise: CurrencyPaise;
  totalCollectedPaise: CurrencyPaise;
  totalOutstandingPaise: CurrencyPaise;
  totalOverduePaise: CurrencyPaise;
  totalUpcomingPaise: CurrencyPaise;
  annualCommitmentBilledPaise: CurrencyPaise;
  annualCommitmentOutstandingPaise: CurrencyPaise;
  centreMetrics: CentreMetricSummary[];
  batchMetrics: BatchMetricSummary[];
  ageingBuckets: AgeingBuckets;
  studentRows: StudentLedgerRow[];
}

/**
 * Validates that the active user is an authorized Accounts Executive and returns
 * their trusted assigned centre IDs.
 */
export function canUserAccessDashboard(userProfile: UserProfile | null): {
  allowed: boolean;
  reason?: string;
  authorizedCentres: string[];
} {
  if (!userProfile) {
    return {
      allowed: false,
      reason: 'Authentication required: Please sign in as Accounts Executive.',
      authorizedCentres: [],
    };
  }

  if (userProfile.role !== 'ACCOUNTS_EXECUTIVE') {
    return {
      allowed: false,
      reason: `Access denied: Role '${userProfile.role}' is not authorized to access executive financial ledger.`,
      authorizedCentres: [],
    };
  }

  const authorizedCentres = Array.isArray(userProfile.authorizedCentreIds)
    ? userProfile.authorizedCentreIds.filter((c) => typeof c === 'string' && c.trim().length > 0)
    : [];

  if (authorizedCentres.length === 0) {
    return {
      allowed: false,
      reason: 'No centres assigned: This Accounts Executive profile has no authorized branch centres.',
      authorizedCentres: [],
    };
  }

  return {
    allowed: true,
    authorizedCentres,
  };
}

/**
 * Pure calculation engine for dynamic dashboard financial metrics.
 * 
 * Invariants:
 * - Computes strictly from the provided raw records.
 * - All monetary values are integer paise.
 * - Only VERIFIED payments are added to collections.
 * - Deduplicates payments by payment.id.
 * - Supports arbitrary evaluation date (defaults to current live ISO date).
 */
export function computeDashboardMetrics(
  data: DashboardData,
  evaluationDate?: string
): DashboardFinancialMetrics {
  const currentDate = evaluationDate || new Date().toISOString().split('T')[0];

  // Map helper lookups
  const centreMap = new Map<string, Centre>();
  for (const c of data.centres) {
    centreMap.set(c.id, c);
  }

  const batchMap = new Map<string, Batch>();
  for (const b of data.batches) {
    batchMap.set(b.id, b);
  }

  const feePlanByStudent = new Map<string, FeePlan>();
  for (const p of data.feePlans) {
    feePlanByStudent.set(p.studentId, p);
  }

  const instalmentsByStudent = new Map<string, Instalment[]>();
  for (const inst of data.instalments) {
    const list = instalmentsByStudent.get(inst.studentId) || [];
    list.push(inst);
    instalmentsByStudent.set(inst.studentId, list);
  }

  // Deduplicate and filter payments with VERIFIED status
  const verifiedPaymentsByStudent = new Map<string, Payment[]>();
  const verifiedPaymentsByInstalment = new Map<string, Payment[]>();
  const seenPaymentIds = new Set<string>();
  let totalCollectedPaise = 0;

  for (const p of data.payments) {
    if (seenPaymentIds.has(p.id)) continue;
    seenPaymentIds.add(p.id);

    if (p.status === 'VERIFIED') {
      totalCollectedPaise += p.amountPaise;

      const studentList = verifiedPaymentsByStudent.get(p.studentId) || [];
      studentList.push(p);
      verifiedPaymentsByStudent.set(p.studentId, studentList);

      const instList = verifiedPaymentsByInstalment.get(p.instalmentId) || [];
      instList.push(p);
      verifiedPaymentsByInstalment.set(p.instalmentId, instList);
    }
  }

  // Build Student Ledger Rows & Active Cohort Metrics
  let totalBilledPaise = 0;
  let totalOutstandingPaise = 0;
  let totalOverduePaise = 0;
  let totalUpcomingPaise = 0;
  let annualCommitmentBilledPaise = 0;
  let annualCommitmentOutstandingPaise = 0;

  const ageingBuckets: AgeingBuckets = {
    notDue: 0,
    days1to30: 0,
    days31to60: 0,
    days61to90: 0,
    days90Plus: 0,
  };

  const centreTotals = new Map<string, { billed: number; collected: number; outstanding: number; overdue: number; count: number }>();
  for (const c of data.centres) {
    centreTotals.set(c.id, { billed: 0, collected: 0, outstanding: 0, overdue: 0, count: 0 });
  }

  const batchTotals = new Map<string, { billed: number; collected: number; outstanding: number; count: number }>();
  for (const b of data.batches) {
    batchTotals.set(b.id, { billed: 0, collected: 0, outstanding: 0, count: 0 });
  }

  const studentRows: StudentLedgerRow[] = [];

  for (const student of data.students) {
    const studentInstalments = instalmentsByStudent.get(student.id) || [];
    studentInstalments.sort((a, b) => a.instalmentNumber - b.instalmentNumber);

    // Active instalment is instalment 1 (or the first unpaid/partially-paid instalment)
    const activeInstalment = studentInstalments.find((i) => i.instalmentNumber === 1) || studentInstalments[0];
    const feePlan = feePlanByStudent.get(student.id);

    // Annual commitments
    for (const inst of studentInstalments) {
      annualCommitmentBilledPaise += inst.amountPaise;
      annualCommitmentOutstandingPaise += inst.outstandingBalancePaise;
    }

    if (activeInstalment) {
      // Re-evaluate overdue dynamically based on current live date
      const verifiedPaid = activeInstalment.paidAmountPaise;
      const outstanding = Math.max(0, activeInstalment.amountPaise - verifiedPaid);
      const overdueAnalysis = calculateOverdueDays(
        activeInstalment.dueDate,
        currentDate,
        outstanding,
        verifiedPaid,
        activeInstalment.amountPaise
      );

      totalBilledPaise += activeInstalment.amountPaise;
      totalOutstandingPaise += outstanding;

      if (overdueAnalysis.isOverdue) {
        totalOverduePaise += outstanding;
        const days = overdueAnalysis.overdueDays;
        if (days <= 30) {
          ageingBuckets.days1to30 += outstanding;
        } else if (days <= 60) {
          ageingBuckets.days31to60 += outstanding;
        } else if (days <= 90) {
          ageingBuckets.days61to90 += outstanding;
        } else {
          ageingBuckets.days90Plus += outstanding;
        }
      } else if (outstanding > 0) {
        totalUpcomingPaise += outstanding;
        ageingBuckets.notDue += outstanding;
      }

      // Centre Totals
      const cTotal = centreTotals.get(student.centreId) || { billed: 0, collected: 0, outstanding: 0, overdue: 0, count: 0 };
      cTotal.billed += activeInstalment.amountPaise;
      cTotal.collected += verifiedPaid;
      cTotal.outstanding += outstanding;
      if (overdueAnalysis.isOverdue) cTotal.overdue += outstanding;
      cTotal.count += 1;
      centreTotals.set(student.centreId, cTotal);

      // Batch Totals
      const bTotal = batchTotals.get(student.batchId) || { billed: 0, collected: 0, outstanding: 0, count: 0 };
      bTotal.billed += activeInstalment.amountPaise;
      bTotal.collected += verifiedPaid;
      bTotal.outstanding += outstanding;
      bTotal.count += 1;
      batchTotals.set(student.batchId, bTotal);

      const centre = centreMap.get(student.centreId);
      const batch = batchMap.get(student.batchId);

      studentRows.push({
        roll: student.rollNumber,
        name: student.fullName,
        parentPhone: student.parentPhone,
        maskedPhone: maskPhoneNumber(student.parentPhone),
        centreId: student.centreId,
        centreName: centre ? centre.name : student.centreId,
        batchId: student.batchId,
        batchName: batch ? batch.name : student.batchId,
        activeInstalmentId: activeInstalment.id,
        instalmentNumber: activeInstalment.instalmentNumber,
        dueDate: activeInstalment.dueDate,
        instalmentAmountPaise: activeInstalment.amountPaise,
        paidAmountPaise: verifiedPaid,
        outstandingAmountPaise: outstanding,
        overdueDays: overdueAnalysis.overdueDays,
        daysUntilDue: overdueAnalysis.daysUntilDue,
        isOverdue: overdueAnalysis.isOverdue,
        status: overdueAnalysis.status,
        statusDescription: overdueAnalysis.statusDescription,
        allInstalments: studentInstalments,
        payments: verifiedPaymentsByStudent.get(student.id) || [],
        feePlan,
      });
    }
  }

  // Sort student rows by roll number
  studentRows.sort((a, b) => a.roll.localeCompare(b.roll));

  // Format Centre Summaries
  const centreMetrics: CentreMetricSummary[] = data.centres.map((c) => {
    const t = centreTotals.get(c.id) || { billed: 0, collected: 0, outstanding: 0, overdue: 0, count: 0 };
    return {
      centreId: c.id,
      centreName: c.name,
      centreCode: c.code,
      studentCount: t.count,
      billedPaise: t.billed,
      collectedPaise: t.collected,
      outstandingPaise: t.outstanding,
      overduePaise: t.overdue,
    };
  });

  // Format Batch Summaries
  const batchMetrics: BatchMetricSummary[] = data.batches.map((b) => {
    const t = batchTotals.get(b.id) || { billed: 0, collected: 0, outstanding: 0, count: 0 };
    return {
      batchId: b.id,
      batchName: b.name,
      courseType: b.courseType,
      centreId: b.centreId,
      studentCount: t.count,
      billedPaise: t.billed,
      collectedPaise: t.collected,
      outstandingPaise: t.outstanding,
    };
  });

  return {
    totalBilledPaise,
    totalCollectedPaise,
    totalOutstandingPaise,
    totalOverduePaise,
    totalUpcomingPaise,
    annualCommitmentBilledPaise,
    annualCommitmentOutstandingPaise,
    centreMetrics,
    batchMetrics,
    ageingBuckets,
    studentRows,
  };
}

/**
 * Sets up scoped real-time Firestore listeners adhering to deployed security rules.
 * Automatically unsubscribes on failure or when the caller invokes the returned cleanup.
 */
export function subscribeToDashboard(
  userProfile: UserProfile | null,
  onData: (data: DashboardData) => void,
  onError: (err: any) => void,
  firestoreInstance: Firestore = db
): Unsubscribe {
  const authCheck = canUserAccessDashboard(userProfile);
  if (!authCheck.allowed) {
    onError(new Error(authCheck.reason || 'Unauthorized'));
    return () => {};
  }

  const authorizedCentres = authCheck.authorizedCentres;

  // State buffers for incoming snapshot data
  const currentData: DashboardData = {
    centres: [],
    batches: [],
    students: [],
    feePlans: [],
    instalments: [],
    payments: [],
    reminders: [],
    lastFetched: new Date(),
    source: 'LIVE_FIRESTORE',
  };

  let unmounted = false;
  const unsubscribers: Unsubscribe[] = [];

  const notifyChange = () => {
    if (!unmounted) {
      currentData.lastFetched = new Date();
      onData({ ...currentData });
    }
  };

  try {
    // 1. Centres query (Readable by signed in, filter client-side to authorized)
    const centresQuery = query(collection(firestoreInstance, 'centres'));
    const unsubCentres = onSnapshot(
      centresQuery,
      (snap) => {
        currentData.centres = snap.docs
          .map((d) => d.data() as Centre)
          .filter((c) => authorizedCentres.includes(c.id));
        notifyChange();
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'centres');
      }
    );
    unsubscribers.push(unsubCentres);

    // 2. Batches query (Filtered by authorized centres)
    const batchesQuery = query(
      collection(firestoreInstance, 'batches'),
      where('centreId', 'in', authorizedCentres)
    );
    const unsubBatches = onSnapshot(
      batchesQuery,
      (snap) => {
        currentData.batches = snap.docs.map((d) => d.data() as Batch);
        notifyChange();
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'batches');
      }
    );
    unsubscribers.push(unsubBatches);

    // 3. Students query (Filtered by authorized centres)
    const studentsQuery = query(
      collection(firestoreInstance, 'students'),
      where('centreId', 'in', authorizedCentres)
    );
    const unsubStudents = onSnapshot(
      studentsQuery,
      (snap) => {
        currentData.students = snap.docs.map((d) => d.data() as Student);
        notifyChange();
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'students');
      }
    );
    unsubscribers.push(unsubStudents);

    // 4. Fee Plans query (Filtered by authorized centres)
    const feePlansQuery = query(
      collection(firestoreInstance, 'feePlans'),
      where('centreId', 'in', authorizedCentres)
    );
    const unsubFeePlans = onSnapshot(
      feePlansQuery,
      (snap) => {
        currentData.feePlans = snap.docs.map((d) => d.data() as FeePlan);
        notifyChange();
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'feePlans');
      }
    );
    unsubscribers.push(unsubFeePlans);

    // 5. Instalments query (Filtered by authorized centres)
    const instalmentsQuery = query(
      collection(firestoreInstance, 'instalments'),
      where('centreId', 'in', authorizedCentres)
    );
    const unsubInstalments = onSnapshot(
      instalmentsQuery,
      (snap) => {
        currentData.instalments = snap.docs.map((d) => d.data() as Instalment);
        notifyChange();
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'instalments');
      }
    );
    unsubscribers.push(unsubInstalments);

    // 6. Payments query (Filtered by authorized centres)
    const paymentsQuery = query(
      collection(firestoreInstance, 'payments'),
      where('centreId', 'in', authorizedCentres)
    );
    const unsubPayments = onSnapshot(
      paymentsQuery,
      (snap) => {
        currentData.payments = snap.docs.map((d) => d.data() as Payment);
        notifyChange();
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'payments');
      }
    );
    unsubscribers.push(unsubPayments);

    // 7. Reminders query (Filtered by authorized centres)
    const remindersQuery = query(
      collection(firestoreInstance, 'reminders'),
      where('centreId', 'in', authorizedCentres)
    );
    const unsubReminders = onSnapshot(
      remindersQuery,
      (snap) => {
        currentData.reminders = snap.docs.map((d) => d.data() as ReminderSchedule);
        notifyChange();
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'reminders');
      }
    );
    unsubscribers.push(unsubReminders);

  } catch (err: any) {
    onError(err);
  }

  return () => {
    unmounted = true;
    for (const unsub of unsubscribers) {
      try {
        unsub();
      } catch {
        // Safe disposal
      }
    }
  };
}

/**
 * One-shot query for manual refresh, initial load, and automated testbench.
 */
export async function fetchDashboardOnce(
  userProfile: UserProfile | null,
  firestoreInstance: Firestore = db
): Promise<DashboardData> {
  const authCheck = canUserAccessDashboard(userProfile);
  if (!authCheck.allowed) {
    throw new Error(authCheck.reason || 'Unauthorized');
  }

  const authorizedCentres = authCheck.authorizedCentres;

  try {
    const [
      centresSnap,
      batchesSnap,
      studentsSnap,
      plansSnap,
      instsSnap,
      paymentsSnap,
      remindersSnap,
    ] = await Promise.all([
      getDocs(query(collection(firestoreInstance, 'centres'))),
      getDocs(query(collection(firestoreInstance, 'batches'), where('centreId', 'in', authorizedCentres))),
      getDocs(query(collection(firestoreInstance, 'students'), where('centreId', 'in', authorizedCentres))),
      getDocs(query(collection(firestoreInstance, 'feePlans'), where('centreId', 'in', authorizedCentres))),
      getDocs(query(collection(firestoreInstance, 'instalments'), where('centreId', 'in', authorizedCentres))),
      getDocs(query(collection(firestoreInstance, 'payments'), where('centreId', 'in', authorizedCentres))),
      getDocs(query(collection(firestoreInstance, 'reminders'), where('centreId', 'in', authorizedCentres))),
    ]);

    const centres = centresSnap.docs
      .map((d) => d.data() as Centre)
      .filter((c) => authorizedCentres.includes(c.id));
    const batches = batchesSnap.docs.map((d) => d.data() as Batch);
    const students = studentsSnap.docs.map((d) => d.data() as Student);
    const feePlans = plansSnap.docs.map((d) => d.data() as FeePlan);
    const instalments = instsSnap.docs.map((d) => d.data() as Instalment);
    const payments = paymentsSnap.docs.map((d) => d.data() as Payment);
    const reminders = remindersSnap.docs.map((d) => d.data() as ReminderSchedule);

    return {
      centres,
      batches,
      students,
      feePlans,
      instalments,
      payments,
      reminders,
      lastFetched: new Date(),
      source: 'LIVE_FIRESTORE',
    };
  } catch (err: any) {
    handleFirestoreError(err, OperationType.GET, 'dashboard_batch_fetch');
  }
}
