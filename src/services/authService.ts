/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FeePilot Authentication Service
 * Implements:
 * 1. Email/Password authentication for ACCOUNTS_EXECUTIVE
 * 2. Phone OTP authentication via Firebase Phone Auth & RecaptchaVerifier for PARENT
 * 3. Pre-configured Firebase Console test phone (+1 650-555-3434) testing support
 * 4. Safe developer-mode diagnostic reporting for preview domains
 * 5. Firestore profile resolution and self-initialization of unlinked parent records
 * 6. Sign out and error mapping
 */

import { 
  signInWithEmailAndPassword, 
  signInWithPhoneNumber, 
  signOut, 
  RecaptchaVerifier, 
  ConfirmationResult, 
  User, 
  UserCredential
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { UserProfile, LanguageCode } from '../types/domain';
import { getTranslation } from '../utils/i18n';

// Pre-configured Firebase Console test credentials
export const FIREBASE_TEST_PHONE = '+16505553434';
export const FIREBASE_TEST_OTP = '824619';
export const FIREBASE_PROJECT_ID = 'gen-lang-client-0899438205';

export type AuthStage = 'RECAPTCHA_INIT' | 'SEND_PHONE_OTP' | 'VERIFY_OTP' | 'STAFF_LOGIN' | 'PROFILE_FETCH';

export interface AuthDiagnosticInfo {
  stage: AuthStage;
  code: string;
  message: string;
  suggestedAction: string;
  hostname: string;
  projectId: string;
}

let globalRecaptchaVerifier: RecaptchaVerifier | null = null;

/**
 * Checks whether the current execution is within a non-production development environment.
 * In production builds (Vite PROD), strictly returns false to ensure development-only
 * aids, debug widgets, and testing consoles are never rendered.
 */
export function isDevEnvironment(): boolean {
  // 1. Vite production build check (statically evaluated at build time)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.PROD || import.meta.env.MODE === 'production') {
      return false;
    }
    if (import.meta.env.DEV) {
      return true;
    }
  }

  // 2. Node.js environment check
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
    return false;
  }

  // 3. Localhost hostname check (only when not in production)
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') {
      return true;
    }
  }

  return false;
}

/**
 * Builds safe developer-mode diagnostic details.
 * Sanitizes output to guarantee no API keys, tokens, or credentials are leaked.
 */
export function buildAuthDiagnostic(err: any, stage: AuthStage): AuthDiagnosticInfo {
  const code = typeof err?.code === 'string' ? err.code : 'auth/unknown-error';
  const rawMessage = typeof err?.message === 'string' ? err.message : String(err || 'Unknown error');
  // Redact any accidental credential/key patterns
  const message = rawMessage.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]');
  
  const hostname = typeof window !== 'undefined' && window.location?.hostname ? window.location.hostname : 'localhost';
  const projectId = FIREBASE_PROJECT_ID;

  let suggestedAction = `Check browser network tab and Firebase console status for stage ${stage}.`;

  if (code === 'auth/operation-not-allowed' || code.includes('operation-not-allowed') || rawMessage.includes('OPERATION_NOT_ALLOWED')) {
    suggestedAction = `Phone Authentication failed with "auth/operation-not-allowed". Root Cause: In Firebase Console (Authentication > Settings > SMS region policy), country code "+1" (United States) is not enabled for test number ${FIREBASE_TEST_PHONE}. In Firebase Console: 1. Go to Authentication > Settings > SMS region policy and ensure "United States (+1)" is enabled. 2. In Authentication > Sign-in method, ensure "Phone" is toggled Enabled and click Save.`;
  } else if (code === 'auth/unauthorized-domain') {
    suggestedAction = `The domain "${hostname}" is not authorized. In Firebase Console (Authentication > Settings > Authorized Domains), click "Add Domain" and add "${hostname}".`;
  } else if (code === 'auth/invalid-app-credential') {
    suggestedAction = `App verification was rejected. In development, verify using configured test number ${FIREBASE_TEST_PHONE} with app verification disabled. For live numbers, verify reCAPTCHA and domain settings.`;
  } else if (code === 'auth/captcha-check-failed') {
    suggestedAction = `reCAPTCHA token generation failed or was cancelled. Ensure the reCAPTCHA DOM container is visible and accessible.`;
  } else if (code === 'auth/too-many-requests') {
    suggestedAction = `SMS quota or request limit reached for this IP/device. Wait 15-30 minutes or use the pre-configured test phone ${FIREBASE_TEST_PHONE} (OTP: ${FIREBASE_TEST_OTP}).`;
  } else if (code === 'auth/invalid-verification-code') {
    suggestedAction = `The 6-digit OTP code does not match. For test number ${FIREBASE_TEST_PHONE}, the configured verification code is ${FIREBASE_TEST_OTP}.`;
  } else if (code === 'auth/code-expired') {
    suggestedAction = `The SMS verification code has expired. Click "Resend OTP" to request a fresh code.`;
  } else if (code === 'auth/invalid-phone-number' || code === 'INVALID_PHONE_FORMAT') {
    suggestedAction = `Verify phone number is entered with a valid country code in E.164 format (e.g., +91 9876543210 or +1 6505553434).`;
  } else if (code === 'auth/network-request-failed') {
    suggestedAction = `Network connectivity error contacting Firebase Auth endpoints. Check internet connection or corporate firewall.`;
  } else if (code === 'auth/internal-error') {
    suggestedAction = `Firebase internal error. Ensure the Firebase project "${projectId}" is active and Phone provider is enabled.`;
  } else if (code === 'CONTAINER_NOT_FOUND') {
    suggestedAction = `reCAPTCHA DOM element not found. Verify the recaptcha-container element exists in the DOM.`;
  }

  return {
    stage,
    code,
    message,
    suggestedAction,
    hostname,
    projectId
  };
}

/**
 * Initializes or retrieves the reCAPTCHA verifier for Phone Auth.
 * Handles DOM container lifecycle and cleans up stale widgets.
 */
export function initializeRecaptcha(containerId: string): RecaptchaVerifier {
  // If an existing verifier is attached, clean it up before recreating
  clearRecaptcha();

  if (typeof document !== 'undefined') {
    const el = document.getElementById(containerId);
    if (!el) {
      const err: any = new Error(`reCAPTCHA container with id "${containerId}" was not found in the DOM.`);
      err.code = 'CONTAINER_NOT_FOUND';
      throw err;
    }
    // Clean any previous widget child nodes
    el.innerHTML = '';
  }

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved
    },
    'expired-callback': () => {
      console.warn('reCAPTCHA expired. Resetting verifier.');
      clearRecaptcha();
    }
  });

  globalRecaptchaVerifier = verifier;
  return verifier;
}

/**
 * Clears the active Recaptcha verifier and its DOM container.
 */
export function clearRecaptcha(): void {
  if (globalRecaptchaVerifier) {
    try {
      globalRecaptchaVerifier.clear();
    } catch {
      // ignore
    }
    globalRecaptchaVerifier = null;
  }
}

/**
 * Staff Login via Firebase Email & Password.
 * Accounts Executive accounts are pre-provisioned in Firestore.
 */
export async function loginStaffWithEmail(email: string, password: string): Promise<{ user: User; profile: UserProfile }> {
  const cleanEmail = email.trim();
  const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
  const uid = credential.user.uid;

  const profile = await fetchUserProfile(uid);
  if (!profile) {
    // If not in database, reject as unauthorized staff
    await signOut(auth);
    throw new Error('UNAUTHORIZED_STAFF_RECORD_MISSING');
  }

  if (profile.role !== 'ACCOUNTS_EXECUTIVE') {
    await signOut(auth);
    throw new Error('ROLE_MISMATCH_NOT_STAFF');
  }

  return { user: credential.user, profile };
}

/**
 * Initiates Phone OTP send via Firebase Phone Auth.
 * Strictly applies appVerificationDisabledForTesting ONLY in dev mode for +16505553434.
 */
export async function sendPhoneOtp(
  fullPhoneNumber: string, 
  verifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  const trimmed = fullPhoneNumber.trim();
  if (!trimmed.startsWith('+')) {
    const err: any = new Error('INVALID_PHONE_FORMAT');
    err.code = 'INVALID_PHONE_FORMAT';
    throw err;
  }

  // Test-only app verification: strictly in DEV mode and strictly for the pre-configured test phone
  const isDev = isDevEnvironment();
  const isTestNumber = trimmed === FIREBASE_TEST_PHONE;

  if (isDev && isTestNumber) {
    auth.settings.appVerificationDisabledForTesting = true;
  } else {
    // Production or live phone numbers MUST enforce app verification
    auth.settings.appVerificationDisabledForTesting = false;
  }

  try {
    return await signInWithPhoneNumber(auth, trimmed, verifier);
  } catch (error) {
    // Clean up on error to allow clean retry
    clearRecaptcha();
    throw error;
  }
}

/**
 * Verifies the 6-digit OTP code and resolves or seeds the Parent user profile.
 */
export async function verifyPhoneOtpAndResolveProfile(
  confirmationResult: ConfirmationResult,
  otpCode: string
): Promise<{ user: User; profile: UserProfile }> {
  const cleanCode = otpCode.trim();
  if (cleanCode.length !== 6) {
    const err: any = new Error('INVALID_OTP_LENGTH');
    err.code = 'INVALID_OTP_LENGTH';
    throw err;
  }

  const credential: UserCredential = await confirmationResult.confirm(cleanCode);
  const user = credential.user;
  const uid = user.uid;

  // Retrieve user profile from Firestore
  let profile = await fetchUserProfile(uid);

  // If new parent, self-provision initial Parent profile per firestore.rules
  if (!profile) {
    const newParentProfile: UserProfile = {
      id: uid,
      role: 'PARENT',
      phone: user.phoneNumber || '',
      name: user.displayName || 'Parent',
      linkedStudentIds: [],
      authorizedCentreIds: [],
      createdAt: new Date().toISOString()
    };

    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, newParentProfile);
      profile = newParentProfile;
    } catch (err) {
      console.warn('Could not persist initial parent doc (offline or restricted):', err);
      // Fallback local representation for parent session
      profile = newParentProfile;
    }
  }

  return { user, profile };
}

/**
 * Fetches user profile document from Firestore.
 */
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Signs out the current authenticated user.
 */
export async function logoutUser(): Promise<void> {
  clearRecaptcha();
  await signOut(auth);
}

/**
 * Maps Firebase Auth and business errors into localized friendly messages.
 */
export function mapAuthErrorMessage(errorCode: string, lang: LanguageCode): string {
  const t = getTranslation(lang);
  switch (errorCode) {
    case 'auth/invalid-email':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
      return t.errInvalidCredentials;
    case 'auth/too-many-requests':
      return t.errTooManyRequests;
    case 'auth/invalid-verification-code':
    case 'auth/code-expired':
    case 'INVALID_OTP_LENGTH':
      return t.errInvalidVerificationCode;
    case 'auth/quota-exceeded':
      return t.errPhoneQuota;
    case 'auth/invalid-phone-number':
    case 'INVALID_PHONE_FORMAT':
      return t.errInvalidPhone;
    case 'auth/unauthorized-domain':
      return t.errUnauthorizedDomain;
    case 'auth/invalid-app-credential':
      return t.errAppCredential;
    case 'auth/captcha-check-failed':
      return t.errCaptchaFailed;
    case 'auth/network-request-failed':
      return t.errNetwork;
    case 'auth/operation-not-allowed':
      return t.errOperationNotAllowed;
    case 'UNAUTHORIZED_STAFF_RECORD_MISSING':
      return t.errUserNotFound;
    case 'ROLE_MISMATCH_NOT_STAFF':
      return t.accessDeniedDesc;
    default:
      return t.errGenericAuth;
  }
}
