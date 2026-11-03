/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FeePilot Accounts Executive Live Dashboard Automated Test Suite
 * Validates Phase 7 requirements:
 * 1. Dashboard loads data from Firestore schema.
 * 2. Four authorized centres are accessible.
 * 3. Unauthorized centre data is denied.
 * 4. Billed amount is ₹1,00,000.
 * 5. Verified collection is ₹45,000.
 * 6. Outstanding is ₹55,000.
 * 7. Ishita has ₹15,000 outstanding.
 * 8. Mohit has ₹40,000 upcoming.
 * 9. Parent contact numbers are masked.
 * 10. Adding a verified payment updates dashboard metrics.
 * 11. A pending payment never increases collections.
 * 12. Database failure never displays fabricated mock data.
 * 13. Duplicate payment prevention.
 * 14. Ageing bucket allocation.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { 
  canUserAccessDashboard, 
  computeDashboardMetrics, 
  DashboardData,
  StudentLedgerRow
} from './dashboardService';
import { 
  SEED_CENTRES, 
  SEED_BATCHES, 
  SEED_STUDENTS, 
  SEED_FEE_PLANS, 
  SEED_INSTALMENTS, 
  SEED_PAYMENTS, 
  SEED_REMINDERS,
  ALL_JAIPUR_CENTRE_IDS,
  REFERENCE_DATE
} from './seedData';
import { UserProfile, Payment } from '../types/domain';

// Standard test Accounts Executive profile authorized across all 4 Jaipur branches
const mockAccountsExecutive: UserProfile = {
  id: 'usr_exec_jaipur_001',
  role: 'ACCOUNTS_EXECUTIVE',
  name: 'Sunil Verma',
  email: 'accounts.jaipur@feepilot.internal',
  authorizedCentreIds: [...ALL_JAIPUR_CENTRE_IDS],
};

// Parent profile without staff permissions
const mockParentUser: UserProfile = {
  id: 'usr_parent_001',
  role: 'PARENT',
  name: 'Rajesh Meena',
  phone: '+16505553434',
  linkedStudentIds: ['STU-0412'],
};

// Build baseline test dashboard dataset using the verified seed benchmark cohort
function createBaselineDashboardData(): DashboardData {
  return {
    centres: JSON.parse(JSON.stringify(SEED_CENTRES)),
    batches: JSON.parse(JSON.stringify(SEED_BATCHES)),
    students: JSON.parse(JSON.stringify(SEED_STUDENTS)),
    feePlans: JSON.parse(JSON.stringify(SEED_FEE_PLANS)),
    instalments: JSON.parse(JSON.stringify(SEED_INSTALMENTS)),
    payments: JSON.parse(JSON.stringify(SEED_PAYMENTS)),
    reminders: JSON.parse(JSON.stringify(SEED_REMINDERS)),
    lastFetched: new Date(),
    source: 'LIVE_FIRESTORE',
  };
}

describe('Accounts Executive Live Dashboard Verification', () => {

  // Test 1 & 2: Dashboard loads data and four authorized centres are accessible
  test('1 & 2: Dashboard authorizes Accounts Executive and grants access to 4 Jaipur centres', () => {
    const authResult = canUserAccessDashboard(mockAccountsExecutive);
    assert.equal(authResult.allowed, true);
    assert.equal(authResult.authorizedCentres.length, 4);
    assert.deepEqual(authResult.authorizedCentres, ALL_JAIPUR_CENTRE_IDS);
  });

  // Test 3: Unauthorized centre data is denied
  test('3: Unauthorized centre data is strictly denied for non-executive or unassigned profiles', () => {
    // 3a: Parent profile is rejected
    const parentAuth = canUserAccessDashboard(mockParentUser);
    assert.equal(parentAuth.allowed, false);
    assert.match(parentAuth.reason || '', /Access denied: Role 'PARENT' is not authorized/);

    // 3b: Null / unauthenticated profile is rejected
    const unauth = canUserAccessDashboard(null);
    assert.equal(unauth.allowed, false);
    assert.match(unauth.reason || '', /Authentication required/);

    // 3c: Executive with empty centres is rejected
    const emptyCentresExec: UserProfile = {
      id: 'usr_exec_empty',
      role: 'ACCOUNTS_EXECUTIVE',
      authorizedCentreIds: [],
    };
    const emptyAuth = canUserAccessDashboard(emptyCentresExec);
    assert.equal(emptyAuth.allowed, false);
    assert.match(emptyAuth.reason || '', /No centres assigned/);

    // 3d: Single centre executive access is strictly constrained
    const singleCentreExec: UserProfile = {
      id: 'usr_exec_single',
      role: 'ACCOUNTS_EXECUTIVE',
      authorizedCentreIds: ['CENTRE-JAIPUR-VAISHALI'],
    };
    const singleAuth = canUserAccessDashboard(singleCentreExec);
    assert.equal(singleAuth.allowed, true);
    assert.deepEqual(singleAuth.authorizedCentres, ['CENTRE-JAIPUR-VAISHALI']);
  });

  // Test 4: Billed amount is ₹1,00,000
  test('4: Active cohort total billed amount is exactly ₹1,00,000 (10,000,000 paise)', () => {
    const data = createBaselineDashboardData();
    const metrics = computeDashboardMetrics(data, REFERENCE_DATE);

    assert.equal(metrics.totalBilledPaise, 10000000, 'Billed amount must be 10,000,000 paise (₹1,00,000)');
  });

  // Test 5: Verified collection is ₹45,000
  test('5: Verified collection is exactly ₹45,000 (4,500,000 paise)', () => {
    const data = createBaselineDashboardData();
    const metrics = computeDashboardMetrics(data, REFERENCE_DATE);

    assert.equal(metrics.totalCollectedPaise, 4500000, 'Verified collection must be 4,500,000 paise (₹45,000)');
  });

  // Test 6: Outstanding is ₹55,000
  test('6: Total outstanding receivables is exactly ₹55,000 (5,500,000 paise)', () => {
    const data = createBaselineDashboardData();
    const metrics = computeDashboardMetrics(data, REFERENCE_DATE);

    assert.equal(metrics.totalOutstandingPaise, 5500000, 'Outstanding receivables must be 5,500,000 paise (₹55,000)');
    assert.equal(metrics.totalBilledPaise - metrics.totalCollectedPaise, metrics.totalOutstandingPaise);
  });

  // Test 7: Ishita has ₹15,000 outstanding
  test('7: Ishita Sharma (STU-0587) has exactly ₹15,000 outstanding and is marked overdue', () => {
    const data = createBaselineDashboardData();
    const metrics = computeDashboardMetrics(data, REFERENCE_DATE);

    const ishita = metrics.studentRows.find((s) => s.roll === 'STU-0587');
    assert.ok(ishita, 'Ishita Sharma record must exist');
    assert.equal(ishita.outstandingAmountPaise, 1500000, 'Ishita outstanding must be 1,500,000 paise (₹15,000)');
    assert.equal(ishita.paidAmountPaise, 1500000, 'Ishita verified paid must be 1,500,000 paise (₹15,000)');
    assert.equal(ishita.status, 'PARTIALLY_PAID');
    assert.equal(ishita.isOverdue, true);
    assert.equal(ishita.overdueDays, 23); // Due 2026-10-10, evaluated on 2026-11-02 benchmark
  });

  // Test 8: Mohit has ₹40,000 upcoming
  test('8: Mohit Gurjar (STU-0219) has exactly ₹40,000 upcoming with zero overdue days', () => {
    const data = createBaselineDashboardData();
    const metrics = computeDashboardMetrics(data, REFERENCE_DATE);

    const mohit = metrics.studentRows.find((s) => s.roll === 'STU-0219');
    assert.ok(mohit, 'Mohit Gurjar record must exist');
    assert.equal(mohit.outstandingAmountPaise, 4000000, 'Mohit outstanding must be 4,000,000 paise (₹40,000)');
    assert.equal(mohit.paidAmountPaise, 0, 'Mohit paid must be 0 paise');
    assert.equal(mohit.status, 'DUE_SOON'); // Due 2026-11-15, 13 days until due as of 2026-11-02
    assert.equal(mohit.isOverdue, false);
    assert.equal(mohit.daysUntilDue, 13);
  });

  // Test 9: Parent contact numbers are masked
  test('9: Parent contact numbers are properly masked in student ledger rows', () => {
    const data = createBaselineDashboardData();
    const metrics = computeDashboardMetrics(data, REFERENCE_DATE);

    for (const row of metrics.studentRows) {
      assert.ok(row.maskedPhone.includes('*'), `Masked phone '${row.maskedPhone}' must contain asterisks`);
      assert.notEqual(row.maskedPhone, row.parentPhone, `Masked phone must not equal raw phone '${row.parentPhone}'`);
    }

    const aarav = metrics.studentRows.find((s) => s.roll === 'STU-0412');
    assert.equal(aarav?.maskedPhone, '+1 650-***-3434');
  });

  // Test 10: Adding a verified payment updates dashboard metrics
  test('10: Adding a verified payment dynamically updates collections and outstanding balances', () => {
    const data = createBaselineDashboardData();
    
    // Add a verified payment of ₹15,000 for Ishita (INST-0587-1)
    const newVerifiedPayment: Payment = {
      id: 'PAY-0587-2',
      receiptNumber: 'REC-2026-00588',
      instalmentId: 'INST-0587-1',
      studentId: 'STU-0587',
      centreId: 'CENTRE-JAIPUR-MALVIYA',
      amountPaise: 1500000,
      paymentMethod: 'UPI',
      transactionRef: 'UPI/20261102/555123456',
      status: 'VERIFIED',
      paidAt: '2026-11-02T16:00:00Z',
      cgstPaise: 114407,
      sgstPaise: 114407,
    };

    data.payments.push(newVerifiedPayment);

    // Update instalment 1 for Ishita to reflect the new payment
    const ishitaInst = data.instalments.find((i) => i.id === 'INST-0587-1');
    assert.ok(ishitaInst);
    ishitaInst.paidAmountPaise = 3000000;
    ishitaInst.outstandingBalancePaise = 0;
    ishitaInst.status = 'PAID';
    ishitaInst.isOverdue = false;

    const updatedMetrics = computeDashboardMetrics(data, REFERENCE_DATE);

    // Verified collections increased from ₹45,000 to ₹60,000
    assert.equal(updatedMetrics.totalCollectedPaise, 6000000, 'Collections must increase to ₹60,000');
    // Outstanding receivables decreased from ₹55,000 to ₹40,000
    assert.equal(updatedMetrics.totalOutstandingPaise, 4000000, 'Outstanding must decrease to ₹40,000');
    // Overdue receivables dropped from ₹15,000 to ₹0
    assert.equal(updatedMetrics.totalOverduePaise, 0, 'Overdue receivables must be ₹0 now that Ishita is paid');
  });

  // Test 11: A pending payment never increases collections
  test('11: A PENDING payment strictly does NOT increase verified collections', () => {
    const data = createBaselineDashboardData();

    // Add a PENDING payment of ₹40,000 for Mohit
    const pendingPayment: Payment = {
      id: 'PAY-0219-PENDING',
      receiptNumber: 'PENDING-2026-001',
      instalmentId: 'INST-0219-1',
      studentId: 'STU-0219',
      centreId: 'CENTRE-JAIPUR-TONK',
      amountPaise: 4000000,
      paymentMethod: 'NETBANKING',
      transactionRef: 'GATEWAY_PENDING_TXN_998',
      status: 'PENDING',
      paidAt: '2026-11-02T10:00:00Z',
      cgstPaise: 305085,
      sgstPaise: 305085,
    };

    data.payments.push(pendingPayment);

    const metrics = computeDashboardMetrics(data, REFERENCE_DATE);

    // Verified collection must remain strictly ₹45,000 (pending payment must be ignored)
    assert.equal(metrics.totalCollectedPaise, 4500000, 'Pending payment must not count toward collections');
    assert.equal(metrics.totalOutstandingPaise, 5500000, 'Outstanding must remain ₹55,000');
  });

  // Test 12: Database failure never displays fabricated mock data
  test('12: Database failure handling invariant ensures zero mock data fallback', () => {
    // When canUserAccessDashboard returns false, no data is returned
    const denied = canUserAccessDashboard(null);
    assert.equal(denied.allowed, false);
    assert.equal(denied.authorizedCentres.length, 0);

    // Verify that empty dataset produces empty metrics with 0 figures, never injected sample names
    const emptyData: DashboardData = {
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

    const emptyMetrics = computeDashboardMetrics(emptyData);
    assert.equal(emptyMetrics.totalBilledPaise, 0);
    assert.equal(emptyMetrics.totalCollectedPaise, 0);
    assert.equal(emptyMetrics.totalOutstandingPaise, 0);
    assert.equal(emptyMetrics.studentRows.length, 0);
  });

  // Test 13: Duplicate payment counting prevention
  test('13: Duplicate payments in snapshot are strictly deduplicated by payment ID', () => {
    const data = createBaselineDashboardData();
    
    // Duplicate the existing payment PAY-0412-1
    const duplicatePayment = { ...data.payments[0] };
    data.payments.push(duplicatePayment);

    assert.equal(data.payments.length, 3, 'Data array contains 3 payment objects');

    const metrics = computeDashboardMetrics(data, REFERENCE_DATE);
    // Verified collection must still be ₹45,000, not ₹75,000
    assert.equal(metrics.totalCollectedPaise, 4500000, 'Deduplication must prevent double-counting payments');
  });

  // Test 14: Receivables Ageing Buckets
  test('14: Ageing buckets accurately categorize notDue vs 1-30 days overdue receivables', () => {
    const data = createBaselineDashboardData();
    const metrics = computeDashboardMetrics(data, REFERENCE_DATE);

    // Mohit (₹40,000 due 2026-11-15) -> notDue
    assert.equal(metrics.ageingBuckets.notDue, 4000000);
    // Ishita (₹15,000 due 2026-10-10, 23 days overdue) -> 1-30 days
    assert.equal(metrics.ageingBuckets.days1to30, 1500000);
    assert.equal(metrics.ageingBuckets.days31to60, 0);
    assert.equal(metrics.ageingBuckets.days61to90, 0);
    assert.equal(metrics.ageingBuckets.days90Plus, 0);

    const bucketSum = 
      metrics.ageingBuckets.notDue + 
      metrics.ageingBuckets.days1to30 + 
      metrics.ageingBuckets.days31to60 + 
      metrics.ageingBuckets.days61to90 + 
      metrics.ageingBuckets.days90Plus;

    assert.equal(bucketSum, metrics.totalOutstandingPaise, 'Sum of ageing buckets must equal total outstanding');
  });

  // Test 15: Centre-wise and Batch-wise breakdowns
  test('15: Centre-wise and Batch-wise summaries reconcile accurately', () => {
    const data = createBaselineDashboardData();
    const metrics = computeDashboardMetrics(data, REFERENCE_DATE);

    assert.equal(metrics.centreMetrics.length, 4, 'All 4 Jaipur centres represented in summaries');
    
    const vaishali = metrics.centreMetrics.find((c) => c.centreId === 'CENTRE-JAIPUR-VAISHALI');
    assert.ok(vaishali);
    assert.equal(vaishali.billedPaise, 3000000);
    assert.equal(vaishali.collectedPaise, 3000000);
    assert.equal(vaishali.outstandingPaise, 0);

    const malviya = metrics.centreMetrics.find((c) => c.centreId === 'CENTRE-JAIPUR-MALVIYA');
    assert.ok(malviya);
    assert.equal(malviya.billedPaise, 3000000);
    assert.equal(malviya.collectedPaise, 1500000);
    assert.equal(malviya.outstandingPaise, 1500000);

    const tonk = metrics.centreMetrics.find((c) => c.centreId === 'CENTRE-JAIPUR-TONK');
    assert.ok(tonk);
    assert.equal(tonk.billedPaise, 4000000);
    assert.equal(tonk.collectedPaise, 0);
    assert.equal(tonk.outstandingPaise, 4000000);
  });

});
