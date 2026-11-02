/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Configurable Pro-Rata Refund Engine
 * 
 * Rules:
 * - Versioned, configurable policy parameters (no hardcoded institutional claims).
 * - Itemized deduction breakdown:
 *   1. Non-refundable registration/admission component
 *   2. Study material/kit cost
 *   3. Pro-rata service used deduction based on attended classes
 *   4. Permitted administrative processing fee
 * - Strict non-negative guarantee: Net refund can never be negative.
 * - Clear labeling of demo policy assumptions.
 */

import { CurrencyPaise, RefundItemization, RefundPolicy } from '../types/domain';

/**
 * Standard default demo refund policy for testing and demonstration.
 * Note: Clearly labelled as configurable demo values, not an institutional claim.
 */
export const DEMO_CONFIGURABLE_REFUND_POLICY: RefundPolicy = {
  id: 'pol-demo-2026-v1',
  version: 'DEMO-POLICY-2026-V1',
  label: 'Jaipur Coaching Centre Configurable Pro-Rata Model (Demo)',
  effectiveDate: '2026-04-01',
  nonRefundableRegistrationFeePaise: 1000000, // ₹10,000 in paise
  kitMaterialCostPaise: 500000,             // ₹5,000 in paise
  adminFeePercentage: 5,                    // 5% processing fee
  notes: 'Configurable demonstration policy: Deducts registration, materials, pro-rata tuition, and 5% admin fee.',
};

/**
 * Calculates itemized pro-rata refund based on active policy parameters.
 * 
 * @param policy Versioned refund policy configuration
 * @param totalPaidPaise Amount actually paid by parent in integer paise
 * @param classesAttended Number of classroom/batch sessions conducted until withdrawal
 * @param totalClasses Total planned sessions in academic curriculum
 * @param grossCourseFeePaise Optional full course fee (if tuition base is evaluated against full contract)
 */
export function calculateProRataRefund(
  policy: RefundPolicy,
  totalPaidPaise: CurrencyPaise,
  classesAttended: number,
  totalClasses: number,
  grossCourseFeePaise?: CurrencyPaise
): RefundItemization {
  // Input Validations
  if (!policy || typeof policy !== 'object') {
    throw new Error('Valid refund policy object is required.');
  }

  if (!Number.isInteger(totalPaidPaise) || totalPaidPaise < 0) {
    throw new Error(`Invalid total paid amount: ${totalPaidPaise}. Must be a non-negative integer in paise.`);
  }

  if (!Number.isInteger(classesAttended) || classesAttended < 0) {
    throw new Error(`Invalid classes attended: ${classesAttended}. Must be an integer >= 0.`);
  }

  if (!Number.isInteger(totalClasses) || totalClasses <= 0) {
    throw new Error(`Invalid total classes: ${totalClasses}. Must be an integer > 0.`);
  }

  if (classesAttended > totalClasses) {
    throw new Error(
      `Classes attended (${classesAttended}) cannot exceed total scheduled classes (${totalClasses}).`
    );
  }

  if (
    !Number.isInteger(policy.nonRefundableRegistrationFeePaise) ||
    policy.nonRefundableRegistrationFeePaise < 0
  ) {
    throw new Error('Policy non-refundable registration fee must be a non-negative integer in paise.');
  }

  if (
    !Number.isInteger(policy.kitMaterialCostPaise) ||
    policy.kitMaterialCostPaise < 0
  ) {
    throw new Error('Policy kit/material cost must be a non-negative integer in paise.');
  }

  if (
    typeof policy.adminFeePercentage !== 'number' ||
    isNaN(policy.adminFeePercentage) ||
    policy.adminFeePercentage < 0 ||
    policy.adminFeePercentage > 100
  ) {
    throw new Error('Policy admin fee percentage must be a number between 0 and 100.');
  }

  // 1. Service utilization ratio
  const serviceUtilizationRatio = classesAttended / totalClasses;

  // 2. Fixed Deductions from policy
  const nonRefundableRegistrationFeePaise = policy.nonRefundableRegistrationFeePaise;
  const kitMaterialCostPaise = policy.kitMaterialCostPaise;

  // 3. Pro-rata Tuition/Service Used Deduction
  // Tuition base represents course fees minus fixed admission and kit charges
  const baseFeeForTuition = grossCourseFeePaise !== undefined && grossCourseFeePaise > 0
    ? grossCourseFeePaise
    : totalPaidPaise;

  const tuitionComponentPaise = Math.max(
    0,
    baseFeeForTuition - nonRefundableRegistrationFeePaise - kitMaterialCostPaise
  );

  const serviceUsedDeductionPaise = Math.round(tuitionComponentPaise * serviceUtilizationRatio);

  // 4. Administrative Processing Fee (calculated on total amount paid)
  const adminFeePaise = Math.round(totalPaidPaise * (policy.adminFeePercentage / 100));

  // 5. Total Itemized Deductions
  const totalDeductionsPaise = 
    nonRefundableRegistrationFeePaise +
    kitMaterialCostPaise +
    serviceUsedDeductionPaise +
    adminFeePaise;

  // 6. Net Refund with strict zero/negative protection
  const grossRefundPaise = totalPaidPaise - totalDeductionsPaise;
  const netRefundPaise = Math.max(0, grossRefundPaise);
  const isZeroOrNegativeProtected = grossRefundPaise <= 0;
  const excessDeductionsPaise = Math.max(0, totalDeductionsPaise - totalPaidPaise);

  return {
    policyVersion: policy.version,
    totalPaidPaise,
    classesAttended,
    totalClasses,
    serviceUtilizationRatio,
    serviceUsedDeductionPaise,
    nonRefundableRegistrationFeePaise,
    kitMaterialCostPaise,
    adminFeePaise,
    totalDeductionsPaise,
    grossRefundPaise,
    netRefundPaise,
    isZeroOrNegativeProtected,
    excessDeductionsPaise,
    policyDisclaimer:
      "Notice: This refund policy is a fictional configurable demonstration policy used for prototyping and test simulation. It is not Company A's approved or legally verified refund policy.",
  };
}
