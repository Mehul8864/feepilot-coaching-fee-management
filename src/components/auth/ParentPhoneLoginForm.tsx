/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FeePilot Parent Phone OTP Authentication Component
 * Supports:
 * - Real SMS OTP via Firebase Phone Auth with reCAPTCHA
 * - Pre-configured Firebase Console test number: +1 650-555-3434 (Code: 824619)
 * - Safe developer diagnostics panel for preview domain authorization issues
 * - Clean reCAPTCHA lifecycle management without duplicates or detached nodes
 * - India default (+91)
 * - Auto-initialization of parent profile with 0 student links
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  KeyRound, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Shield, 
  Sparkles,
  Smartphone,
  Terminal,
  Copy,
  Check,
  ExternalLink,
  Info
} from 'lucide-react';
import { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import { 
  initializeRecaptcha, 
  clearRecaptcha, 
  sendPhoneOtp, 
  verifyPhoneOtpAndResolveProfile,
  mapAuthErrorMessage,
  buildAuthDiagnostic,
  isDevEnvironment,
  AuthDiagnosticInfo,
  FIREBASE_TEST_PHONE,
  FIREBASE_TEST_OTP,
  FIREBASE_PROJECT_ID
} from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { getTranslation } from '../../utils/i18n';

export function ParentPhoneLoginForm() {
  const { language, refreshProfile, setUserProfileExplicit } = useAuth();
  const t = getTranslation(language);
  const isDev = isDevEnvironment();

  const [countryCode, setCountryCode] = useState<string>('+91');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [step, setStep] = useState<'PHONE_INPUT' | 'OTP_INPUT'>('PHONE_INPUT');
  
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [diagnosticInfo, setDiagnosticInfo] = useState<AuthDiagnosticInfo | null>(null);
  const [copiedDiag, setCopiedDiag] = useState<boolean>(false);
  
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  // Timer countdown for resending OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Clean up reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      clearRecaptcha();
    };
  }, []);

  const handleSendOtp = async (overrideNumber?: string) => {
    setErrorMessage(null);
    setDiagnosticInfo(null);
    const targetDigits = (overrideNumber !== undefined ? overrideNumber : phoneNumber).replace(/\D/g, '');
    
    if (countryCode === '+91' && targetDigits.length !== 10) {
      setErrorMessage(t.errInvalidPhone);
      return;
    }
    if (countryCode === '+1' && targetDigits.length !== 10) {
      setErrorMessage(t.errInvalidPhone);
      return;
    }

    const fullNumber = `${countryCode}${targetDigits}`;
    setIsSendingOtp(true);

    // Step A: Initialize reCAPTCHA verifier safely
    let verifier: RecaptchaVerifier;
    try {
      verifier = initializeRecaptcha('recaptcha-container');
    } catch (recaptchaErr: any) {
      console.error('reCAPTCHA initialization error:', recaptchaErr);
      const diag = buildAuthDiagnostic(recaptchaErr, 'RECAPTCHA_INIT');
      setDiagnosticInfo(diag);
      setErrorMessage(mapAuthErrorMessage(diag.code, language));
      setIsSendingOtp(false);
      return;
    }

    // Step B: Send Phone OTP via Firebase
    try {
      const confirmation = await sendPhoneOtp(fullNumber, verifier);
      setConfirmationResult(confirmation);
      setStep('OTP_INPUT');
      setResendCooldown(30);
    } catch (err: any) {
      console.error('Phone OTP Send error:', err);
      clearRecaptcha();
      const diag = buildAuthDiagnostic(err, 'SEND_PHONE_OTP');
      setDiagnosticInfo(diag);
      setErrorMessage(mapAuthErrorMessage(diag.code, language));
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!confirmationResult) {
      setErrorMessage(t.errGenericAuth);
      return;
    }
    if (otpCode.trim().length !== 6) {
      setErrorMessage(t.errInvalidOtp);
      return;
    }

    setErrorMessage(null);
    setDiagnosticInfo(null);
    setIsVerifyingOtp(true);

    try {
      const { profile } = await verifyPhoneOtpAndResolveProfile(confirmationResult, otpCode.trim());
      setUserProfileExplicit(profile);
      await refreshProfile();
    } catch (err: any) {
      console.error('Phone OTP Verification error:', err);
      const diag = buildAuthDiagnostic(err, 'VERIFY_OTP');
      setDiagnosticInfo(diag);
      setErrorMessage(mapAuthErrorMessage(diag.code, language));
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Quick preset loader for configured test credentials
  const fillTestCredentials = () => {
    setCountryCode('+1');
    setPhoneNumber('6505553434');
    setErrorMessage(null);
    setDiagnosticInfo(null);
  };

  const copyDiagnosticToClipboard = () => {
    if (!diagnosticInfo) return;
    const diagnosticText = JSON.stringify({
      environment: 'DEV_PREVIEW',
      projectId: diagnosticInfo.projectId,
      hostname: diagnosticInfo.hostname,
      stage: diagnosticInfo.stage,
      code: diagnosticInfo.code,
      message: diagnosticInfo.message,
      suggestedAction: diagnosticInfo.suggestedAction,
      timestamp: new Date().toISOString()
    }, null, 2);

    navigator.clipboard.writeText(diagnosticText).then(() => {
      setCopiedDiag(true);
      setTimeout(() => setCopiedDiag(false), 2500);
    }).catch(() => {});
  };

  return (
    <div className="space-y-6">
      {/* reCAPTCHA DOM Anchor: Unconstrained container for invisible widget */}
      <div id="recaptcha-container" ref={recaptchaContainerRef} className="my-0.5"></div>

      {/* Header Info */}
      <div>
        <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-teal-600" />
          {t.parentHeading}
        </h3>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          {t.parentSubheading}
        </p>
      </div>

      {/* Pre-configured Demo Test Helper */}
      <div className="p-3.5 bg-teal-50/80 border border-teal-200/90 rounded-lg text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-teal-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-teal-600" />
            {t.testCredentialsTitle}
          </span>
          <span className="font-mono text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-bold">
            Verified in Console
          </span>
        </div>
        <p className="text-slate-600 text-[11px] leading-relaxed">
          {t.testPhoneNotice} <code className="font-mono font-bold text-slate-800">+1 650-555-3434</code> (Code: <code className="font-mono font-bold text-slate-800">824619</code>)
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={fillTestCredentials}
            className="px-2.5 py-1 text-[11px] font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded shadow-2xs transition-colors cursor-pointer"
          >
            {t.useTestPhoneBtn}
          </button>
          {step === 'OTP_INPUT' && (
            <button
              type="button"
              onClick={() => setOtpCode(FIREBASE_TEST_OTP)}
              className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-900 text-teal-300 rounded shadow-2xs transition-colors cursor-pointer"
            >
              {t.useTestOtpBtn}
            </button>
          )}
        </div>
      </div>

      {/* User-Facing Error Banner */}
      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-start gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Authentication Notice</span>
            <span className="leading-relaxed text-red-800">{errorMessage}</span>
          </div>
        </div>
      )}

      {/* SAFE DEVELOPER-MODE DIAGNOSTIC PANEL (Preview Environment) */}
      {isDev && diagnosticInfo && (
        <div className="p-3.5 bg-slate-900 text-slate-100 border border-slate-700 rounded-lg text-xs space-y-2.5 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
              <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{t.devDiagnosticTitle}</span>
            </div>
            <span className="font-mono text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
              Preview Dev Mode
            </span>
          </div>

          <div className="space-y-1.5 text-[11px] font-mono leading-relaxed">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1">
              <span className="text-slate-400 font-sans min-w-[120px]">{t.devStageLabel}:</span>
              <span className="text-amber-300 font-bold bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">
                {diagnosticInfo.stage}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-1">
              <span className="text-slate-400 font-sans min-w-[120px]">{t.devErrorCodeLabel}:</span>
              <span className="text-red-300 font-bold bg-red-950/60 px-1.5 py-0.5 rounded border border-red-800/40">
                {diagnosticInfo.code}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-1">
              <span className="text-slate-400 font-sans min-w-[120px]">{t.devDomainLabel}:</span>
              <span className="text-sky-300 select-all font-semibold">
                {diagnosticInfo.hostname}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-1">
              <span className="text-slate-400 font-sans min-w-[120px]">{t.devProjectLabel}:</span>
              <span className="text-slate-300">
                {diagnosticInfo.projectId}
              </span>
            </div>

            <div className="pt-1 text-slate-300 font-sans text-xs bg-slate-800/80 p-2.5 rounded border border-slate-700/80 space-y-1">
              <span className="text-emerald-300 font-semibold block flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                {t.devActionLabel}:
              </span>
              <p className="text-slate-200 leading-relaxed text-[11px]">
                {diagnosticInfo.suggestedAction}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
            <span className="text-[10px] text-slate-500 font-sans italic">
              Audit Guarantee: No API keys, passwords, or tokens are exposed.
            </span>
            <button
              type="button"
              onClick={copyDiagnosticToClipboard}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors cursor-pointer"
            >
              {copiedDiag ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t.devCopyBtn}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 1: Phone Number Input */}
      {step === 'PHONE_INPUT' ? (
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendOtp();
          }} 
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.mobileLabel}
            </label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-28 text-xs font-medium px-2.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
              >
                <option value="+91">🇮🇳 +91 (IN)</option>
                <option value="+1">🇺🇸 +1 (US)</option>
              </select>
              <div className="relative flex-1">
                <input
                  type="tel"
                  autoComplete="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder={countryCode === '+91' ? '98765 43210' : '650 555 3434'}
                  disabled={isSendingOtp}
                  className="w-full text-sm font-mono tracking-wide px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none disabled:bg-slate-100"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Standard 10-digit mobile number linked to student fee receipts at Jaipur centre.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSendingOtp || !phoneNumber.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSendingOtp ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{t.sendingOtp}</span>
              </>
            ) : (
              <>
                <span>{t.sendOtpBtn}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      ) : (
        /* STEP 2: 6-Digit OTP Verification */
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleVerifyOtp();
          }} 
          className="space-y-4"
        >
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">Sent code to: </span>
              <span className="font-mono font-bold text-slate-900">
                {countryCode} {phoneNumber}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep('PHONE_INPUT');
                setOtpCode('');
                setErrorMessage(null);
                setDiagnosticInfo(null);
              }}
              className="text-teal-700 hover:text-teal-900 font-semibold underline underline-offset-2 cursor-pointer"
            >
              {t.changeNumberBtn}
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.otpLabel}
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder={t.otpPlaceholder}
                autoFocus
                disabled={isVerifyingOtp}
                className="w-full text-center tracking-[0.5em] font-mono text-xl py-3 px-4 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:tracking-normal focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none disabled:bg-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            {resendCooldown > 0 ? (
              <span>
                {t.resendCooldown} <strong className="font-mono text-teal-800">{resendCooldown}{t.seconds}</strong>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleSendOtp()}
                disabled={isSendingOtp}
                className="text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSendingOtp ? 'animate-spin' : ''}`} />
                {t.resendOtpBtn}
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isVerifyingOtp || otpCode.length !== 6}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isVerifyingOtp ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{t.verifyingOtp}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{t.verifyOtpBtn}</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Security Footer Notice */}
      <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400">
        <Shield className="w-3.5 h-3.5 text-teal-600 shrink-0" />
        <span>{t.recaptchaNotice}</span>
      </div>
    </div>
  );
}
