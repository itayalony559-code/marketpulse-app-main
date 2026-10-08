import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Crown, Sparkles, ArrowLeft, Loader2 } from 'lucide-react';
import { useSubscription } from '@/context/SubscriptionContext';
import { useLanguage } from '@/context/LanguageContext';
import type { TranslationKey } from '@/i18n/translations';
import { DisclaimerBanner } from '@/components/Disclaimer';

export function UpgradePage() {
  const navigate = useNavigate();
  const { isPremium, activatePremium } = useSubscription();
  const { t, lang } = useLanguage();
  const [email, setEmail] = useState('');
  const [processing, setProcessing] = useState(false);
  const [plan, setPlan] = useState<'Monthly' | 'Yearly'>('Monthly');
  const [webhookDelivered, setWebhookDelivered] = useState<boolean | null>(null);

  const freeFeatures: TranslationKey[] = [
    'basicMarketData',
    'basicCharts',
    'limitedNewsAccess',
    'basicWatchlist',
  ];

  const premiumFeatures: TranslationKey[] = [
    'everythingInFree',
    'extendedMarketData',
    'advancedCharts',
    'premiumFinancialNews',
    'newsSentimentIndicators',
    'pushNotifications',
    'premiumMarketInsights',
  ];

  const handleUpgrade = async () => {
    setProcessing(true);
    setWebhookDelivered(null);
    const delivered = await activatePremium(email.trim() || 'guest@marketpulse.app', plan);
    setWebhookDelivered(delivered);
    setProcessing(false);
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('back')}
      </button>

      {/* Hero */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-gold-500/30 bg-gold-500/10">
          <Crown className="h-7 w-7 text-gold-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">{t('unlockFullMarket')}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
          {t('getDeeperData')}
        </p>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Free */}
        <div className="surface p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('free')}</p>
          <p className="mt-2 text-3xl font-bold text-white">$0</p>
          <p className="text-xs text-slate-500">{t('alwaysFree')}</p>
          <ul className="mt-5 space-y-3">
            {freeFeatures.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                {t(f)}
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-lg border border-ink-700 bg-ink-850 py-2.5 text-center text-sm font-semibold text-slate-500">
            {t('currentPlan')}
          </div>
        </div>

        {/* Premium */}
        <div className="relative overflow-hidden rounded-xl border border-gold-500/40 bg-gradient-to-b from-gold-500/[0.08] to-ink-900 p-6">
          <div className="absolute right-4 top-4">
            <span className="inline-flex items-center gap-1 rounded-full border border-gold-500/40 bg-gold-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-400">
              <Sparkles className="h-2.5 w-2.5" />
              {t('recommended')}
            </span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-400">{t('premium')}</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {plan === 'Monthly' ? '$19' : '$190'}
            <span className="text-base font-medium text-slate-400">/{plan === 'Monthly' ? 'mo' : 'yr'}</span>
          </p>
          <p className="text-xs text-slate-500">
            {plan === 'Monthly'
              ? t('billedMonthly')
              : lang === 'he' ? 'חיוב שנתי · ניתן לבטל בכל עת' : 'Billed yearly · Cancel anytime'}
          </p>
          <ul className="mt-5 space-y-3">
            {premiumFeatures.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-200">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
                {t(f)}
              </li>
            ))}
          </ul>
          {isPremium ? (
            <div className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-gold-500/40 bg-gold-500/10 py-2.5 text-sm font-semibold text-gold-400">
              <Crown className="h-4 w-4" />
              {t('premiumActive')}
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              <div className="grid grid-cols-2 rounded-lg border border-ink-700 bg-ink-950 p-1" role="group" aria-label={lang === 'he' ? 'תדירות חיוב' : 'Billing frequency'}>
                {(['Monthly', 'Yearly'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={plan === option}
                    onClick={() => setPlan(option)}
                    className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${plan === option ? 'bg-gold-500/15 text-gold-300' : 'text-slate-400 hover:text-white'}`}
                  >
                    {option === 'Monthly'
                      ? lang === 'he' ? 'חודשי' : 'Monthly'
                      : lang === 'he' ? 'שנתי' : 'Yearly'}
                  </button>
                ))}
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full rounded-lg border border-ink-700 bg-ink-850 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-gold-500/50"
                aria-label="Email address"
              />
              <button
                onClick={handleUpgrade}
                disabled={processing}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-gold-400 to-gold-500 py-3 text-sm font-bold text-ink-950 shadow-lg shadow-gold-500/20 transition-all hover:from-gold-500 hover:to-gold-600 hover:shadow-gold-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Crown className="h-4 w-4" />
                )}
                {processing ? t('processing') : t('upgradeToPremium')}
              </button>
            </div>
          )}
          {webhookDelivered !== null && (
            <p
              role={webhookDelivered ? 'status' : 'alert'}
              className={`mt-3 rounded-lg border px-3 py-2 text-xs ${webhookDelivered ? 'border-bull/30 bg-bull/10 text-bull' : 'border-gold-500/30 bg-gold-500/10 text-gold-300'}`}
            >
              {webhookDelivered
                ? lang === 'he' ? 'הפרימיום הופעל והעדכון נשלח.' : 'Premium is active and the subscription webhook was delivered.'
                : lang === 'he' ? 'הפרימיום הופעל, אך שליחת העדכון נכשלה.' : 'Premium is active, but the subscription webhook could not be delivered.'}
            </p>
          )}
        </div>
      </div>

      <p className="text-center text-[10px] text-slate-600">
        {t('simulatedSubscription')}
      </p>

      <div className="mt-2">
        <DisclaimerBanner />
      </div>
    </div>
  );
}
