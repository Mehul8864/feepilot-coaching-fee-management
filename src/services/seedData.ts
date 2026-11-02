/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FeePilot Demo & Seed Data Provisioning Module
 * Client: Company A, Jaipur
 * 
 * Provisions:
 * 1. Four Jaipur coaching branch centres:
 *    - CENTRE-JAIPUR-VAISHALI (Vaishali Nagar)
 *    - CENTRE-JAIPUR-TONK (Tonk Road)
 *    - CENTRE-JAIPUR-MALVIYA (Malviya Nagar)
 *    - CENTRE-JAIPUR-VIDHYADHAR (Vidhyadhar Nagar)
 * 2. Academic Batches (JEE Advanced, NEET Medical, Foundation)
 * 3. Three benchmark sample students computed strictly via financialEngine:
 *    - Aarav Meena (STU-0412): ₹30,000 paid, ₹0 balance, 0 overdue days (PAID)
 *    - Ishita Sharma (STU-0587): ₹15,000 paid, ₹15,000 balance, 23 days overdue (PARTIALLY_PAID)
 *    - Mohit Gurjar (STU-0219): ₹0 paid, ₹40,000 balance, 13 days until due (UPCOMING)
 * 4. Fee plans, instalments, payments, and reminder schedules
 * 
 * Invariant:
 * Idempotent execution using setDoc with merge: true.
 * All monetary amounts are computed in integer paise.
 */

import { doc, setDoc, getDoc, updateDoc, Firestore } from 'firebase/firestore';
import { db } from '../firebase/config';
import { calculateFeePlan } from '../engine/feeCalculation';
import { calculateOverdueDays } from '../engine/overdueCalculation';
import { formatReminderMessage } from '../engine/reminderRules';
import { 
  Centre, 
  Batch, 
  Student, 
  FeePlan, 
  Instalment, 
  Payment, 
  ReminderSchedule,
  UserProfile 
} from '../types/domain';

export const REFERENCE_DATE = '2026-11-02';

// 1. Four Jaipur Centres
export const SEED_CENTRES: Centre[] = [
  {
    id: 'CENTRE-JAIPUR-VAISHALI',
    code: 'JPR-VSH',
    name: 'Vaishali Nagar Centre',
    city: 'Jaipur',
    address: 'Plot 12, Amrapali Marg, Vaishali Nagar, Jaipur, Rajasthan 302021',
  },
  {
    id: 'CENTRE-JAIPUR-TONK',
    code: 'JPR-TNK',
    name: 'Tonk Road Centre',
    city: 'Jaipur',
    address: 'B-4, Tonk Road, Near Gopalpura Flyover, Jaipur, Rajasthan 302018',
  },
  {
    id: 'CENTRE-JAIPUR-MALVIYA',
    code: 'JPR-MLV',
    name: 'Malviya Nagar Centre',
    city: 'Jaipur',
    address: 'Sector 3, Calgiri Marg, Malviya Nagar, Jaipur, Rajasthan 302017',
  },
  {
    id: 'CENTRE-JAIPUR-VIDHYADHAR',
    code: 'JPR-VDH',
    name: 'Vidhyadhar Nagar Centre',
    city: 'Jaipur',
    address: 'Central Spine, Sector 2, Vidhyadhar Nagar, Jaipur, Rajasthan 302039',
  },
];

export const ALL_JAIPUR_CENTRE_IDS = SEED_CENTRES.map((c) => c.id);

// 2. Academic Batches
export const SEED_BATCHES: Batch[] = [
  {
    id: 'BATCH-JAIPUR-JEE-2025-A',
    centreId: 'CENTRE-JAIPUR-VAISHALI',
    name: 'JEE 2027 Morning Batch A-1',
    courseType: 'JEE',
    academicYear: '2026-2027',
    startDate: '2026-04-01',
  },
  {
    id: 'BATCH-JAIPUR-JEE-2025-B',
    centreId: 'CENTRE-JAIPUR-MALVIYA',
    name: 'JEE 2027 Evening Batch B-2',
    courseType: 'JEE',
    academicYear: '2026-2027',
    startDate: '2026-04-01',
  },
  {
    id: 'BATCH-JAIPUR-NEET-2025-A',
    centreId: 'CENTRE-JAIPUR-TONK',
    name: 'NEET 2027 Morning Medical Super-30',
    courseType: 'NEET',
    academicYear: '2026-2027',
    startDate: '2026-04-01',
  },
  {
    id: 'BATCH-JAIPUR-FND-2025-A',
    centreId: 'CENTRE-JAIPUR-VIDHYADHAR',
    name: 'Foundation Class 10th Olympiad Batch',
    courseType: 'FOUNDATION',
    academicYear: '2026-2027',
    startDate: '2026-04-15',
  },
];

// 3. Students
export const SEED_STUDENTS: Student[] = [
  {
    id: 'STU-0412',
    rollNumber: 'STU-0412',
    fullName: 'Aarav Meena',
    parentName: 'Rajesh Meena',
    parentPhone: '+16505553434', // Configured Demo Parent Phone
    parentLanguage: 'hi',
    centreId: 'CENTRE-JAIPUR-VAISHALI',
    batchId: 'BATCH-JAIPUR-JEE-2025-A',
    enrolledDate: '2026-04-05',
    consentGiven: true,
  },
  {
    id: 'STU-0587',
    rollNumber: 'STU-0587',
    fullName: 'Ishita Sharma',
    parentName: 'Sanjay Sharma',
    parentPhone: '+91 98290 67890',
    parentLanguage: 'en',
    centreId: 'CENTRE-JAIPUR-MALVIYA',
    batchId: 'BATCH-JAIPUR-JEE-2025-B',
    enrolledDate: '2026-04-08',
    consentGiven: true,
  },
  {
    id: 'STU-0219',
    rollNumber: 'STU-0219',
    fullName: 'Mohit Gurjar',
    parentName: 'Ramprasad Gurjar',
    parentPhone: '+91 97840 54321',
    parentLanguage: 'hi',
    centreId: 'CENTRE-JAIPUR-TONK',
    batchId: 'BATCH-JAIPUR-NEET-2025-A',
    enrolledDate: '2026-04-12',
    consentGiven: true,
  },
];

// Generate Fee Plans strictly using the financial calculation engine
// Student 1: Aarav Meena
const aaravPlanCalc = calculateFeePlan(10000000, 1000000, 18, 3); // ₹1,00,000 gross, ₹10,000 discount, 18% GST -> 3 instalments
// Student 2: Ishita Sharma
const ishitaPlanCalc = calculateFeePlan(10000000, 1000000, 18, 3);
// Student 3: Mohit Gurjar
const mohitPlanCalc = calculateFeePlan(12000000, 0, 18, 3); // ₹1,20,000 gross, ₹0 discount, 18% GST -> 3 instalments

export const SEED_FEE_PLANS: (FeePlan & { centreId: string })[] = [
  {
    id: 'PLAN-0412',
    studentId: 'STU-0412',
    centreId: 'CENTRE-JAIPUR-VAISHALI',
    grossAmountPaise: aaravPlanCalc.grossAmountPaise,
    discountAmountPaise: aaravPlanCalc.discountAmountPaise,
    discountReason: 'Merit Scholarship (Company A Jaipur Screening Test)',
    taxableAmountPaise: aaravPlanCalc.taxableAmountPaise,
    gstRatePercent: aaravPlanCalc.gstRatePercent,
    cgstAmountPaise: aaravPlanCalc.cgstAmountPaise,
    sgstAmountPaise: aaravPlanCalc.sgstAmountPaise,
    totalGstAmountPaise: aaravPlanCalc.totalGstAmountPaise,
    totalPayablePaise: aaravPlanCalc.totalPayablePaise,
    instalmentCount: aaravPlanCalc.instalmentCount,
  },
  {
    id: 'PLAN-0587',
    studentId: 'STU-0587',
    centreId: 'CENTRE-JAIPUR-MALVIYA',
    grossAmountPaise: ishitaPlanCalc.grossAmountPaise,
    discountAmountPaise: ishitaPlanCalc.discountAmountPaise,
    discountReason: 'Early Admission Rebate',
    taxableAmountPaise: ishitaPlanCalc.taxableAmountPaise,
    gstRatePercent: ishitaPlanCalc.gstRatePercent,
    cgstAmountPaise: ishitaPlanCalc.cgstAmountPaise,
    sgstAmountPaise: ishitaPlanCalc.sgstAmountPaise,
    totalGstAmountPaise: ishitaPlanCalc.totalGstAmountPaise,
    totalPayablePaise: ishitaPlanCalc.totalPayablePaise,
    instalmentCount: ishitaPlanCalc.instalmentCount,
  },
  {
    id: 'PLAN-0219',
    studentId: 'STU-0219',
    centreId: 'CENTRE-JAIPUR-TONK',
    grossAmountPaise: mohitPlanCalc.grossAmountPaise,
    discountAmountPaise: mohitPlanCalc.discountAmountPaise,
    taxableAmountPaise: mohitPlanCalc.taxableAmountPaise,
    gstRatePercent: mohitPlanCalc.gstRatePercent,
    cgstAmountPaise: mohitPlanCalc.cgstAmountPaise,
    sgstAmountPaise: mohitPlanCalc.sgstAmountPaise,
    totalGstAmountPaise: mohitPlanCalc.totalGstAmountPaise,
    totalPayablePaise: mohitPlanCalc.totalPayablePaise,
    instalmentCount: mohitPlanCalc.instalmentCount,
  },
];

// Instalments with exact benchmark amounts
// 1. Aarav: Instalment 1 = ₹30,000 paid, zero balance
const aaravInstalmentCalc = calculateOverdueDays('2026-10-10', REFERENCE_DATE, 0, 3000000, 3000000);
// 2. Ishita: Instalment 1 = ₹30,000, ₹15,000 paid, ₹15,000 balance, 23 days overdue
const ishitaInstalmentCalc = calculateOverdueDays('2026-10-10', REFERENCE_DATE, 1500000, 1500000, 3000000);
// 3. Mohit: Instalment 1 = ₹40,000, zero paid, 13 days until due
const mohitInstalmentCalc = calculateOverdueDays('2026-11-15', REFERENCE_DATE, 4000000, 0, 4000000);

export const SEED_INSTALMENTS: (Instalment & { centreId: string })[] = [
  {
    id: 'INST-0412-1',
    feePlanId: 'PLAN-0412',
    studentId: 'STU-0412',
    centreId: 'CENTRE-JAIPUR-VAISHALI',
    instalmentNumber: 1,
    dueDate: '2026-10-10',
    amountPaise: 3000000,
    paidAmountPaise: 3000000,
    outstandingBalancePaise: 0,
    status: aaravInstalmentCalc.status,
    overdueDays: aaravInstalmentCalc.overdueDays,
    daysUntilDue: aaravInstalmentCalc.daysUntilDue,
    isOverdue: aaravInstalmentCalc.isOverdue,
    isPartiallyPaid: aaravInstalmentCalc.isPartiallyPaid,
  },
  {
    id: 'INST-0587-1',
    feePlanId: 'PLAN-0587',
    studentId: 'STU-0587',
    centreId: 'CENTRE-JAIPUR-MALVIYA',
    instalmentNumber: 1,
    dueDate: '2026-10-10',
    amountPaise: 3000000,
    paidAmountPaise: 1500000,
    outstandingBalancePaise: 1500000,
    status: ishitaInstalmentCalc.status,
    overdueDays: ishitaInstalmentCalc.overdueDays,
    daysUntilDue: ishitaInstalmentCalc.daysUntilDue,
    isOverdue: ishitaInstalmentCalc.isOverdue,
    isPartiallyPaid: ishitaInstalmentCalc.isPartiallyPaid,
  },
  {
    id: 'INST-0219-1',
    feePlanId: 'PLAN-0219',
    studentId: 'STU-0219',
    centreId: 'CENTRE-JAIPUR-TONK',
    instalmentNumber: 1,
    dueDate: '2026-11-15',
    amountPaise: 4000000,
    paidAmountPaise: 0,
    outstandingBalancePaise: 4000000,
    status: mohitInstalmentCalc.status,
    overdueDays: mohitInstalmentCalc.overdueDays,
    daysUntilDue: mohitInstalmentCalc.daysUntilDue,
    isOverdue: mohitInstalmentCalc.isOverdue,
    isPartiallyPaid: mohitInstalmentCalc.isPartiallyPaid,
  },
];

// Verified Payments & Receipts
export const SEED_PAYMENTS: (Payment & { centreId: string })[] = [
  {
    id: 'PAY-0412-1',
    receiptNumber: 'REC-2026-00412',
    instalmentId: 'INST-0412-1',
    studentId: 'STU-0412',
    centreId: 'CENTRE-JAIPUR-VAISHALI',
    amountPaise: 3000000,
    paymentMethod: 'UPI',
    transactionRef: 'UPI/20261009/984321045',
    status: 'VERIFIED',
    paidAt: '2026-10-09T14:22:10Z',
    cgstPaise: 228814, // 9% CGST component
    sgstPaise: 228814, // 9% SGST component
  },
  {
    id: 'PAY-0587-1',
    receiptNumber: 'REC-2026-00587',
    instalmentId: 'INST-0587-1',
    studentId: 'STU-0587',
    centreId: 'CENTRE-JAIPUR-MALVIYA',
    amountPaise: 1500000,
    paymentMethod: 'NETBANKING',
    transactionRef: 'NEFT/HDFC/883920194',
    status: 'VERIFIED',
    paidAt: '2026-10-10T11:05:44Z',
    cgstPaise: 114407,
    sgstPaise: 114407,
  },
];

// Reminders (Aarav: Cancelled by full payment; Ishita: Active for ₹15,000 overdue)
export const SEED_REMINDERS: (ReminderSchedule & { centreId: string })[] = [
  {
    id: 'REM-0412-1',
    instalmentId: 'INST-0412-1',
    studentId: 'STU-0412',
    centreId: 'CENTRE-JAIPUR-VAISHALI',
    stage: 'ON_DUE_DATE',
    scheduledDate: '2026-10-10',
    language: 'hi',
    amountDuePaise: 0,
    messageText: formatReminderMessage('Aarav Meena', 'ON_DUE_DATE', 0, '2026-10-10', 'hi'),
    status: 'CANCELLED_BY_PAYMENT',
    cancelledAt: '2026-10-09T14:22:15Z',
    cancellationReason: 'Full payment verified under receipt REC-2026-00412',
  },
  {
    id: 'REM-0587-1',
    instalmentId: 'INST-0587-1',
    studentId: 'STU-0587',
    centreId: 'CENTRE-JAIPUR-MALVIYA',
    stage: 'OVERDUE_15D',
    scheduledDate: '2026-10-25',
    language: 'en',
    amountDuePaise: 1500000,
    messageText: formatReminderMessage('Ishita Sharma', 'OVERDUE_15D', 1500000, '2026-10-10', 'en'),
    status: 'SCHEDULED',
  },
];

/**
 * Idempotent Firestore Seeding Function.
 * Uses setDoc with merge: true to avoid wiping or overwriting records unexpectedly.
 */
export async function seedFeePilotDemoData(firestoreInstance: Firestore = db): Promise<{
  centresCount: number;
  batchesCount: number;
  studentsCount: number;
  feePlansCount: number;
  instalmentsCount: number;
  paymentsCount: number;
  remindersCount: number;
}> {
  // 1. Seed Centres
  for (const centre of SEED_CENTRES) {
    await setDoc(doc(firestoreInstance, 'centres', centre.id), centre, { merge: true });
  }

  // 2. Seed Batches
  for (const batch of SEED_BATCHES) {
    await setDoc(doc(firestoreInstance, 'batches', batch.id), batch, { merge: true });
  }

  // 3. Seed Students
  for (const student of SEED_STUDENTS) {
    await setDoc(doc(firestoreInstance, 'students', student.id), student, { merge: true });
  }

  // 4. Seed Fee Plans
  for (const plan of SEED_FEE_PLANS) {
    await setDoc(doc(firestoreInstance, 'feePlans', plan.id), plan, { merge: true });
  }

  // 5. Seed Instalments
  for (const instalment of SEED_INSTALMENTS) {
    await setDoc(doc(firestoreInstance, 'instalments', instalment.id), instalment, { merge: true });
  }

  // 6. Seed Payments
  for (const payment of SEED_PAYMENTS) {
    await setDoc(doc(firestoreInstance, 'payments', payment.id), payment, { merge: true });
  }

  // 7. Seed Reminders
  for (const reminder of SEED_REMINDERS) {
    await setDoc(doc(firestoreInstance, 'reminders', reminder.id), reminder, { merge: true });
  }

  return {
    centresCount: SEED_CENTRES.length,
    batchesCount: SEED_BATCHES.length,
    studentsCount: SEED_STUDENTS.length,
    feePlansCount: SEED_FEE_PLANS.length,
    instalmentsCount: SEED_INSTALMENTS.length,
    paymentsCount: SEED_PAYMENTS.length,
    remindersCount: SEED_REMINDERS.length,
  };
}

/**
 * Administrative helper: Links an authenticated Parent UID to a student roll number.
 * Note: Must be invoked through trusted server context or admin tooling.
 */
export async function linkParentUidToStudent(
  parentUid: string,
  studentId: string,
  firestoreInstance: Firestore = db
): Promise<void> {
  const userRef = doc(firestoreInstance, 'users', parentUid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error(`Cannot link student: User profile '${parentUid}' does not exist.`);
  }

  const userData = userSnap.data() as UserProfile;
  if (userData.role !== 'PARENT') {
    throw new Error(`Cannot link student: User '${parentUid}' is not a PARENT (role=${userData.role}).`);
  }

  const currentLinks = Array.isArray(userData.linkedStudentIds) ? userData.linkedStudentIds : [];
  if (!currentLinks.includes(studentId)) {
    const updatedLinks = [...currentLinks, studentId];
    await updateDoc(userRef, { linkedStudentIds: updatedLinks });
  }
}
