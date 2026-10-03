import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, LoaderCircle } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

type LoginLocationState = { from?: string };

export function LoginPage() {
  const { isAuthenticated, signInWithGoogle } = useAuth();
  const { lang, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState('');

  const requestedPath = (location.state as LoginLocationState | null)?.from;
  const destination = requestedPath?.startsWith('/') ? requestedPath : '/';

  useEffect(() => {
    if (isAuthenticated) navigate(destination, { replace: true });
  }, [destination, isAuthenticated, navigate]);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Google sign-in could not be started.');
      setSigningIn(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-10 text-white">
      <div className="w-full max-w-sm">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#00FF88] text-black shadow-[0_0_22px_rgba(0,255,136,0.2)]">
              <BarChart3 className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <span className="text-sm font-bold">{t('appName')}</span>
          </div>
          <LanguageSwitcher />
        </header>

        <section className="rounded-xl border border-[#202820] bg-[#0D0D0D] p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#00FF88]">
            {lang === 'he' ? 'גישה מאובטחת' : 'Secure access'}
          </p>
          <h1 className="mt-2 text-2xl font-bold">
            {lang === 'he' ? 'התחברות ל-MarketPulse' : 'Sign in to MarketPulse'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {lang === 'he'
              ? 'התחבר/י כדי להמשיך לשווקים, לחדשות ולפרופיל ההשקעה שלך.'
              : 'Sign in to continue to your markets, news, and investor profile.'}
          </p>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-[#171717] transition-colors hover:bg-slate-100 disabled:cursor-wait disabled:opacity-70"
          >
            {signingIn ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <span className="text-base font-bold text-[#4285F4]" aria-hidden="true">G</span>
            )}
            {signingIn
              ? lang === 'he' ? 'מתחבר...' : 'Connecting...'
              : lang === 'he' ? 'התחבר באמצעות Google' : 'Sign in with Google'}
          </button>

          {error && (
            <p role="alert" className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs leading-relaxed text-red-300">
              {error}
            </p>
          )}

          <p className="mt-5 text-center text-[11px] leading-relaxed text-slate-500">
            {t('disclaimerShort')}
          </p>
        </section>
      </div>
    </main>
  );
}