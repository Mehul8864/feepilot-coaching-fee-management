/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, LogOut, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getTranslation } from '../../utils/i18n';

export function AccessDeniedPage({ onBackToLogin }: { onBackToLogin?: () => void }) {
  const { language, logout, currentUser, userProfile } = useAuth();
  const t = getTranslation(language);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-red-200 p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {t.accessDeniedTitle}
          </h2>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            {t.accessDeniedDesc}
          </p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-xs space-y-1.5 font-mono">
          <div className="text-slate-500">Authenticated UID:</div>
          <div className="text-slate-800 truncate">{currentUser?.uid || 'Unknown'}</div>
          <div className="text-slate-500 pt-1">Assigned Role:</div>
          <div className="text-red-700 font-bold">{userProfile?.role || 'NONE (Unprovisioned)'}</div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => logout()}
            className="w-full py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.signOutBtn}</span>
          </button>
          {onBackToLogin && (
            <button
              type="button"
              onClick={onBackToLogin}
              className="w-full py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t.returnToLogin}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
