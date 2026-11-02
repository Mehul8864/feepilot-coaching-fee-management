/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function LanguageToggle() {
  const { language, setLanguage } = useAuth();

  return (
    <div className="inline-flex items-center rounded-lg bg-slate-800/80 p-0.5 border border-slate-700 text-xs">
      <div className="px-2 py-1 text-slate-400 flex items-center gap-1.5 font-medium">
        <Globe className="w-3.5 h-3.5 text-teal-400" />
        <span className="hidden sm:inline">Lang:</span>
      </div>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
          language === 'en'
            ? 'bg-teal-500 text-slate-950 shadow-xs'
            : 'text-slate-300 hover:text-white'
        }`}
      >
        English
      </button>
      <button
        type="button"
        onClick={() => setLanguage('hi')}
        className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
          language === 'hi'
            ? 'bg-teal-500 text-slate-950 shadow-xs'
            : 'text-slate-300 hover:text-white'
        }`}
      >
        हिन्दी
      </button>
    </div>
  );
}
