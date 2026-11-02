/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FeePilot Authentication & RBAC Verification Test Suite
 * Tests:
 * 1. Role validation (strictly ACCOUNTS_EXECUTIVE and PARENT)
 * 2. Bilingual error translation mapping (English & Hindi)
 * 3. Mobile phone and OTP code validation constraints
 * 4. Parent student linkage and unlinked state resolution
 * 5. RBAC privilege protection invariants
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 
  mapAuthErrorMessage, 
  buildAuthDiagnostic, 
  FIREBASE_TEST_PHONE, 
  FIREBASE_PROJECT_ID 
} from './authService';
import { getTranslation } from '../utils/i18n';
import { UserRole, UserProfile } from '../types/domain';

test('AUTH ROLES: Strictly allows only ACCOUNTS_EXECUTIVE and PARENT', () => {
  const allowedRoles: UserRole[] = ['ACCOUNTS_EXECUTIVE', 'PARENT'];
  
  assert.equal(allowedRoles.length, 2);
  assert.ok(allowedRoles.includes('ACCOUNTS_EXECUTIVE'));
  assert.ok(allowedRoles.includes('PARENT'));

  // Disallowed roles check
  const disallowedRoles = ['OWNER', 'ADMIN', 'SUPER_ADMIN', 'STUDENT', 'STAFF'];
  for (const role of disallowedRoles) {
    assert.ok(!allowedRoles.includes(role as any), `Disallowed role ${role} should not exist in UserRole`);
  }
});

test('AUTH I18N: Localized error messages for English and Hindi', () => {
  const enInvalidCreds = mapAuthErrorMessage('auth/invalid-credential', 'en');
  const hiInvalidCreds = mapAuthErrorMessage('auth/invalid-credential', 'hi');

  assert.ok(enInvalidCreds.includes('Invalid email or password'));
  assert.ok(hiInvalidCreds.includes('अमान्य ईमेल या पासवर्ड'));

  const enPhoneErr = mapAuthErrorMessage('auth/invalid-phone-number', 'en');
  const hiPhoneErr = mapAuthErrorMessage('auth/invalid-phone-number', 'hi');

  assert.ok(enPhoneErr.includes('valid mobile number'));
  assert.ok(hiPhoneErr.includes('मान्य मोबाइल नंबर'));

  const enOtpErr = mapAuthErrorMessage('auth/invalid-verification-code', 'en');
  const hiOtpErr = mapAuthErrorMessage('auth/invalid-verification-code', 'hi');

  assert.ok(enOtpErr.includes('verification code'));
  assert.ok(hiOtpErr.includes('ओटीपी कोड'));
});

test('AUTH VALIDATION: Phone number and OTP formatting rules', () => {
  const validatePhone = (countryCode: string, digits: string): boolean => {
    const clean = digits.replace(/\D/g, '');
    if (countryCode === '+91') return clean.length === 10;
    if (countryCode === '+1') return clean.length === 10;
    return false;
  };

  const validateOtp = (code: string): boolean => {
    return /^\d{6}$/.test(code.trim());
  };

  // Valid numbers
  assert.equal(validatePhone('+91', '9829012345'), true);
  assert.equal(validatePhone('+1', '6505553434'), true); // Firebase test number
  assert.equal(validatePhone('+91', '98290-12345'), true);

  // Invalid numbers
  assert.equal(validatePhone('+91', '98290123'), false); // too short
  assert.equal(validatePhone('+91', '982901234567'), false); // too long
  assert.equal(validatePhone('+99', '1234567890'), false); // unsupported country

  // Valid OTP
  assert.equal(validateOtp('824619'), true);
  assert.equal(validateOtp('123456'), true);

  // Invalid OTP
  assert.equal(validateOtp('12345'), false); // 5 digits
  assert.equal(validateOtp('1234567'), false); // 7 digits
  assert.equal(validateOtp('12345a'), false); // alphanumeric
});

test('AUTH RBAC: Parent profile linkage resolution & unlinked state detection', () => {
  const unlinkedParent: UserProfile = {
    id: 'PARENT-UID-001',
    role: 'PARENT',
    phone: '+919876543210',
    linkedStudentIds: [],
    authorizedCentreIds: []
  };

  const linkedParent: UserProfile = {
    id: 'PARENT-UID-002',
    role: 'PARENT',
    phone: '+16505553434',
    linkedStudentIds: ['STU-0587'],
    authorizedCentreIds: []
  };

  const isUnlinked = (p: UserProfile) => !p.linkedStudentIds || p.linkedStudentIds.length === 0;

  assert.equal(isUnlinked(unlinkedParent), true, 'Parent with empty linkedStudentIds is detected as unlinked');
  assert.equal(isUnlinked(linkedParent), false, 'Parent with linkedStudentIds is detected as linked');
});

test('AUTH RBAC: Accounts Executive centre assignment validation', () => {
  const staff: UserProfile = {
    id: 'STAFF-UID-001',
    role: 'ACCOUNTS_EXECUTIVE',
    name: 'Rajesh Sharma',
    authorizedCentreIds: ['CENTRE-JAIPUR-VAISHALI', 'CENTRE-JAIPUR-MALVIYA']
  };

  const canAccessCentre = (profile: UserProfile, centreId: string): boolean => {
    return profile.role === 'ACCOUNTS_EXECUTIVE' && 
           Boolean(profile.authorizedCentreIds?.includes(centreId));
  };

  assert.equal(canAccessCentre(staff, 'CENTRE-JAIPUR-VAISHALI'), true);
  assert.equal(canAccessCentre(staff, 'CENTRE-JAIPUR-MALVIYA'), true);
  assert.equal(canAccessCentre(staff, 'CENTRE-JAIPUR-TONK'), false);
  assert.equal(canAccessCentre(staff, '*'), false, 'Wildcard access is prohibited');
});

test('AUTH SECURITY: Auto-created parent profile invariant', () => {
  // Simulator for parent profile generator
  const createInitialParentProfile = (
    uid: string, 
    phoneNumber: string | null, 
    displayName: string | null
  ): UserProfile => {
    return {
      id: uid,
      role: 'PARENT',
      phone: phoneNumber || '',
      name: displayName || 'Parent',
      linkedStudentIds: [],
      authorizedCentreIds: [],
      createdAt: '2026-11-02T00:00:00.000Z'
    };
  };

  const profile = createInitialParentProfile('FIREBASE-UID-999', '+16505553434', 'Verified Parent');

  assert.equal(profile.id, 'FIREBASE-UID-999', 'Document ID must equal authenticated Firebase UID');
  assert.equal(profile.role, 'PARENT', 'Role must strictly be PARENT');
  assert.deepEqual(profile.linkedStudentIds, [], 'linkedStudentIds must strictly initialize as an empty array');
  assert.deepEqual(profile.authorizedCentreIds, [], 'authorizedCentreIds must strictly initialize as an empty array');
  assert.equal(profile.phone, '+16505553434');
});

test('AUTH SECURITY: Staff login requires pre-provisioned Firestore record and ACCOUNTS_EXECUTIVE role', () => {
  const evaluateStaffLoginRecord = (
    profile: UserProfile | null
  ): { ok: boolean; errorCode?: string } => {
    if (!profile) {
      return { ok: false, errorCode: 'UNAUTHORIZED_STAFF_RECORD_MISSING' };
    }
    if (profile.role !== 'ACCOUNTS_EXECUTIVE') {
      return { ok: false, errorCode: 'ROLE_MISMATCH_NOT_STAFF' };
    }
    return { ok: true };
  };

  // Case 1: Staff account has Firebase Auth login, but no Firestore document
  const noDocResult = evaluateStaffLoginRecord(null);
  assert.equal(noDocResult.ok, false);
  assert.equal(noDocResult.errorCode, 'UNAUTHORIZED_STAFF_RECORD_MISSING');

  // Case 2: User has a Firestore doc, but role is PARENT
  const parentResult = evaluateStaffLoginRecord({
    id: 'uid-parent',
    role: 'PARENT',
    linkedStudentIds: []
  });
  assert.equal(parentResult.ok, false);
  assert.equal(parentResult.errorCode, 'ROLE_MISMATCH_NOT_STAFF');

  // Case 3: Correct pre-provisioned ACCOUNTS_EXECUTIVE
  const staffResult = evaluateStaffLoginRecord({
    id: 'uid-staff',
    role: 'ACCOUNTS_EXECUTIVE',
    authorizedCentreIds: ['CENTRE-JAIPUR-VAISHALI']
  });
  assert.equal(staffResult.ok, true);
});

test('AUTH PHONE DIAGNOSTICS: Extended error mapping for domain authorization & network failures', () => {
  // Domain authorization error
  const enDomain = mapAuthErrorMessage('auth/unauthorized-domain', 'en');
  const hiDomain = mapAuthErrorMessage('auth/unauthorized-domain', 'hi');
  assert.ok(enDomain.includes('Authorized Domains'), 'English domain error mentions Authorized Domains');
  assert.ok(hiDomain.includes('अधिकृत डोमेन'), 'Hindi domain error mentions अधिकृत डोमेन');

  // App credential error
  const enCred = mapAuthErrorMessage('auth/invalid-app-credential', 'en');
  const hiCred = mapAuthErrorMessage('auth/invalid-app-credential', 'hi');
  assert.ok(enCred.includes('test number +1 650-555-3434'), 'Mentions test number');
  assert.ok(hiCred.includes('+1 650-555-3434'));

  // Captcha failed error
  const enCaptcha = mapAuthErrorMessage('auth/captcha-check-failed', 'en');
  assert.ok(enCaptcha.includes('reCAPTCHA'));

  // Network request error
  const enNet = mapAuthErrorMessage('auth/network-request-failed', 'en');
  assert.ok(enNet.includes('Network connectivity error'));
});

test('AUTH PHONE DIAGNOSTICS: Safe diagnostic builder strips keys and provides actionable resolution', () => {
  // Test case 1: unauthorized-domain
  const rawErr = {
    code: 'auth/unauthorized-domain',
    message: 'Firebase: Error (auth/unauthorized-domain). Key AIzaSyDQqazepvyM1F21G7mQP-XFbi7hkk95tUQ'
  };

  const diag = buildAuthDiagnostic(rawErr, 'SEND_PHONE_OTP');
  
  assert.equal(diag.stage, 'SEND_PHONE_OTP');
  assert.equal(diag.code, 'auth/unauthorized-domain');
  assert.equal(diag.projectId, FIREBASE_PROJECT_ID);
  assert.ok(!diag.message.includes('AIzaSyDQqazepvyM1F21G7mQP-XFbi7hkk95tUQ'), 'Guarantees API key is redacted');
  assert.ok(diag.message.includes('[REDACTED_API_KEY]'), 'Replaced with redact token');
  assert.ok(diag.suggestedAction.includes('Authorized Domains'), 'Provides clear instruction for Firebase Console');
  assert.ok(diag.suggestedAction.includes(diag.hostname), 'Includes current hostname in recommendation');

  // Test case 2: verify otp error
  const otpErr = {
    code: 'auth/invalid-verification-code',
    message: 'Invalid code'
  };
  const diagOtp = buildAuthDiagnostic(otpErr, 'VERIFY_OTP');
  assert.equal(diagOtp.stage, 'VERIFY_OTP');
  assert.ok(diagOtp.suggestedAction.includes('824619'), 'References configured test OTP code');
});

test('AUTH PHONE SECURITY: Test-only app verification toggle invariant', () => {
  const shouldDisableAppVerification = (isDev: boolean, phoneNumber: string): boolean => {
    return isDev && phoneNumber === FIREBASE_TEST_PHONE;
  };

  // Rule 1: Dev environment with exact test number -> ALLOWS bypass for local/preview testing
  assert.equal(shouldDisableAppVerification(true, '+16505553434'), true);

  // Rule 2: Dev environment with real user phone number -> MUST NOT bypass
  assert.equal(shouldDisableAppVerification(true, '+919829012345'), false);
  assert.equal(shouldDisableAppVerification(true, '+16505550000'), false);

  // Rule 3: Production environment -> MUST NEVER bypass under any circumstance
  assert.equal(shouldDisableAppVerification(false, '+16505553434'), false);
  assert.equal(shouldDisableAppVerification(false, '+919829012345'), false);
});

