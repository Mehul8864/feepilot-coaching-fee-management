/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Automated Reminder Rules & Cancellation Engine
 * 
 * Rules:
 * - When verified outstanding balance becomes 0:
 *   Cancel all SCHEDULED reminders for this instalment immediately.
 *   Set status = 'CANCELLED_BY_PAYMENT'.
 * - When payment is partial (outstanding balance > 0):
 *   Keep future reminders SCHEDULED.
 *   Dynamically update amountDuePaise to the remaining outstanding balance.
 *   Update message templates to reflect remaining balance.
 * - Do NOT cancel reminders for other instalments or non-matching IDs.
 */

import { CurrencyPaise, LanguageCode, ReminderSchedule, ReminderStage } from '../types/domain';
import { formatINR } from '../utils/formatters';

/**
 * Generates bilingual message copy for reminders in English and Hindi.
 */
export function formatReminderMessage(
  studentName: string,
  stage: ReminderStage,
  amountDuePaise: CurrencyPaise,
  dueDateStr: string,
  language: LanguageCode
): string {
  const formattedAmount = formatINR(amountDuePaise);

  if (language === 'hi') {
    switch (stage) {
      case 'BEFORE_DUE_3D':
        return `प्रिय अभिभावक, ${studentName} की कोचिंग किस्त ${formattedAmount} 3 दिनों में (${dueDateStr}) देय है। असुविधा से बचने के लिए कृपया समय पर भुगतान करें।`;
      case 'ON_DUE_DATE':
        return `प्रिय अभिभावक, ${studentName} की कोचिंग किस्त ${formattedAmount} आज (${dueDateStr}) देय है। कृपया दिए गए लिंक से तुरंत भुगतान करें।`;
      case 'OVERDUE_3D':
      case 'OVERDUE_7D':
      case 'OVERDUE_15D':
        return `अति आवश्यक: ${studentName} की कोचिंग किस्त ${formattedAmount} देय तिथि (${dueDateStr}) से बकाया है। कृपया किसी भी व्यवधान से बचने के लिए तुरंत भुगतान करें।`;
    }
  }

  // English fallback
  switch (stage) {
    case 'BEFORE_DUE_3D':
      return `Dear Parent, coaching instalment of ${formattedAmount} for ${studentName} is due in 3 days on ${dueDateStr}. Pay now to avoid delay.`;
    case 'ON_DUE_DATE':
      return `Dear Parent, coaching instalment of ${formattedAmount} for ${studentName} is due today (${dueDateStr}). Please complete payment.`;
    case 'OVERDUE_3D':
    case 'OVERDUE_7D':
    case 'OVERDUE_15D':
      return `Urgent Reminder: Instalment of ${formattedAmount} for ${studentName} is past due date (${dueDateStr}). Please clear outstanding balance immediately.`;
  }
}

/**
 * Updates scheduled reminders for a specific instalment in response to a payment event.
 * 
 * @param reminders Existing array of scheduled reminders
 * @param instalmentId ID of the instalment whose payment was verified
 * @param outstandingBalancePaise New remaining balance in paise after payment
 * @param studentName Optional student name for updating copy
 * @param dueDateStr Optional due date string for updating copy
 * @param cancellationTimestamp Optional timestamp string for audit log (defaults to ISO now)
 */
export function updateInstalmentReminders(
  reminders: ReminderSchedule[],
  instalmentId: string,
  outstandingBalancePaise: CurrencyPaise,
  studentName?: string,
  dueDateStr?: string,
  cancellationTimestamp?: string
): ReminderSchedule[] {
  if (!Array.isArray(reminders)) {
    throw new Error('Reminders must be an array.');
  }

  if (!instalmentId) {
    throw new Error('Valid instalmentId is required.');
  }

  if (!Number.isInteger(outstandingBalancePaise) || outstandingBalancePaise < 0) {
    throw new Error(
      `Invalid outstanding balance: ${outstandingBalancePaise}. Must be a non-negative integer in paise.`
    );
  }

  const nowIso = cancellationTimestamp || new Date().toISOString();

  return reminders.map((reminder) => {
    // Only target reminders belonging to this exact instalment
    if (reminder.instalmentId !== instalmentId) {
      return reminder;
    }

    // If reminder is already SENT or already CANCELLED, preserve its historical state
    if (reminder.status !== 'SCHEDULED') {
      return reminder;
    }

    // Condition 1: Verified outstanding balance is ZERO -> CANCEL IMMEDIATELY
    if (outstandingBalancePaise === 0) {
      return {
        ...reminder,
        status: 'CANCELLED_BY_PAYMENT',
        amountDuePaise: 0,
        cancelledAt: nowIso,
        cancellationReason: 'Instalment fully settled by verified payment.',
      };
    }

    // Condition 2: Partial payment -> KEEP SCHEDULED but update outstanding amount
    const updatedAmountDuePaise = outstandingBalancePaise;
    const effectiveStudentName = studentName || 'Student';
    const effectiveDueDate = dueDateStr || reminder.scheduledDate;

    return {
      ...reminder,
      amountDuePaise: updatedAmountDuePaise,
      messageText: formatReminderMessage(
        effectiveStudentName,
        reminder.stage,
        updatedAmountDuePaise,
        effectiveDueDate,
        reminder.language
      ),
    };
  });
}
