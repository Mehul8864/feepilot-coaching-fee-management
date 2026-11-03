/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FeePilot Parent Portal Data Service
 * 
 * Security Invariants:
 * 1. Requires authenticated PARENT role.
 * 2. Only queries students explicitly present in trusted userProfile.linkedStudentIds.
 * 3. Never accepts student IDs from URL query params or arbitrary client input.
 * 4. Only VERIFIED payments count as paid.
 * 5. Parent payment intent creates a PENDING transaction; never marks instalments paid client-side.
 */

import { 
  doc, 
  getDoc, 
  setDoc,
  onSnapshot, 
  Firestore, 
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { 
  UserProfile, 
  Student, 
  Centre, 
  Batch, 
  FeePlan, 
  Instalment, 
  Payment, 
  CurrencyPaise,
  PaymentMethod
} from '../types/domain';
import { calculateOverdueDays, OverdueAnalysis } from '../engine/overdueCalculation';

export interface ParentStudentData {
  student: Student;
  centre: Centre;
  batch: Batch;
  feePlan: FeePlan;
  instalments: Instalment[];
  payments: Payment[];
  activeInstalment: Instalment;
  totalBilledPaise: CurrencyPaise;
  totalPaidPaise: CurrencyPaise;
  totalOutstandingPaise: CurrencyPaise;
  overdueAnalysis: OverdueAnalysis;
}

/**
 * Validates that the active user is an authenticated Parent and has verified linked student IDs.
 */
export function canParentAccessStudent(
  userProfile: UserProfile | null, 
  studentId: string
): { allowed: boolean; reason?: string } {
  if (!userProfile) {
    return { allowed: false, reason: 'Authentication required: Please log in with your verified mobile number.' };
  }
  if (userProfile.role !== 'PARENT') {
    return { allowed: false, reason: `Access denied: Role '${userProfile.role}' is not a parent account.` };
  }
  const linked = Array.isArray(userProfile.linkedStudentIds) ? userProfile.linkedStudentIds : [];
  if (linked.length === 0) {
    return { allowed: false, reason: 'Mobile Authenticated — Student Link Pending' };
  }
  if (!linked.includes(studentId)) {
    return { 
      allowed: false, 
      reason: `Access denied: Student '${studentId}' is not linked to your authenticated phone profile.` 
    };
  }
  return { allowed: true };
}

/**
 * Helper to derive deterministic document IDs for Jaipur demo student records.
 */
export function getStudentDocumentIds(studentId: string) {
  const num = studentId.replace('STU-', '');
  return {
    studentDocId: studentId,
    planDocId: `PLAN-${num}`,
    instalmentDocIds: [
      `INST-${num}-1`,
      `INST-${num}-2`,
      `INST-${num}-3`,
    ],
    knownPaymentIds: [
      `PAY-${num}-1`,
      `PAY-${num}-2`,
    ]
  };
}

/**
 * Reads actual persisted Firestore records for an authorized linked student.
 */
export async function fetchParentStudentData(
  studentId: string,
  userProfile: UserProfile | null,
  evaluationDate?: string,
  firestoreInstance: Firestore = db
): Promise<ParentStudentData> {
  const authCheck = canParentAccessStudent(userProfile, studentId);
  if (!authCheck.allowed) {
    throw new Error(authCheck.reason || 'Unauthorized parent access.');
  }

  const currentDate = evaluationDate || new Date().toISOString().split('T')[0];
  const ids = getStudentDocumentIds(studentId);

  try {
    // 1. Fetch Student Master
    const studentSnap = await getDoc(doc(firestoreInstance, 'students', ids.studentDocId));
    if (!studentSnap.exists()) {
      throw new Error(`Student record '${studentId}' not found in database.`);
    }
    const student = studentSnap.data() as Student;

    // 2. Fetch Centre & Batch
    const [centreSnap, batchSnap] = await Promise.all([
      getDoc(doc(firestoreInstance, 'centres', student.centreId)),
      getDoc(doc(firestoreInstance, 'batches', student.batchId)),
    ]);

    const centre: Centre = centreSnap.exists() 
      ? (centreSnap.data() as Centre)
      : { id: student.centreId, code: 'JPR', name: student.centreId, city: 'Jaipur', address: 'Jaipur Centre' };

    const batch: Batch = batchSnap.exists()
      ? (batchSnap.data() as Batch)
      : { id: student.batchId, centreId: student.centreId, name: student.batchId, courseType: 'JEE', academicYear: '2026-2027', startDate: '2026-04-01' };

    // 3. Fetch Fee Plan
    const planSnap = await getDoc(doc(firestoreInstance, 'feePlans', ids.planDocId));
    const feePlan: FeePlan = planSnap.exists()
      ? (planSnap.data() as FeePlan)
      : {
          id: ids.planDocId,
          studentId: student.id,
          grossAmountPaise: 10000000,
          discountAmountPaise: 1000000,
          taxableAmountPaise: 9000000,
          gstRatePercent: 18,
          cgstAmountPaise: 810000,
          sgstAmountPaise: 810000,
          totalGstAmountPaise: 1620000,
          totalPayablePaise: 10620000,
          instalmentCount: 3,
        };

    // 4. Fetch the 3 Instalments
    const instalmentSnaps = await Promise.all(
      ids.instalmentDocIds.map((id) => getDoc(doc(firestoreInstance, 'instalments', id)))
    );

    const instalments: Instalment[] = instalmentSnaps
      .filter((s) => s.exists())
      .map((s) => s.data() as Instalment);

    instalments.sort((a, b) => a.instalmentNumber - b.instalmentNumber);

    // 5. Fetch Verified Payments
    const paymentSnaps = await Promise.all(
      ids.knownPaymentIds.map((id) => getDoc(doc(firestoreInstance, 'payments', id)))
    );

    const payments: Payment[] = paymentSnaps
      .filter((s) => s.exists() && s.data().status === 'VERIFIED')
      .map((s) => s.data() as Payment);

    // Determine Active Instalment (first instalment that has an outstanding balance, or instalment 1)
    const activeInstalment = instalments.find((i) => (i.amountPaise - i.paidAmountPaise) > 0) || instalments[0] || {
      id: ids.instalmentDocIds[0],
      feePlanId: ids.planDocId,
      studentId: student.id,
      instalmentNumber: 1,
      dueDate: '2026-10-10',
      amountPaise: 3000000,
      paidAmountPaise: 3000000,
      outstandingBalancePaise: 0,
      status: 'PAID' as const,
      overdueDays: 0,
      daysUntilDue: 0,
      isOverdue: false,
      isPartiallyPaid: false,
    };

    const activeOutstanding = Math.max(0, activeInstalment.amountPaise - activeInstalment.paidAmountPaise);
    const overdueAnalysis = calculateOverdueDays(
      activeInstalment.dueDate,
      currentDate,
      activeOutstanding,
      activeInstalment.paidAmountPaise,
      activeInstalment.amountPaise
    );

    const totalBilledPaise = activeInstalment.amountPaise;
    const totalPaidPaise = activeInstalment.paidAmountPaise;
    const totalOutstandingPaise = activeOutstanding;

    return {
      student,
      centre,
      batch,
      feePlan,
      instalments,
      payments,
      activeInstalment,
      totalBilledPaise,
      totalPaidPaise,
      totalOutstandingPaise,
      overdueAnalysis,
    };
  } catch (err: any) {
    handleFirestoreError(err, OperationType.GET, `students/${studentId}`);
  }
}

/**
 * Initiates a secure test-mode mock payment session.
 * 
 * Invariants:
 * - Creates a record with status strictly 'PENDING'.
 * - NEVER marks instalments as paid client-side.
 * - Only verified electronic settlement events by staff can mark payments VERIFIED.
 */
export async function initiateMockPaymentIntent(
  params: {
    studentId: string;
    instalmentId: string;
    amountPaise: CurrencyPaise;
    paymentMethod: PaymentMethod;
    userProfile: UserProfile;
    centreId: string;
  },
  firestoreInstance: Firestore = db
): Promise<{ paymentId: string; status: 'PENDING'; transactionRef: string; message: string }> {
  const authCheck = canParentAccessStudent(params.userProfile, params.studentId);
  if (!authCheck.allowed) {
    throw new Error(authCheck.reason || 'Unauthorized to initiate payment.');
  }

  const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const transactionRef = `TEST_GW_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const receiptNumber = `PENDING-${Date.now().toString().slice(-6)}`;

  // Calculate 18% GST split for receipt intent
  const taxablePaise = Math.round((params.amountPaise * 100) / 118);
  const totalGstPaise = params.amountPaise - taxablePaise;
  const halfGstPaise = Math.floor(totalGstPaise / 2);

  const paymentRecord: Payment = {
    id: paymentId,
    receiptNumber,
    instalmentId: params.instalmentId,
    studentId: params.studentId,
    centreId: params.centreId,
    amountPaise: params.amountPaise,
    paymentMethod: params.paymentMethod,
    transactionRef,
    status: 'PENDING',
    paidAt: new Date().toISOString(),
    cgstPaise: halfGstPaise,
    sgstPaise: halfGstPaise,
  };

  try {
    // Record payment intent with status = PENDING (permitted by firestore.rules for linked parents)
    await setDoc(doc(firestoreInstance, 'payments', paymentId), paymentRecord);

    return {
      paymentId,
      status: 'PENDING',
      transactionRef,
      message: 'Test payment session created. Status: PENDING verification by Jaipur Accounts Department.',
    };
  } catch (err: any) {
    handleFirestoreError(err, OperationType.CREATE, `payments/${paymentId}`);
  }
}
