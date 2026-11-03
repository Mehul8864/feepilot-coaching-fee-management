/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FeePilot Domain Types
 * Client: Company A, Jaipur
 * Note: All monetary amounts are in integer paise (1 INR = 100 paise)
 * to eliminate floating-point penny-drop rounding errors.
 */

export type CurrencyPaise = number; // Integer paise e.g. ₹30,000 = 3000000 paise

export type LanguageCode = 'en' | 'hi';

export type UserRole = 'ACCOUNTS_EXECUTIVE' | 'PARENT';

export interface UserProfile {
  id: string; // Firebase Auth UID
  role: UserRole;
  name?: string;
  email?: string;
  phone?: string;
  authorizedCentreIds?: string[]; // For ACCOUNTS_EXECUTIVE
  linkedStudentIds?: string[]; // For PARENT
  createdAt?: string;
}

export type InstalmentStatus = 
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'OVERDUE'
  | 'DUE_SOON'
  | 'UPCOMING';

export type PaymentMethod = 
  | 'UPI'
  | 'CARD'
  | 'NETBANKING'
  | 'CASH'
  | 'CHEQUE'
  | 'NEFT_RTGS';

export type PaymentStatus = 
  | 'VERIFIED'
  | 'PENDING'
  | 'FAILED';

export type ReminderStage = 
  | 'BEFORE_DUE_3D'
  | 'ON_DUE_DATE'
  | 'OVERDUE_3D'
  | 'OVERDUE_7D'
  | 'OVERDUE_15D';

export type ReminderStatus = 
  | 'SCHEDULED'
  | 'SENT'
  | 'CANCELLED_BY_PAYMENT';

export interface Centre {
  id: string;
  code: string;
  name: string;
  city: string; // Jaipur
  address: string;
}

export interface Batch {
  id: string;
  centreId: string;
  name: string; // e.g. "JEE 2027 Morning", "JEE 2027 Evening", "NEET 2027 Morning"
  courseType: 'JEE' | 'NEET' | 'FOUNDATION';
  academicYear: string;
  startDate: string; // YYYY-MM-DD
}

export interface Student {
  id: string;
  rollNumber: string; // e.g. "STU-0412", "STU-0587", "STU-0219"
  fullName: string;
  parentName: string;
  parentPhone: string;
  parentLanguage: LanguageCode;
  centreId: string;
  batchId: string;
  enrolledDate: string; // YYYY-MM-DD
  consentGiven: boolean;
  consentTimestamp?: string;
}

export interface FeePlan {
  id: string;
  studentId: string;
  centreId?: string;
  grossAmountPaise: CurrencyPaise;
  discountAmountPaise: CurrencyPaise;
  discountReason?: string;
  taxableAmountPaise: CurrencyPaise;
  gstRatePercent: number; // Configurable, e.g. 18
  cgstAmountPaise: CurrencyPaise; // 50% of total GST
  sgstAmountPaise: CurrencyPaise; // 50% of total GST
  totalGstAmountPaise: CurrencyPaise;
  totalPayablePaise: CurrencyPaise;
  instalmentCount: number;
}

export interface Instalment {
  id: string;
  feePlanId: string;
  studentId: string;
  centreId?: string;
  instalmentNumber: number;
  dueDate: string; // YYYY-MM-DD
  amountPaise: CurrencyPaise;
  paidAmountPaise: CurrencyPaise;
  outstandingBalancePaise: CurrencyPaise;
  status: InstalmentStatus;
  overdueDays: number;
  daysUntilDue: number;
  isOverdue: boolean;
  isPartiallyPaid: boolean;
}

export interface Payment {
  id: string;
  receiptNumber: string; // e.g. "REC-2026-00412"
  instalmentId: string;
  studentId: string;
  centreId?: string;
  amountPaise: CurrencyPaise;
  paymentMethod: PaymentMethod;
  transactionRef: string; // UTR or gateway ID
  status: PaymentStatus;
  paidAt: string; // ISO 8601
  cgstPaise: CurrencyPaise;
  sgstPaise: CurrencyPaise;
}

export interface ReminderSchedule {
  id: string;
  instalmentId: string;
  studentId: string;
  centreId?: string;
  stage: ReminderStage;
  scheduledDate: string; // YYYY-MM-DD
  language: LanguageCode;
  amountDuePaise: CurrencyPaise;
  messageText: string;
  status: ReminderStatus;
  sentAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

export interface RefundPolicy {
  id: string;
  version: string; // e.g. "POL-2026-V1"
  label: string;
  effectiveDate: string; // YYYY-MM-DD
  nonRefundableRegistrationFeePaise: CurrencyPaise;
  kitMaterialCostPaise: CurrencyPaise;
  adminFeePercentage: number; // e.g. 5%
  maxNoticeDaysLimit?: number;
  notes?: string;
}

export interface RefundItemization {
  policyVersion: string;
  totalPaidPaise: CurrencyPaise;
  classesAttended: number;
  totalClasses: number;
  serviceUtilizationRatio: number; // 0 to 1
  serviceUsedDeductionPaise: CurrencyPaise;
  nonRefundableRegistrationFeePaise: CurrencyPaise;
  kitMaterialCostPaise: CurrencyPaise;
  adminFeePaise: CurrencyPaise;
  totalDeductionsPaise: CurrencyPaise;
  grossRefundPaise: CurrencyPaise;
  netRefundPaise: CurrencyPaise; // Guaranteed non-negative
  isZeroOrNegativeProtected: boolean;
  excessDeductionsPaise: CurrencyPaise; // Amount by which deductions exceed paid when clamped
  policyDisclaimer: string;
}
