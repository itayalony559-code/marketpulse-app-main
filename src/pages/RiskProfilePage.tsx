import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, TrendingUp, Gauge, Target, ChevronRight, RotateCcw, Check } from 'lucide-react';
import { getAsset } from '@/services/marketService';
import { AssetRow } from '@/components/AssetRow';
import { useLanguage } from '@/context/LanguageContext';
import { useRiskProfile } from '@/context/RiskProfileContext';
import { DisclaimerBanner } from '@/components/Disclaimer';
import type { RiskLevel } from '@/types';

type Question = {
  id: string;
  text: string;
  options: { label: string; value: number }[];
};

const QUESTIONS: Question[] = [
  {
    id: 'horizon',
    text: 'How long do you plan to hold your investments?',
    options: [
      { label: 'Less than 1 year', value: 0 },
      { label: '1 to 3 years', value: 1 },
      { label: '3 to 5 years', value: 2 },
      { label: 'More than 5 years', value: 3 },
    ],
  },
  {
    id: 'reaction',
    text: 'If your portfolio dropped 20% in a month, what would you do?',
    options: [
      { label: 'Sell everything to stop the bleeding', value: 0 },
      { label: 'Sell some positions to limit losses', value: 1 },
      { label: 'Hold steady and wait for recovery', value: 2 },
      { label: 'Buy more at the dip', value: 3 },
    ],
  },
  {
    id: 'priority',
    text: 'What matters most to you?',
    options: [
      { label: 'Protecting my capital', value: 0 },
      { label: 'Steady growth with low risk', value: 1 },
      { label: 'Balanced growth and income', value: 2 },
      { label: 'Maximum returns, I can handle volatility', value: 3 },
    ],
  },
  {
    id: 'experience',
    text: 'How would you describe your investing experience?',
    options: [
      { label: 'Beginner — I am just starting out', value: 0 },
      { label: 'Some experience with basic stocks', value: 1 },
      { label: 'Experienced across multiple sectors', value: 2 },
      { label: 'Advanced — I actively trade and research', value: 3 },
    ],
  },
];

const HEBREW_QUESTIONS = [
  {
    text: 'לכמה זמן את/ה מתכנן/ת להחזיק בהשקעות שלך?',
    options: ['פחות משנה', 'שנה עד 3 שנים', '3 עד 5 שנים', 'יותר מ-5 שנים'],
  },
  {
    text: 'אם התיק שלך ירד ב-20% בחודש, מה תעשה/י?',
    options: ['אמכור הכול כדי לעצור את ההפסד', 'אמכור חלק מהפוזיציות', 'אחזיק ואמתין להתאוששות', 'אקנה עוד בירידה'],
  },
  {
    text: 'מה הכי חשוב לך?',
    options: ['שמירה על ההון', 'צמיחה יציבה בסיכון נמוך', 'איזון בין צמיחה להכנסה', 'תשואה מרבית גם בתנודתיות'],
  },
  {
    text: 'איך היית מתאר/ת את הניסיון שלך בהשקעות?',
    options: ['מתחיל/ה, רק נכנס/ת לתחום', 'ניסיון בסיסי במניות', 'ניסיון במספר מגזרים', 'מתקדם/ת, סוחר/ת וחוקר/ת באופן פעיל'],
  },
];

const RISK_LEVELS: Record<RiskLevel, { label: string; min: number; max: number; description: string; descriptionHe: string; icon: typeof Shield; color: string }> = {
  conservative: {
    label: 'Conservative',
    min: 0,
    max: 4,
    description: 'You prefer stability and capital protection. Your recommendations focus on large-cap, lower-volatility stocks with steady performance.',
    descriptionHe: 'יציבות ושמירה על ההון הן בעדיפות. ההמלצות מתמקדות בחברות גדולות ובתנודתיות נמוכה יחסית.',
    icon: Shield,
    color: 'text-bull',
  },
  moderate: {
    label: 'Moderate',
    min: 5,
    max: 8,
    description: 'You seek a balance between growth and safety. Your recommendations include a mix of established growth stocks and stable blue-chips.',
    descriptionHe: 'איזון בין צמיחה לביטחון. ההמלצות משלבות חברות צמיחה מבוססות ומניות יציבות.',
    icon: Gauge,
    color: 'text-gold-400',
  },
  aggressive: {
    label: 'Aggressive',
    min: 9,
    max: 12,
    description: 'You are comfortable with high volatility in exchange for maximum growth potential. Your recommendations focus on high-momentum, high-beta stocks.',
    descriptionHe: 'נוחות עם תנודתיות גבוהה תמורת פוטנציאל צמיחה. ההמלצות מתמקדות במניות בעלות מומנטום ותנודתיות גבוהים.',
    icon: TrendingUp,
    color: 'text-bear',
  },
};

function scoreToLevel(score: number): RiskLevel {
  if (score <= 4) return 'conservative';
  if (score <= 8) return 'moderate';
  return 'aggressive';
}

function getRecommendedSymbols(level: RiskLevel): string[] {
  switch (level) {
    case 'conservative':
      return ['JPM', 'V', 'MSFT', 'AAPL'];
    case 'moderate':
      return ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META'];
    case 'aggressive':
      return ['NVDA', 'TSLA', 'AMD', 'COIN', 'PLTR'];
  }
}

export function RiskProfilePage() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { profile: savedProfile, saveProfile, clearProfile } = useRiskProfile();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [completed, setCompleted] = useState(Boolean(savedProfile));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (savedProfile) setCompleted(true);
  }, [savedProfile]);

  const totalQuestions = QUESTIONS.length;
  const question = QUESTIONS[currentQ];
  const progress = completed ? 100 : (currentQ / totalQuestions) * 100;

  const handleAnswer = async (value: number) => {
    const newAnswers = { ...answers, [question.id]: value };
    setAnswers(newAnswers);

    if (currentQ < totalQuestions - 1) {
      setTimeout(() => setCurrentQ(currentQ + 1), 200);
    } else {
      const score = Object.values(newAnswers).reduce((total, answer) => total + answer, 0);
      const level = scoreToLevel(score);
      const profile = { score, level, updatedAt: new Date().toISOString() };
      setSaving(true);
      setSaveError('');
      setCompleted(true);
      try {
        await saveProfile(profile);
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : 'Profile could not be saved to Supabase.');
      } finally {
        setSaving(false);
      }
    }
  };

  const reset = async () => {
    setAnswers({});
    setCurrentQ(0);
    setCompleted(false);
    setSaveError('');
    try {
      await clearProfile();
    } catch {
      setSaveError(lang === 'he' ? 'לא ניתן למחוק את הפרופיל מ-Supabase.' : 'The Supabase profile could not be cleared.');
    }
  };

  if (savedProfile && completed) {
    const level = savedProfile.level;
    const config = RISK_LEVELS[level];
    const Icon = config.icon;
    const recommended = getRecommendedSymbols(level)
      .map((s) => getAsset(s))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));

    return (
      <div className="space-y-5">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
          {t('back')}
        </button>

        <div className="surface p-6 text-center">
          <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-ink-700 bg-ink-850`}>
            <Icon className={`h-7 w-7 ${config.color}`} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('yourRiskProfile')}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white">{t(level)}</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
            {lang === 'he' ? config.descriptionHe : config.description}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="flex h-2 w-32 overflow-hidden rounded-full bg-ink-800">
              <div
                className={`h-full ${level === 'conservative' ? 'bg-bull' : level === 'moderate' ? 'bg-gold-400' : 'bg-bear'}`}
                style={{ width: `${(savedProfile.score / 12) * 100}%` }}
              />
            </div>
            <span className="tabular text-xs font-semibold text-slate-400">
              {savedProfile.score}/12
            </span>
          </div>
          {saving && <p role="status" className="mt-3 text-xs text-slate-400">{lang === 'he' ? 'שומר פרופיל...' : 'Saving profile...'}</p>}
          {saveError && <p role="alert" className="mt-3 text-xs text-bear">{lang === 'he' ? 'הפרופיל נשמר במכשיר אך לא ב-Supabase: ' : 'Saved on this device, but not in Supabase: '}{saveError}</p>}
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-slate-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t('recommendedForYou')}
            </h2>
          </div>
          <div className="surface divide-y divide-ink-700/40 overflow-hidden">
            {recommended.map((a) => (
              <AssetRow key={a.symbol} asset={a} />
            ))}
          </div>
        </div>

        <button
          onClick={reset}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-ink-700 bg-ink-900 py-3 text-sm font-semibold text-slate-400 transition-all hover:border-ink-600 hover:text-white active:scale-[0.98]"
        >
          <RotateCcw className="h-4 w-4" />
          {t('retakeQuestionnaire')}
        </button>

        <DisclaimerBanner />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
      >
        <ChevronRight className="h-4 w-4 rotate-180" />
        {t('back')}
      </button>

      <div>
        <h1 className="text-xl font-bold text-white">{t('riskProfileQuestionnaire')}</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          {t('answerQuestions')}
        </p>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-ink-800">
        <div
          className="h-full rounded-full bg-bull transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="tabular text-[10px] font-medium uppercase tracking-wide text-slate-500">
        {t('questionOf')} {currentQ + 1} / {totalQuestions}
      </p>

      <div className="surface p-5">
        <h2 className="text-base font-semibold leading-snug text-white">
          {lang === 'he' ? HEBREW_QUESTIONS[currentQ].text : question.text}
        </h2>
        <div className="mt-4 space-y-2">
          {question.options.map((opt) => {
            const isSelected = answers[question.id] === opt.value;
            return (
              <button
                key={opt.label}
                onClick={() => handleAnswer(opt.value)}
                className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-start text-sm transition-all active:scale-[0.98] ${
                  isSelected
                    ? 'border-bull/40 bg-bull/10 text-white'
                    : 'border-ink-700 bg-ink-900 text-slate-300 hover:border-ink-600 hover:bg-ink-850'
                }`}
              >
                <span className="font-medium">
                  {lang === 'he' ? HEBREW_QUESTIONS[currentQ].options[question.options.indexOf(opt)] : opt.label}
                </span>
                {isSelected && <Check className="h-4 w-4 shrink-0 text-bull" />}
              </button>
            );
          })}
        </div>
      </div>

      {saveError && <p role="alert" className="text-xs text-bear">{saveError}</p>}

      <DisclaimerBanner />
    </div>
  );
}
