import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Newspaper, BarChart3, Compass, Search, Crown, User } from 'lucide-react';
import { useSubscription } from '@/context/SubscriptionContext';
import { useLanguage } from '@/context/LanguageContext';
import { HeaderMarketStatus } from '@/components/MarketSession';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { DisclaimerFooter } from '@/components/Disclaimer';

const NAV_ITEMS = [
  { to: '/', labelKey: 'home' as const, icon: Newspaper },
  { to: '/markets', labelKey: 'markets' as const, icon: BarChart3 },
  { to: '/explore', labelKey: 'explore' as const, icon: Compass },
  { to: '/profile', labelKey: 'profile' as const, icon: User },
];

export function AppShell() {
  const { isPremium } = useSubscription();
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-ink-950">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-ink-700/60 bg-ink-950/85 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-bull to-bull-600">
              <BarChart3 className="h-4.5 w-4.5 text-ink-950" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold tracking-tight text-white">{t('appName')}</span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                {t('appTagline')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <HeaderMarketStatus />
            {isPremium && (
              <span className="inline-flex items-center gap-1 rounded-full border border-gold-500/40 bg-gold-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gold-400">
                <Crown className="h-3 w-3" />
                {t('premium')}
              </span>
            )}
            <LanguageSwitcher />
            <button
              onClick={() => navigate('/explore')}
              aria-label={t('search')}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-700/60 bg-ink-850 text-slate-300 transition-colors hover:border-ink-600 hover:text-white"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 pb-28 pt-4">
        <div className="animate-fade-in">
          <Outlet />
        </div>
        <div className="mt-6">
          <DisclaimerFooter />
        </div>
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-3xl -translate-x-1/2 px-4 pb-4">
        <div className="flex items-center justify-around rounded-2xl border border-ink-700/70 bg-ink-900/90 p-1.5 shadow-2xl shadow-black/50 backdrop-blur-xl">
          {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-semibold uppercase tracking-wide transition-all ${
                  isActive
                    ? 'text-bull'
                    : 'text-slate-500 hover:text-slate-300'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                      isActive ? 'bg-bull/15 scale-105' : 'group-hover:bg-ink-800'
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" strokeWidth={isActive ? 2.5 : 2} />
                  </span>
                  {t(labelKey)}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
