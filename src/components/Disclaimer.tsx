import { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export function DisclaimerBanner() {
  const { t } = useLanguage();

  return (
    <div className="flex items-center gap-2 rounded-lg border border-ink-700/50 bg-ink-900/60 px-3 py-2">
      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-slate-500" />
      <p className="text-[10px] leading-tight text-slate-500">{t('disclaimerShort')}</p>
    </div>
  );
}

export function DisclaimerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLanguage();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="surface relative z-10 max-w-md p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-slate-400" />
            <h2 className="text-lg font-bold text-white">{t('disclaimer')}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-ink-850 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">{t('disclaimerFull')}</p>
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-lg border border-ink-700 bg-ink-850 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:border-ink-600 hover:text-white"
        >
          {t('back')}
        </button>
      </div>
    </div>
  );
}

export function DisclaimerFooter() {
  const { t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-ink-700/40 bg-ink-900/40 py-2 text-[10px] font-medium text-slate-600 transition-colors hover:text-slate-400"
      >
        <AlertCircle className="h-3 w-3" />
        {t('disclaimerShort')}
      </button>
      <DisclaimerModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
