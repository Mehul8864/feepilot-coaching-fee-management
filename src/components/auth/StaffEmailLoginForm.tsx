/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FeePilot Staff Email Login Component
 * Role: ACCOUNTS_EXECUTIVE (Strict RBAC)
 * Strictly enforces that only authorized accounts executives access the ledger console.
 */

import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Building2,
  Sparkles
} from 'lucide-react';
import { loginStaffWithEmail, mapAuthErrorMessage } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { getTranslation } from '../../utils/i18n';
import { UserProfile } from '../../types/domain';

export function StaffEmailLoginForm() {
  const { language, refreshProfile, setUserProfileExplicit } = useAuth();
  const t = getTranslation(language);

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage(t.errInvalidCredentials);
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const { profile } = await loginStaffWithEmail(email, password);
      setUserProfileExplicit(profile);
      await refreshProfile();
    } catch (err: any) {
      console.error('Staff Login Error:', err);
      // Real authentication only: do not fake a session if account does not exist in Firebase Auth
      setErrorMessage(mapAuthErrorMessage(err?.code || err?.message || 'UNKNOWN', language));
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoStaffCredentials = () => {
    setEmail('staff.jaipur@feepilot.internal');
    setPassword('Jaipur2026!');
    setErrorMessage(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div>
        <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Building2 className="w-5 h-5 text-teal-600" />
          {t.staffHeading}
        </h3>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          {t.staffSubheading}
        </p>
      </div>

      {/* Administrative Provisioning Information Card */}
      <div className="p-3.5 bg-slate-100/90 border border-slate-200 rounded-lg text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-slate-700" />
            {t.demoStaffTitle}
          </span>
          <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
            ACCOUNTS_EXECUTIVE
          </span>
        </div>
        <p className="text-slate-600 text-[11px] leading-relaxed">
          {t.demoStaffNotice}
        </p>
        <div className="pt-1 flex flex-col sm:flex-row sm:items-center gap-2">
          <button
            type="button"
            onClick={fillDemoStaffCredentials}
            className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-900 text-teal-300 rounded shadow-2xs transition-colors cursor-pointer self-start"
          >
            {t.useStaffDemoBtn}
          </button>
          <span className="text-[10px] text-slate-500 italic">
            {t.staffDemoCaveat}
          </span>
        </div>
      </div>

      {/* RBAC Security Disclaimer */}
      <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs text-amber-900 space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-amber-950">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
          <span>{t.rbacNoticeTitle}</span>
        </div>
        <p className="text-[11px] leading-relaxed text-amber-900">
          {t.rbacNoticeBody}
        </p>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-start gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{errorMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            {t.emailLabel}
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              disabled={isLoading}
              className="w-full text-xs font-mono pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none disabled:bg-slate-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            {t.passwordLabel}
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.passwordPlaceholder}
              disabled={isLoading}
              className="w-full text-xs font-mono pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none disabled:bg-slate-100"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !email.trim() || !password}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-teal-400" />
              <span>{t.signingIn}</span>
            </>
          ) : (
            <>
              <span>{t.signInBtn}</span>
              <ArrowRight className="w-4 h-4 text-teal-400" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
