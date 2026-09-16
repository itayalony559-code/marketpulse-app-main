import { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { LANGUAGES } from '@/i18n/translations';

export function LanguageSwitcher() {
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const current = LANGUAGES.find((l) => l.code === lang);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label={t('language')}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-ink-700/60 bg-ink-850 px-2.5 text-slate-300 transition-colors hover:border-ink-600 hover:text-white"
      >
        <Globe className="h-4 w-4" />
        <span className="text-xs font-semibold">{current?.flag}</span>
      </button>

      {open && (
        <div className="absolute end-0 mt-2 w-48 overflow-hidden rounded-xl border border-ink-700/70 bg-ink-900 shadow-2xl shadow-black/50 backdrop-blur-xl">
          <div className="border-b border-ink-700/60 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {t('selectLanguage')}
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto scroll-thin">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2.5 text-sm transition-colors ${
                  l.code === lang
                    ? 'bg-bull/10 text-bull'
                    : 'text-slate-300 hover:bg-ink-850 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base">{l.flag}</span>
                  <span className="font-medium">{l.label}</span>
                </span>
                {l.code === lang && <Check className="h-4 w-4 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
