/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Fee Calculation Engine
 * 
 * Rules:
 * - Integer paise arithmetic eliminates floating-point drift.
 * - Taxable amount = gross - discount.
 * - GST rate is configurable (never hardcoded as a legal claim).
 * - Rajasthan intra-state GST splits equally into CGST (50%) and SGST (50%).
 * - Sum of instalments matches total payable down to the exact paisa (last instalment absorbs remainder).
 */

import { CurrencyPaise } from '../types/domain';

export interface FeePlanCalculationResult {
  grossAmountPaise: CurrencyPaise;
  discountAmountPaise: CurrencyPaise;
  taxableAmountPaise: CurrencyPaise;
  gstRatePercent: number;
  cgstAmountPaise: CurrencyPaise;
  sgstAmountPaise: CurrencyPaise;
  totalGstAmountPaise: CurrencyPaise;
  totalPayablePaise: CurrencyPaise;
  instalmentCount: number;
  instalmentAmountsPaise: CurrencyPaise[];
}

/**
 * Calculates a fee plan with configurable GST and balanced instalment distribution.
 * 
 * @param grossAmountPaise Gross course fee in integer paise (e.g. ₹1,20,000 = 12,000,000 paise)
 * @param discountAmountPaise Approved discount in integer paise
 * @param gstRatePercent Configurable GST percentage (e.g. 18 for 18%)
 * @param instalmentCount Number of instalments (e.g. 1, 2, 3, 4). Defaults to 1.
 */
export function calculateFeePlan(
  grossAmountPaise: CurrencyPaise,
  discountAmountPaise: CurrencyPaise,
  gstRatePercent: number,
  instalmentCount: number = 1
): FeePlanCalculationResult {
  // Input Validation
  if (!Number.isInteger(grossAmountPaise) || grossAmountPaise < 0) {
    throw new Error(`Invalid gross amount: ${grossAmountPaise}. Must be a non-negative integer in paise.`);
  }

  if (!Number.isInteger(discountAmountPaise) || discountAmountPaise < 0) {
    throw new Error(`Invalid discount amount: ${discountAmountPaise}. Must be a non-negative integer in paise.`);
  }

  if (discountAmountPaise > grossAmountPaise) {
    throw new Error(
      `Discount (${discountAmountPaise} paise) cannot exceed gross course fee (${grossAmountPaise} paise).`
    );
  }

  if (typeof gstRatePercent !== 'number' || isNaN(gstRatePercent) || gstRatePercent < 0) {
    throw new Error(`Invalid GST rate: ${gstRatePercent}%. Must be a non-negative number.`);
  }

  if (!Number.isInteger(instalmentCount) || instalmentCount < 1) {
    throw new Error(`Invalid instalment count: ${instalmentCount}. Must be an integer >= 1.`);
  }

  // 1. Taxable Amount (Gross - Discount)
  const taxableAmountPaise = grossAmountPaise - discountAmountPaise;

  // 2. Intra-state GST Split (50% CGST + 50% SGST)
  // For each half, calculate (taxable * (gstRate / 2)) / 100 rounded to nearest paisa
  const halfGstRate = gstRatePercent / 2;
  const cgstAmountPaise = Math.round((taxableAmountPaise * halfGstRate) / 100);
  const sgstAmountPaise = Math.round((taxableAmountPaise * halfGstRate) / 100);
  const totalGstAmountPaise = cgstAmountPaise + sgstAmountPaise;

  // 3. Total Payable
  const totalPayablePaise = taxableAmountPaise + totalGstAmountPaise;

  // 4. Divide into instalments with remainder absorption on the final instalment
  const baseInstalmentPaise = Math.floor(totalPayablePaise / instalmentCount);
  const remainderPaise = totalPayablePaise - (baseInstalmentPaise * instalmentCount);

  const instalmentAmountsPaise: CurrencyPaise[] = [];
  for (let i = 0; i < instalmentCount; i++) {
    if (i === instalmentCount - 1) {
      // Last instalment absorbs any remainder
      instalmentAmountsPaise.push(baseInstalmentPaise + remainderPaise);
    } else {
      instalmentAmountsPaise.push(baseInstalmentPaise);
    }
  }

  // Double check invariant: sum of instalments must equal totalPayable exactly
  const sumOfInstalments = instalmentAmountsPaise.reduce((acc, curr) => acc + curr, 0);
  if (sumOfInstalments !== totalPayablePaise) {
    throw new Error(
      `Internal invariant failure: Sum of instalments (${sumOfInstalments}) does not match total payable (${totalPayablePaise})`
    );
  }

  return {
    grossAmountPaise,
    discountAmountPaise,
    taxableAmountPaise,
    gstRatePercent,
    cgstAmountPaise,
    sgstAmountPaise,
    totalGstAmountPaise,
    totalPayablePaise,
    instalmentCount,
    instalmentAmountsPaise,
  };
}
