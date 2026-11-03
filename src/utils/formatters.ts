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
  if (typeof paise !== 'number' || !Number.isInteger(paise)) {
    throw new Error(`Invalid currency amount: ${paise}. Must be an integer number of paise.`);
  }

  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = absPaise / 100;

  const formattedNumber = rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${isNegative ? '-' : ''}₹${formattedNumber}`;
}

/**
 * Masks phone numbers for parent privacy in dashboards and logs.
 * Examples:
 * "+16505553434" -> "+1 650-***-3434"
 * "+1 650-555-3434" -> "+1 650-***-3434"
 * "+91 98290 00001" -> "+91 98*** **001"
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return '—';
  const trimmed = phone.trim();

  // US E.164: +16505553434 or +1 650-555-3434
  if (trimmed.startsWith('+1')) {
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length >= 11) {
      const area = digits.slice(1, 4);
      const last4 = digits.slice(-4);
      return `+1 ${area}-***-${last4}`;
    }
  }

  // India format: +91 98290 00001 or +919829000001
  if (trimmed.startsWith('+91')) {
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length >= 12) {
      const prefix = digits.slice(2, 4);
      const suffix = digits.slice(-3);
      return `+91 ${prefix}*** **${suffix}`;
    }
  }

  // Generic fallback: keep first 3 and last 2 characters
  if (trimmed.length > 5) {
    return `${trimmed.slice(0, 3)}****${trimmed.slice(-2)}`;
  }
  return '******';
}
