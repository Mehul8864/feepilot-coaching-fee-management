/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FeePilot Currency & Date Formatters
 * Formats Indian Currency (INR) consistently with two decimal places (e.g. ₹494.40)
 * while maintaining integer paise internally.
 */

import { CurrencyPaise } from '../types/domain';

/**
 * Formats integer paise into standard Indian Rupee string with exactly two decimal places.
 * Example:
 * 49440 paise -> "₹494.40"
 * 3000000 paise -> "₹30,000.00"
 * 0 paise -> "₹0.00"
 */
export function formatINR(paise: CurrencyPaise): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = absPaise / 100;

  const formattedNumber = rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${isNegative ? '-' : ''}₹${formattedNumber}`;
}
