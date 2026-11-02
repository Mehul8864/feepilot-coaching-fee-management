/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Milestone 1 Unit Tests - FeePilot Core Financial Engines
 * Client: Company A, Jaipur
 * Reference Date: 2026-11-02
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFeePlan } from './feeCalculation';
import { calculateOverdueDays } from './overdueCalculation';
import { calculateProRataRefund, DEMO_CONFIGURABLE_REFUND_POLICY } from './refundCalculation';
import { updateInstalmentReminders } from './reminderRules';
import { ReminderSchedule } from '../types/domain';
import { formatINR } from '../utils/formatters';

// Fixed evaluation date specified by client
const REFERENCE_DATE = '2026-11-02';

// -------------------------------------------------------------
// 1. SAMPLE RECORD TESTS AS OF 2 NOVEMBER 2026
// -------------------------------------------------------------

test('AARAV MEENA (STU-0412): Fully paid on time -> 0 overdue days and PAID status', () => {
  const instalmentAmountPaise = 3000000; // ₹30,000
  const paidAmountPaise = 3000000;       // ₹30,000
  const outstandingPaise = instalmentAmountPaise - paidAmountPaise; // 0

  const result = calculateOverdueDays(
    '2026-10-10',
    REFERENCE_DATE,
    outstandingPaise,
    paidAmountPaise,
    instalmentAmountPaise
  );

  assert.equal(result.overdueDays, 0, 'Overdue days must be 0 for settled balance');
  assert.equal(result.daysUntilDue, 0);
  assert.equal(result.isOverdue, false);
  assert.equal(result.isPartiallyPaid, false);
  assert.equal(result.status, 'PAID');
});

test('ISHITA SHARMA (STU-0587): Part-paid ₹15,000 -> 23 days overdue and PARTIALLY_PAID status', () => {
  const instalmentAmountPaise = 3000000; // ₹30,000
  const paidAmountPaise = 1500000;       // ₹15,000
  const outstandingPaise = instalmentAmountPaise - paidAmountPaise; // ₹15,000 (1,500,000 paise)

  const result = calculateOverdueDays(
    '2026-10-10',
    REFERENCE_DATE,
    outstandingPaise,
    paidAmountPaise,
    instalmentAmountPaise
  );

  // From Oct 10 to Nov 02: (31 - 10) = 21 days in Oct + 2 days in Nov = 23 days
  assert.equal(result.overdueDays, 23, 'Overdue days must be exactly 23 calendar days');
  assert.equal(result.daysUntilDue, 0);
  assert.equal(result.isOverdue, true, 'Must be flagged as overdue');
  assert.equal(result.isPartiallyPaid, true, 'Must be flagged as partially paid');
  assert.equal(result.status, 'PARTIALLY_PAID');
  assert.match(result.statusDescription, /23 days overdue/);
});

test('MOHIT GURJAR (STU-0219): Unpaid future instalment -> Due in 13 days, not overdue', () => {
  const instalmentAmountPaise = 4000000; // ₹40,000
  const paidAmountPaise = 0;             // ₹0
  const outstandingPaise = 4000000;      // ₹40,000

  const result = calculateOverdueDays(
    '2026-11-15',
    REFERENCE_DATE,
    outstandingPaise,
    paidAmountPaise,
    instalmentAmountPaise
  );

  // From Nov 02 to Nov 15: 15 - 2 = 13 days
  assert.equal(result.overdueDays, 0, 'Overdue days must be 0 for future due date');
  assert.equal(result.daysUntilDue, 13, 'Must be due in 13 calendar days');
  assert.equal(result.isOverdue, false, 'Must not be overdue');
  assert.equal(result.isPartiallyPaid, false);
  assert.equal(result.status, 'DUE_SOON', 'Due in 13 days is <= 15 days, so status is DUE_SOON');
  assert.match(result.statusDescription, /Due in 13 days/);
});

// -------------------------------------------------------------
// 2. FEE CALCULATION & GST SPLIT TESTS
// -------------------------------------------------------------

test('FEE CALCULATION: Discounts and Intra-state GST (50% CGST + 50% SGST) split', () => {
  const grossPaise = 10000000; // ₹1,00,000
  const discountPaise = 2000000; // ₹20,000 discount
  const gstRate = 18; // 18% configurable

  const result = calculateFeePlan(grossPaise, discountPaise, gstRate, 1);

  // Taxable = 1,00,000 - 20,000 = ₹80,000 (8,000,000 paise)
  assert.equal(result.taxableAmountPaise, 8000000);

  // CGST = 9% of 80,000 = ₹7,200 (720,000 paise)
  assert.equal(result.cgstAmountPaise, 720000);

  // SGST = 9% of 80,000 = ₹7,200 (720,000 paise)
  assert.equal(result.sgstAmountPaise, 720000);

  // Total GST = ₹14,400 (1,440,000 paise)
  assert.equal(result.totalGstAmountPaise, 1440000);

  // Total Payable = 80,000 + 14,400 = ₹94,400 (9,440,000 paise)
  assert.equal(result.totalPayablePaise, 9440000);
});

test('INSTALMENT ROUNDING: 3-instalment split absorbs 1-paisa remainder on last instalment', () => {
  // Gross ₹1,00,000, 0 discount, 18% GST -> Total Payable = ₹1,18,000 (11,800,000 paise)
  // 11,800,000 / 3 = 3,933,333.333... paise
  // Base: 3,933,333 paise (₹39,333.33)
  // Remainder: 1 paisa (absorbed into instalment 3)
  const result = calculateFeePlan(10000000, 0, 18, 3);

  assert.equal(result.totalPayablePaise, 11800000);
  assert.equal(result.instalmentAmountsPaise.length, 3);
  assert.equal(result.instalmentAmountsPaise[0], 3933333);
  assert.equal(result.instalmentAmountsPaise[1], 3933333);
  assert.equal(result.instalmentAmountsPaise[2], 3933334); // Absorbs 1 paisa

  // Invariant test: sum of instalments must equal totalPayablePaise to the exact paisa
  const sum = result.instalmentAmountsPaise.reduce((a, b) => a + b, 0);
  assert.equal(sum, result.totalPayablePaise);
});

test('INSTALMENT ROUNDING: 4-instalment split distributes perfectly', () => {
  // ₹1,00,000 total with 4 instalments -> exactly 2,500,000 paise each
  const result = calculateFeePlan(10000000, 0, 0, 4);

  assert.equal(result.instalmentAmountsPaise.length, 4);
  assert.deepEqual(result.instalmentAmountsPaise, [2500000, 2500000, 2500000, 2500000]);
  const sum = result.instalmentAmountsPaise.reduce((a, b) => a + b, 0);
  assert.equal(sum, result.totalPayablePaise);
});

// -------------------------------------------------------------
// 3. REMINDER RULES & CANCELLATION ENGINE TESTS
// -------------------------------------------------------------

test('REMINDERS: Verified full payment immediately cancels all scheduled reminders for that instalment', () => {
  const initialReminders: ReminderSchedule[] = [
    {
      id: 'REM-1',
      instalmentId: 'INST-AARAV-1',
      studentId: 'STU-0412',
      stage: 'BEFORE_DUE_3D',
      scheduledDate: '2026-10-07',
      language: 'en',
      amountDuePaise: 3000000,
      messageText: 'Payment reminder for Aarav Meena',
      status: 'SENT', // Past sent reminder
      sentAt: '2026-10-07T09:00:00Z',
    },
    {
      id: 'REM-2',
      instalmentId: 'INST-AARAV-1',
      studentId: 'STU-0412',
      stage: 'ON_DUE_DATE',
      scheduledDate: '2026-10-10',
      language: 'en',
      amountDuePaise: 3000000,
      messageText: 'Due today reminder',
      status: 'SCHEDULED', // Unsent reminder
    },
    {
      id: 'REM-3',
      instalmentId: 'INST-AARAV-1',
      studentId: 'STU-0412',
      stage: 'OVERDUE_3D',
      scheduledDate: '2026-10-13',
      language: 'hi',
      amountDuePaise: 3000000,
      messageText: 'बकाया किस्त संदेश',
      status: 'SCHEDULED', // Unsent reminder
    },
    {
      id: 'REM-OTHER',
      instalmentId: 'INST-OTHER-99',
      studentId: 'STU-9999',
      stage: 'ON_DUE_DATE',
      scheduledDate: '2026-10-10',
      language: 'en',
      amountDuePaise: 5000000,
      messageText: 'Other student reminder',
      status: 'SCHEDULED',
    },
  ];

  // Full settlement: balance becomes 0
  const updated = updateInstalmentReminders(
    initialReminders,
    'INST-AARAV-1',
    0, // Balance is 0
    'Aarav Meena',
    '2026-10-10',
    '2026-10-10T11:30:00Z'
  );

  // REM-1 (already SENT) should stay SENT
  assert.equal(updated.find((r) => r.id === 'REM-1')?.status, 'SENT');

  // REM-2 and REM-3 must be CANCELLED_BY_PAYMENT
  const rem2 = updated.find((r) => r.id === 'REM-2');
  assert.equal(rem2?.status, 'CANCELLED_BY_PAYMENT');
  assert.equal(rem2?.amountDuePaise, 0);
  assert.equal(rem2?.cancelledAt, '2026-10-10T11:30:00Z');

  const rem3 = updated.find((r) => r.id === 'REM-3');
  assert.equal(rem3?.status, 'CANCELLED_BY_PAYMENT');

  // REM-OTHER for another student must remain SCHEDULED
  assert.equal(updated.find((r) => r.id === 'REM-OTHER')?.status, 'SCHEDULED');
});

test('REMINDERS: Partial payment retains SCHEDULED status and updates amount dynamically', () => {
  const initialReminders: ReminderSchedule[] = [
    {
      id: 'REM-ISHITA-1',
      instalmentId: 'INST-ISHITA-1',
      studentId: 'STU-0587',
      stage: 'OVERDUE_3D',
      scheduledDate: '2026-10-13',
      language: 'hi',
      amountDuePaise: 3000000, // Original ₹30,000
      messageText: 'मूल संदेश ₹30,000',
      status: 'SCHEDULED',
    },
  ];

  // Ishita part-pays ₹15,000, leaving ₹15,000 outstanding (1,500,000 paise)
  const updated = updateInstalmentReminders(
    initialReminders,
    'INST-ISHITA-1',
    1500000,
    'Ishita Sharma',
    '2026-10-10'
  );

  const rem = updated[0];
  assert.equal(rem.status, 'SCHEDULED', 'Reminder must not be cancelled for partial payment');
  assert.equal(rem.amountDuePaise, 1500000, 'Amount due must update to remaining ₹15,000');
  assert.match(rem.messageText, /₹15,000/, 'Message text must mention remaining ₹15,000');
});

// -------------------------------------------------------------
// 4. REFUND ENGINE & ZERO/NEGATIVE PROTECTION TESTS
// -------------------------------------------------------------

test('REFUND ENGINE: Itemized pro-rata refund calculations', () => {
  const policy = DEMO_CONFIGURABLE_REFUND_POLICY;
  // Student paid ₹60,000 (6,000,000 paise)
  // Attended 10 out of 100 classes (10% service consumed)
  // Non-refundable registration: ₹10,000 (1,000,000 paise)
  // Kit cost: ₹5,000 (500,000 paise)
  // Tuition base: 60,000 - 10,000 - 5,000 = ₹45,000 (4,500,000 paise)
  // Service used deduction (10% of 45,000) = ₹4,500 (450,000 paise)
  // Admin fee (5% of 60,000) = ₹3,000 (300,000 paise)
  // Total deductions: 10,000 + 5,000 + 4,500 + 3,000 = ₹22,500 (2,250,000 paise)
  // Net refund: 60,000 - 22,500 = ₹37,500 (3,750,000 paise)
  const totalPaidPaise = 6000000;
  const classesAttended = 10;
  const totalClasses = 100;

  const result = calculateProRataRefund(policy, totalPaidPaise, classesAttended, totalClasses);

  assert.equal(result.serviceUsedDeductionPaise, 450000);
  assert.equal(result.nonRefundableRegistrationFeePaise, 1000000);
  assert.equal(result.kitMaterialCostPaise, 500000);
  assert.equal(result.adminFeePaise, 300000);
  assert.equal(result.totalDeductionsPaise, 2250000);
  assert.equal(result.grossRefundPaise, 3750000);
  assert.equal(result.netRefundPaise, 3750000);
  assert.equal(result.isZeroOrNegativeProtected, false);
  assert.equal(result.excessDeductionsPaise, 0);
  assert.match(result.policyDisclaimer, /fictional configurable demonstration policy/);
});

test('REFUND ENGINE: Protection against negative refund when deductions exceed payment', () => {
  const policy = DEMO_CONFIGURABLE_REFUND_POLICY;
  // Total deductions: 10,000 (registration) + 5,000 (kit) + 0 (tuition) + 600 (5% admin fee) = ₹15,600 (1,560,000 paise)
  // Gross refund = 12,000 - 15,600 = -₹3,600 (-360,000 paise)
  // Net refund must be clamped strictly to 0
  // Excess deductions = ₹3,600 (360,000 paise)
  const result = calculateProRataRefund(policy, 1200000, 2, 100);

  assert.ok(result.grossRefundPaise < 0, 'Gross refund was negative before protection');
  assert.equal(result.netRefundPaise, 0, 'Net refund must be protected and never negative');
  assert.equal(result.isZeroOrNegativeProtected, true);
  assert.equal(result.excessDeductionsPaise, 360000, 'Excess deductions must equal 360,000 paise (₹3,600.00)');
  assert.match(result.policyDisclaimer, /not Company A's approved or legally verified refund policy/);
});

// -------------------------------------------------------------
// 5. INPUT REJECTION & VALIDATION TESTS
// -------------------------------------------------------------

test('VALIDATION: Rejects negative fees, excessive discounts, and invalid calendar dates', () => {
  // Negative gross
  assert.throws(() => calculateFeePlan(-1000, 0, 18), /Invalid gross amount/);

  // Discount exceeding gross
  assert.throws(() => calculateFeePlan(500000, 600000, 18), /Discount .* cannot exceed gross/);

  // Negative GST rate
  assert.throws(() => calculateFeePlan(100000, 0, -5), /Invalid GST rate/);

  // Zero instalment count
  assert.throws(() => calculateFeePlan(100000, 0, 18, 0), /Invalid instalment count/);

  // Invalid date format in overdue engine
  assert.throws(() => calculateOverdueDays('10/10/2026', REFERENCE_DATE, 5000), /Invalid date format/);

  // Attended classes > Total classes in refund engine
  assert.throws(
    () => calculateProRataRefund(DEMO_CONFIGURABLE_REFUND_POLICY, 5000000, 105, 100),
    /Classes attended .* cannot exceed total scheduled classes/
  );

  // Strict Calendar Date Validation: Rejects invalid calendar dates that do not exist
  assert.throws(
    () => calculateOverdueDays('2026-02-31', REFERENCE_DATE, 5000),
    /Invalid calendar date: '2026-02-31' does not exist on the calendar/
  );

  assert.throws(
    () => calculateOverdueDays('2026-13-01', REFERENCE_DATE, 5000),
    /Invalid calendar date: '2026-13-01'/
  );

  assert.throws(
    () => calculateOverdueDays('2026-04-31', REFERENCE_DATE, 5000),
    /Invalid calendar date: '2026-04-31' does not exist on the calendar/
  );

  assert.throws(
    () => calculateOverdueDays('2026-02-29', REFERENCE_DATE, 5000),
    /Invalid calendar date: '2026-02-29' does not exist on the calendar/
  );

  // Valid leap year date must not throw
  assert.doesNotThrow(
    () => calculateOverdueDays('2024-02-29', '2024-03-01', 5000)
  );

  // Money Inputs must be non-negative integer paise (reject floating point or negative amounts)
  assert.throws(() => calculateFeePlan(1000.5, 0, 18), /Must be a non-negative integer in paise/);
  assert.throws(() => calculateFeePlan(1000, 50.25, 18), /Must be a non-negative integer in paise/);
  assert.throws(() => calculateOverdueDays('2026-10-10', REFERENCE_DATE, 100.5), /Must be a non-negative integer in paise/);
  assert.throws(() => calculateOverdueDays('2026-10-10', REFERENCE_DATE, 100, 50.5), /Must be a non-negative integer in paise/);
  assert.throws(() => calculateProRataRefund(DEMO_CONFIGURABLE_REFUND_POLICY, 1000.5, 5, 50), /Must be a non-negative integer in paise/);
  assert.throws(() => formatINR(100.5), /Must be an integer number of paise/);
});

// -------------------------------------------------------------
// 6. CURRENCY FORMATTING (EXACT TWO DECIMAL PLACES IN INR)
// -------------------------------------------------------------

test('FORMATTER: Formats Indian Currency with exactly two decimal places (e.g. ₹494.40)', () => {
  assert.equal(formatINR(49440), '₹494.40', '49,440 paise must format as ₹494.40');
  assert.equal(formatINR(3000000), '₹30,000.00', '3,000,000 paise must format as ₹30,000.00');
  assert.equal(formatINR(1500000), '₹15,000.00', '1,500,000 paise must format as ₹15,000.00');
  assert.equal(formatINR(0), '₹0.00', '0 paise must format as ₹0.00');
  assert.equal(formatINR(10620000), '₹1,06,200.00', '10,620,000 paise must format as ₹1,06,200.00');
});

// -------------------------------------------------------------
// 7. AUDIT: GST RECONCILIATION & EXACT PAISE INVARIANTS
// -------------------------------------------------------------

test('AUDIT: GST split reconciliation and penny-drop absorption across odd amounts', () => {
  // Test case with odd numbers producing half-paise fractions:
  // Taxable amount: ₹49,999.99 (4,999,999 paise)
  // GST rate: 18% -> CGST (9%) = round(449,999.91) = 450,000 paise
  // SGST (9%) = round(449,999.91) = 450,000 paise
  // Total GST = 900,000 paise
  // Total payable = 4,999,999 + 900,000 = 5,899,999 paise
  const plan = calculateFeePlan(4999999, 0, 18, 3);

  assert.equal(plan.cgstAmountPaise, 450000);
  assert.equal(plan.sgstAmountPaise, 450000);
  assert.equal(plan.totalGstAmountPaise, 900000);
  assert.equal(plan.cgstAmountPaise + plan.sgstAmountPaise, plan.totalGstAmountPaise);
  assert.equal(plan.totalPayablePaise, plan.taxableAmountPaise + plan.totalGstAmountPaise);

  // Invariant: sum of instalments must equal totalPayablePaise to the exact paisa
  const sumOfInstalments = plan.instalmentAmountsPaise.reduce((a, b) => a + b, 0);
  assert.equal(sumOfInstalments, plan.totalPayablePaise, 'Instalment sum must match total payable to the exact paisa');
});
