/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Overdue Calculation Engine
 * 
 * Rules:
 * - Deterministic date arithmetic using UTC calendar days to avoid timezone/DST shifts.
 * - Injected reference date ensures reproducible tests (reference date: 2026-11-02).
 * - If balance is zero, overdue days = 0 and status is PAID.
 * - If balance > 0 and reference date > due date, exact calendar days overdue are calculated.
 * - Distinguishes between PARTIALLY_PAID and unpaid OVERDUE.
 */

import { CurrencyPaise, InstalmentStatus } from '../types/domain';

export interface OverdueAnalysis {
  overdueDays: number;
  daysUntilDue: number;
  isOverdue: boolean;
  isPartiallyPaid: boolean;
  status: InstalmentStatus;
  statusDescription: string;
}

/**
 * Parses YYYY-MM-DD string into UTC midnight timestamp to guarantee timezone independence.
 * Strictly verifies that the calendar day exists (rejects e.g. 2026-02-31, 2026-13-01, 2026-04-31).
 */
export function parseDateToUtcMidnight(dateStr: string): number {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error(`Invalid date format: '${dateStr}'. Expected YYYY-MM-DD.`);
  }

  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Invalid calendar date: '${dateStr}'. Month must be 01-12 and day must be 01-31.`);
  }

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar date: '${dateStr}' does not exist on the calendar.`);
  }

  return utcDate.getTime();
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Calculates overdue days and current status for an instalment.
 * 
 * @param dueDateStr ISO date string (YYYY-MM-DD)
 * @param referenceDateStr Injected evaluation date (e.g. "2026-11-02")
 * @param outstandingBalancePaise Remaining balance in paise
 * @param paidAmountPaise Amount already verified and paid in paise (default: 0)
 * @param totalAmountPaise Original instalment amount in paise (optional)
 */
export function calculateOverdueDays(
  dueDateStr: string,
  referenceDateStr: string,
  outstandingBalancePaise: CurrencyPaise,
  paidAmountPaise: CurrencyPaise = 0,
  totalAmountPaise?: CurrencyPaise
): OverdueAnalysis {
  if (!Number.isInteger(outstandingBalancePaise) || outstandingBalancePaise < 0) {
    throw new Error(`Invalid outstanding balance: ${outstandingBalancePaise}. Must be a non-negative integer in paise.`);
  }

  if (!Number.isInteger(paidAmountPaise) || paidAmountPaise < 0) {
    throw new Error(`Invalid paid amount: ${paidAmountPaise}. Must be a non-negative integer in paise.`);
  }

  if (totalAmountPaise !== undefined) {
    if (!Number.isInteger(totalAmountPaise) || totalAmountPaise < 0) {
      throw new Error(`Invalid total amount: ${totalAmountPaise}. Must be a non-negative integer in paise.`);
    }
  }

  const dueUtc = parseDateToUtcMidnight(dueDateStr);
  const refUtc = parseDateToUtcMidnight(referenceDateStr);

  const diffDays = Math.round((refUtc - dueUtc) / MS_PER_DAY);

  // Case 1: Fully Paid (Outstanding balance is 0)
  if (outstandingBalancePaise === 0) {
    return {
      overdueDays: 0,
      daysUntilDue: 0,
      isOverdue: false,
      isPartiallyPaid: false,
      status: 'PAID',
      statusDescription: 'Paid in full',
    };
  }

  // Case 2: Outstanding balance remains > 0
  const isPartiallyPaid = paidAmountPaise > 0;

  if (diffDays > 0) {
    // Reference date is strictly after due date -> OVERDUE
    return {
      overdueDays: diffDays,
      daysUntilDue: 0,
      isOverdue: true,
      isPartiallyPaid,
      status: isPartiallyPaid ? 'PARTIALLY_PAID' : 'OVERDUE',
      statusDescription: isPartiallyPaid
        ? `Part-paid and ${diffDays} day${diffDays === 1 ? '' : 's'} overdue`
        : `${diffDays} day${diffDays === 1 ? '' : 's'} overdue`,
    };
  } else {
    // Reference date is on or before due date
    const daysUntilDue = Math.abs(diffDays);
    const isDueSoon = daysUntilDue <= 15;

    let status: InstalmentStatus;
    if (isPartiallyPaid) {
      status = 'PARTIALLY_PAID';
    } else if (isDueSoon) {
      status = 'DUE_SOON';
    } else {
      status = 'UPCOMING';
    }

    return {
      overdueDays: 0,
      daysUntilDue,
      isOverdue: false,
      isPartiallyPaid,
      status,
      statusDescription: daysUntilDue === 0
        ? 'Due today'
        : `Due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`,
    };
  }
}
