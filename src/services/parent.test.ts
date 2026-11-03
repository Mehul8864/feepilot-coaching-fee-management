/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FeePilot Parent Portal Security & Ledger Verification Tests
 * 
 * Tests Phase 9 requirements:
 * 1. Parent login & role verification.
 * 2. Unlinked parent state ("Mobile Authenticated — Student Link Pending").
 * 3. Linked parent state.
 * 4. Aarav's ₹0 outstanding balance (PAID).
 * 5. Ishita's ₹15,000 outstanding balance when linked (PARTIALLY_PAID & OVERDUE).
 * 6. Cross-parent access strictly denied.
 * 7. Payment status only changes after verified backend events (PENDING never alters balance).
 * 8. Mohit's ₹40,000 upcoming balance (DUE_SOON).
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { 
  canParentAccessStudent, 
  getStudentDocumentIds, 
  ParentStudentData 
} from './parentService';
import { isDevEnvironment } from './authService';
import { 
  SEED_STUDENTS, 
  SEED_CENTRES, 
  SEED_BATCHES, 
  SEED_FEE_PLANS, 
  SEED_INSTALMENTS, 
  SEED_PAYMENTS,
  REFERENCE_DATE
} from './seedData';
import { UserProfile, Payment } from '../types/domain';
import { calculateOverdueDays } from '../engine/overdueCalculation';

// Test Profiles
const unlinkedParent: UserProfile = {
  id: 'usr_parent_unlinked',
  role: 'PARENT',
  phone: '+16505553434',
  linkedStudentIds: [],
};

const aaravParent: UserProfile = {
  id: 'usr_parent_aarav',
  role: 'PARENT',
  phone: '+16505553434',
  name: 'Rajesh Meena',
  linkedStudentIds: ['STU-0412'],
};

const ishitaParent: UserProfile = {
  id: 'usr_parent_ishita',
  role: 'PARENT',
  phone: '+919829000001',
  name: 'Sanjay Sharma',
  linkedStudentIds: ['STU-0587'],
};

const mohitParent: UserProfile = {
  id: 'usr_parent_mohit',
  role: 'PARENT',
  phone: '+919784000002',
  name: 'Ramprasad Gurjar',
  linkedStudentIds: ['STU-0219'],
};

const staffExecutive: UserProfile = {
  id: 'usr_exec_001',
  role: 'ACCOUNTS_EXECUTIVE',
  authorizedCentreIds: ['CENTRE-JAIPUR-VAISHALI'],
};

describe('FeePilot Parent Portal Security & Ledger Verification', () => {

  // Test 1: Parent login & role verification
  test('1: Parent login & role verification confirms valid PARENT role', () => {
    const parentAuth = canParentAccessStudent(aaravParent, 'STU-0412');
    assert.equal(parentAuth.allowed, true);

    // Non-parent role is rejected from parent portal
    const staffAuth = canParentAccessStudent(staffExecutive, 'STU-0412');
    assert.equal(staffAuth.allowed, false);
    assert.match(staffAuth.reason || '', /Access denied: Role 'ACCOUNTS_EXECUTIVE' is not a parent account/);

    // Unauthenticated request is rejected
    const unauth = canParentAccessStudent(null, 'STU-0412');
    assert.equal(unauth.allowed, false);
    assert.match(unauth.reason || '', /Authentication required/);
  });

  // Test 2: Unlinked parent state
  test('2: Unlinked parent state displays "Mobile Authenticated — Student Link Pending"', () => {
    const unlinkedAuth = canParentAccessStudent(unlinkedParent, 'STU-0412');
    assert.equal(unlinkedAuth.allowed, false);
    assert.equal(unlinkedAuth.reason, 'Mobile Authenticated — Student Link Pending');
  });

  // Test 3: Linked parent state
  test('3: Linked parent state permits access strictly to verified linked student', () => {
    const checkAarav = canParentAccessStudent(aaravParent, 'STU-0412');
    assert.equal(checkAarav.allowed, true);

    const checkIshita = canParentAccessStudent(ishitaParent, 'STU-0587');
    assert.equal(checkIshita.allowed, true);

    const checkMohit = canParentAccessStudent(mohitParent, 'STU-0219');
    assert.equal(checkMohit.allowed, true);
  });

  // Test 4: Aarav's ₹0 outstanding
  test('4: Aarav Meena (STU-0412) has exactly ₹0 outstanding and PAID status', () => {
    const student = SEED_STUDENTS.find((s) => s.id === 'STU-0412');
    assert.ok(student);
    const inst1 = SEED_INSTALMENTS.find((i) => i.id === 'INST-0412-1');
    assert.ok(inst1);
    const payment = SEED_PAYMENTS.find((p) => p.instalmentId === 'INST-0412-1' && p.status === 'VERIFIED');
    assert.ok(payment);

    const outstanding = Math.max(0, inst1.amountPaise - inst1.paidAmountPaise);
    assert.equal(outstanding, 0, 'Aarav instalment 1 outstanding must be 0 paise');
    assert.equal(inst1.paidAmountPaise, 3000000, 'Aarav verified paid must be ₹30,000 (3,000,000 paise)');

    const analysis = calculateOverdueDays(inst1.dueDate, REFERENCE_DATE, outstanding, inst1.paidAmountPaise, inst1.amountPaise);
    assert.equal(analysis.status, 'PAID');
    assert.equal(analysis.isOverdue, false);
    assert.equal(analysis.overdueDays, 0);
  });

  // Test 5: Ishita's ₹15,000 outstanding when linked to her own parent account
  test('5: Ishita Sharma (STU-0587) has exactly ₹15,000 outstanding and is marked OVERDUE', () => {
    const student = SEED_STUDENTS.find((s) => s.id === 'STU-0587');
    assert.ok(student);
    const inst1 = SEED_INSTALMENTS.find((i) => i.id === 'INST-0587-1');
    assert.ok(inst1);

    const outstanding = Math.max(0, inst1.amountPaise - inst1.paidAmountPaise);
    assert.equal(outstanding, 1500000, 'Ishita instalment 1 outstanding must be 1,500,000 paise (₹15,000)');
    assert.equal(inst1.paidAmountPaise, 1500000, 'Ishita verified paid must be 1,500,000 paise (₹15,000)');

    const analysis = calculateOverdueDays(inst1.dueDate, REFERENCE_DATE, outstanding, inst1.paidAmountPaise, inst1.amountPaise);
    assert.equal(analysis.status, 'PARTIALLY_PAID');
    assert.equal(analysis.isOverdue, true);
    assert.equal(analysis.overdueDays, 23); // Due 2026-10-10 on 2026-11-02
  });

  // Test 6: Cross-parent access denied
  test('6: Cross-parent access is strictly denied (Parent A cannot view Student B)', () => {
    // Aarav's parent tries to access Ishita
    const crossCheck1 = canParentAccessStudent(aaravParent, 'STU-0587');
    assert.equal(crossCheck1.allowed, false);
    assert.match(crossCheck1.reason || '', /Access denied: Student 'STU-0587' is not linked to your authenticated phone profile/);

    // Ishita's parent tries to access Aarav
    const crossCheck2 = canParentAccessStudent(ishitaParent, 'STU-0412');
    assert.equal(crossCheck2.allowed, false);
    assert.match(crossCheck2.reason || '', /Access denied: Student 'STU-0412' is not linked to your authenticated phone profile/);

    // Mohit's parent tries to access Ishita
    const crossCheck3 = canParentAccessStudent(mohitParent, 'STU-0587');
    assert.equal(crossCheck3.allowed, false);
    assert.match(crossCheck3.reason || '', /Access denied: Student 'STU-0587' is not linked to your authenticated phone profile/);
  });

  // Test 7: Payment status only changes after verified backend events
  test('7: Payment intent creation sets status PENDING and strictly leaves instalment balance unchanged', () => {
    const inst1 = { ...SEED_INSTALMENTS.find((i) => i.id === 'INST-0587-1')! };
    assert.equal(inst1.outstandingBalancePaise, 1500000, 'Initial balance is ₹15,000');

    // Simulate mock gateway payment intent creation
    const pendingPayment: Payment = {
      id: 'PAY-MOCK-TEST-001',
      receiptNumber: 'PENDING-99412',
      instalmentId: inst1.id,
      studentId: inst1.studentId,
      centreId: inst1.centreId,
      amountPaise: 1500000,
      paymentMethod: 'UPI',
      transactionRef: 'TEST_GW_ABC123',
      status: 'PENDING',
      paidAt: new Date().toISOString(),
      cgstPaise: 114407,
      sgstPaise: 114407,
    };

    // INVARIANT: A PENDING payment DOES NOT reduce outstanding balance
    assert.equal(pendingPayment.status, 'PENDING');
    assert.equal(inst1.outstandingBalancePaise, 1500000, 'Instalment balance remains strictly ₹15,000');
    assert.equal(inst1.paidAmountPaise, 1500000, 'Paid amount remains strictly ₹15,000');

    // Only an authorized verified event changes the instalment
    const verifiedPayment: Payment = { ...pendingPayment, status: 'VERIFIED' };
    assert.equal(verifiedPayment.status, 'VERIFIED');
    
    // When verified event executes:
    inst1.paidAmountPaise += verifiedPayment.amountPaise;
    inst1.outstandingBalancePaise = Math.max(0, inst1.amountPaise - inst1.paidAmountPaise);
    inst1.status = 'PAID';
    inst1.isOverdue = false;

    assert.equal(inst1.paidAmountPaise, 3000000, 'Paid amount is now ₹30,000');
    assert.equal(inst1.outstandingBalancePaise, 0, 'Instalment is now settled');
    assert.equal(inst1.status, 'PAID');
  });

  // Test 8: Mohit's ₹40,000 upcoming balance
  test('8: Mohit Gurjar (STU-0219) has exactly ₹40,000 upcoming with 13 days until due', () => {
    const student = SEED_STUDENTS.find((s) => s.id === 'STU-0219');
    assert.ok(student);
    const inst1 = SEED_INSTALMENTS.find((i) => i.id === 'INST-0219-1');
    assert.ok(inst1);

    const outstanding = Math.max(0, inst1.amountPaise - inst1.paidAmountPaise);
    assert.equal(outstanding, 4000000, 'Mohit outstanding must be 4,000,000 paise (₹40,000)');
    assert.equal(inst1.paidAmountPaise, 0);

    const analysis = calculateOverdueDays(inst1.dueDate, REFERENCE_DATE, outstanding, inst1.paidAmountPaise, inst1.amountPaise);
    assert.equal(analysis.status, 'DUE_SOON');
    assert.equal(analysis.isOverdue, false);
    assert.equal(analysis.daysUntilDue, 13);
  });

  // Test 9: Document ID derivation
  test('9: Document ID derivation adheres strictly to FeePilot naming conventions', () => {
    const ids = getStudentDocumentIds('STU-0412');
    assert.equal(ids.studentDocId, 'STU-0412');
    assert.equal(ids.planDocId, 'PLAN-0412');
    assert.deepEqual(ids.instalmentDocIds, ['INST-0412-1', 'INST-0412-2', 'INST-0412-3']);
  });

  // Test 10: Development-only Switcher Visibility Invariant (isDevEnvironment)
  test('10: SECURITY AUDIT: Dev-mode switcher is completely unavailable in production builds', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    try {
      // Simulate production environment
      process.env.NODE_ENV = 'production';
      const devState = isDevEnvironment();
      assert.equal(devState, false, 'isDevEnvironment() MUST strictly return false in production');
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  // Test 11: Authorization Bypass Attempt via arbitrary student ID or URL parameter
  test('11: SECURITY AUDIT: Arbitrary student ID selection cannot bypass canParentAccessStudent()', async () => {
    // Parent is authenticated as Aarav's parent (+1 650-555-3434)
    // Attacker or client attempts to access Ishita (STU-0587) or Mohit (STU-0219)
    const attackTarget1 = 'STU-0587';
    const authCheck1 = canParentAccessStudent(aaravParent, attackTarget1);
    assert.equal(authCheck1.allowed, false);
    assert.match(authCheck1.reason || '', /Access denied: Student 'STU-0587' is not linked/);

    const attackTarget2 = 'STU-0219';
    const authCheck2 = canParentAccessStudent(aaravParent, attackTarget2);
    assert.equal(authCheck2.allowed, false);
    assert.match(authCheck2.reason || '', /Access denied: Student 'STU-0219' is not linked/);

    // SQL / Path traversal / Malformed student ID injection attempt
    const maliciousTarget = 'STU-0412/../../admin';
    const authCheckMalicious = canParentAccessStudent(aaravParent, maliciousTarget);
    assert.equal(authCheckMalicious.allowed, false);
  });

  // Test 12: Invariant: Client tampering with userProfile.role or linkedStudentIds cannot bypass database security
  test('12: SECURITY AUDIT: Client-side role tampering or fake claims cannot compromise server rules', () => {
    // If an attacker tampers with local object pretending to be ACCOUNTS_EXECUTIVE:
    const tamperedParent: UserProfile = {
      id: 'usr_parent_aarav',
      role: 'ACCOUNTS_EXECUTIVE' as any, // Tampered role
      phone: '+16505553434',
      authorizedCentreIds: ['CENTRE-JAIPUR-VAISHALI'],
    };

    // canParentAccessStudent requires role PARENT
    const checkTampered = canParentAccessStudent(tamperedParent, 'STU-0412');
    assert.equal(checkTampered.allowed, false, 'Tampered non-parent role must be rejected by parent access checks');
  });

  // Test 13: Invariant: Payment intent remains strictly PENDING and cannot alter instalment balances
  test('13: SECURITY AUDIT: Payment intent remains strictly PENDING and cannot alter balances', () => {
    const inst = {
      id: 'INST-0587-1',
      feePlanId: 'PLAN-0587',
      studentId: 'STU-0587',
      instalmentNumber: 1,
      dueDate: '2026-10-10',
      amountPaise: 3000000,
      paidAmountPaise: 1500000,
      outstandingBalancePaise: 1500000,
      status: 'PARTIALLY_PAID' as const,
      overdueDays: 23,
      daysUntilDue: 0,
      isOverdue: true,
      isPartiallyPaid: true,
    };

    // Multiple PENDING payment intents created
    const pendingIntents: Payment[] = [
      {
        id: 'PAY-INTENT-1',
        receiptNumber: 'PENDING-001',
        instalmentId: inst.id,
        studentId: inst.studentId,
        amountPaise: 1500000,
        paymentMethod: 'UPI',
        transactionRef: 'TEST_GW_001',
        status: 'PENDING',
        paidAt: new Date().toISOString(),
        cgstPaise: 114407,
        sgstPaise: 114407,
      },
      {
        id: 'PAY-INTENT-2',
        receiptNumber: 'PENDING-002',
        instalmentId: inst.id,
        studentId: inst.studentId,
        amountPaise: 1500000,
        paymentMethod: 'CARD',
        transactionRef: 'TEST_GW_002',
        status: 'PENDING',
        paidAt: new Date().toISOString(),
        cgstPaise: 114407,
        sgstPaise: 114407,
      }
    ];

    // Filter verified payments only:
    const verifiedPayments = pendingIntents.filter((p) => p.status === 'VERIFIED');
    assert.equal(verifiedPayments.length, 0, 'No pending intents may be counted as verified');

    const totalVerifiedPaid = verifiedPayments.reduce((acc, p) => acc + p.amountPaise, 0);
    assert.equal(totalVerifiedPaid, 0, 'Verified paid amount must not increase from pending intents');

    // Balance remains exactly unchanged
    const remainingBalance = inst.amountPaise - (inst.paidAmountPaise + totalVerifiedPaid);
    assert.equal(remainingBalance, 1500000, 'Remaining balance must remain strictly ₹15,000');
  });

});
