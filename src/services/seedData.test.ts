/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FeePilot Seed Data & Administrative Provisioning Unit Tests
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
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
import { calculateOverdueDays } from '../engine/overdueCalculation';

test('SEED CENTRES: Exactly 4 Jaipur branch centres provisioned', () => {
  assert.strictEqual(SEED_CENTRES.length, 4);
  assert.deepStrictEqual(ALL_JAIPUR_CENTRE_IDS, [
    'CENTRE-JAIPUR-VAISHALI',
    'CENTRE-JAIPUR-TONK',
    'CENTRE-JAIPUR-MALVIYA',
    'CENTRE-JAIPUR-VIDHYADHAR',
  ]);

  for (const centre of SEED_CENTRES) {
    assert.ok(centre.id.startsWith('CENTRE-JAIPUR-'));
    assert.strictEqual(centre.city, 'Jaipur');
    assert.ok(centre.address.includes('Jaipur, Rajasthan'));
  }
});

test('SEED BATCHES: Valid academic batches mapped to Jaipur centres', () => {
  assert.strictEqual(SEED_BATCHES.length, 4);
  for (const batch of SEED_BATCHES) {
    assert.ok(ALL_JAIPUR_CENTRE_IDS.includes(batch.centreId));
    assert.ok(['JEE', 'NEET', 'FOUNDATION'].includes(batch.courseType));
  }
});

test('SEED COHORT: Sample student financial calculations match benchmark', () => {
  // 1. Aarav Meena (STU-0412) - Vaishali Nagar
  const aarav = SEED_STUDENTS.find((s) => s.id === 'STU-0412');
  assert.ok(aarav);
  assert.strictEqual(aarav.centreId, 'CENTRE-JAIPUR-VAISHALI');
  assert.strictEqual(aarav.parentPhone, '+16505553434');

  const aaravInstalment = SEED_INSTALMENTS.find((i) => i.studentId === 'STU-0412');
  assert.ok(aaravInstalment);
  assert.strictEqual(aaravInstalment.paidAmountPaise, 3000000); // ₹30,000 paid
  assert.strictEqual(aaravInstalment.outstandingBalancePaise, 0); // ₹0 balance
  assert.strictEqual(aaravInstalment.status, 'PAID');
  assert.strictEqual(aaravInstalment.overdueDays, 0);

  const aaravPayment = SEED_PAYMENTS.find((p) => p.studentId === 'STU-0412');
  assert.ok(aaravPayment);
  assert.strictEqual(aaravPayment.amountPaise, 3000000);
  assert.strictEqual(aaravPayment.status, 'VERIFIED');

  const aaravReminder = SEED_REMINDERS.find((r) => r.studentId === 'STU-0412');
  assert.ok(aaravReminder);
  assert.strictEqual(aaravReminder.status, 'CANCELLED_BY_PAYMENT');

  // 2. Ishita Sharma (STU-0587) - Malviya Nagar
  const ishita = SEED_STUDENTS.find((s) => s.id === 'STU-0587');
  assert.ok(ishita);
  const ishitaInstalment = SEED_INSTALMENTS.find((i) => i.studentId === 'STU-0587');
  assert.ok(ishitaInstalment);
  assert.strictEqual(ishitaInstalment.amountPaise, 3000000); // ₹30,000 total due
  assert.strictEqual(ishitaInstalment.paidAmountPaise, 1500000); // ₹15,000 paid
  assert.strictEqual(ishitaInstalment.outstandingBalancePaise, 1500000); // ₹15,000 balance
  assert.strictEqual(ishitaInstalment.status, 'PARTIALLY_PAID');
  assert.strictEqual(ishitaInstalment.overdueDays, 23); // 23 days overdue on 2026-11-02

  // 3. Mohit Gurjar (STU-0219) - Tonk Road
  const mohit = SEED_STUDENTS.find((s) => s.id === 'STU-0219');
  assert.ok(mohit);
  const mohitInstalment = SEED_INSTALMENTS.find((i) => i.studentId === 'STU-0219');
  assert.ok(mohitInstalment);
  assert.strictEqual(mohitInstalment.amountPaise, 4000000); // ₹40,000
  assert.strictEqual(mohitInstalment.paidAmountPaise, 0); // ₹0 paid
  assert.strictEqual(mohitInstalment.outstandingBalancePaise, 4000000); // ₹40,000 balance
  assert.strictEqual(mohitInstalment.daysUntilDue, 13); // 13 days until due on 2026-11-02
  assert.strictEqual(mohitInstalment.isOverdue, false);
});

test('SEED DATA CONFORMANCE: All documents have centreId for Firestore RBAC rules', () => {
  for (const fp of SEED_FEE_PLANS) {
    assert.ok(ALL_JAIPUR_CENTRE_IDS.includes(fp.centreId));
  }
  for (const inst of SEED_INSTALMENTS) {
    assert.ok(ALL_JAIPUR_CENTRE_IDS.includes(inst.centreId));
  }
  for (const p of SEED_PAYMENTS) {
    assert.ok(ALL_JAIPUR_CENTRE_IDS.includes(p.centreId));
  }
  for (const rem of SEED_REMINDERS) {
    assert.ok(ALL_JAIPUR_CENTRE_IDS.includes(rem.centreId));
  }
});

test('FINANCIAL RECONCILIATION: Sum of instalments equals totalPayablePaise for each plan', () => {
  for (const plan of SEED_FEE_PLANS) {
    const studentInstalments = SEED_INSTALMENTS.filter((i) => i.feePlanId === plan.id);
    assert.strictEqual(studentInstalments.length, plan.instalmentCount, `Student ${plan.studentId} has ${plan.instalmentCount} instalments`);
    
    const sumPaise = studentInstalments.reduce((acc, curr) => acc + curr.amountPaise, 0);
    assert.strictEqual(
      sumPaise, 
      plan.totalPayablePaise, 
      `Sum of instalments (${sumPaise}) must exactly equal totalPayablePaise (${plan.totalPayablePaise})`
    );
  }
});
