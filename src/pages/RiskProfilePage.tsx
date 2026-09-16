import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, TrendingUp, Gauge, Target, ChevronRight, RotateCcw, Check } from 'lucide-react';
import { getAsset } from '@/services/marketService';
import { AssetRow } from '@/components/AssetRow';
import { useLanguage } from '@/context/LanguageContext';
import { DisclaimerBanner } from '@/components/Disclaimer';

type RiskLevel = 'conservative' | 'moderate' | 'aggressive';

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
  {
    id: 'allocation',
    text: 'What percentage of your savings are you willing to invest in stocks?',
    options: [
      { label: 'Under 20%', value: 0 },
      { label: '20% to 40%', value: 1 },
      { label: '40% to 70%', value: 2 },
      { label: 'Over 70%', value: 3 },
    ],
  },
];

const STORAGE_KEY = 'marketpulse_risk_profile';

const RISK_LEVELS: Record<RiskLevel, { label: string; min: number; max: number; description: string; icon: typeof Shield; color: string }> = {
  conservative: {
    label: 'Conservative',
    min: 0,
    max: 6,
    description: 'You prefer stability and capital protection. Your recommendations focus on large-cap, lower-volatility stocks with steady performance.',
    icon: Shield,
    color: 'text-bull',
  },
  moderate: {
    label: 'Moderate',
    min: 7,
    max: 10,
    description: 'You seek a balance between growth and safety. Your recommendations include a mix of established growth stocks and stable blue-chips.',
    icon: Gauge,
    color: 'text-gold-400',
  },
  aggressive: {
    label: 'Aggressive',
    min: 11,
    max: 15,
    description: 'You are comfortable with high volatility in exchange for maximum growth potential. Your recommendations focus on high-momentum, high-beta stocks.',
    icon: TrendingUp,
    color: 'text-bear',
  },
};

function scoreToLevel(score: number): RiskLevel {
  if (score <= 6) return 'conservative';
  if (score <= 10) return 'moderate';
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
  const { t } = useLanguage();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [savedProfile, setSavedProfile] = useState<{ score: number; level: RiskLevel } | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const totalQuestions = QUESTIONS.length;
  const question = QUESTIONS[currentQ];
  const progress = completed ? 100 : (currentQ / totalQuestions) * 100;

  const handleAnswer = (value: number) => {
    const newAnswers = { ...answers, [question.id]: value };
    setAnswers(newAnswers);

    if (currentQ < totalQuestions - 1) {
      setTimeout(() => setCurrentQ(currentQ + 1), 200);
    } else {
      const score = Object.values(newAnswers).reduce((a, b) => a + b, 0);
      const level = scoreToLevel(score);
      const profile = { score, level };
      setSavedProfile(profile);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      } catch {
        /* ignore */
      }
      setCompleted(true);
    }
  };

  const reset = () => {
    setAnswers({});
    setCurrentQ(0);
    setCompleted(false);
    setSavedProfile(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
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
            {config.description}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="flex h-2 w-32 overflow-hidden rounded-full bg-ink-800">
              <div
                className={`h-full ${level === 'conservative' ? 'bg-bull' : level === 'moderate' ? 'bg-gold-400' : 'bg-bear'}`}
                style={{ width: `${(savedProfile.score / 15) * 100}%` }}
              />
            </div>
            <span className="tabular text-xs font-semibold text-slate-400">
              {savedProfile.score}/15
            </span>
          </div>
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
        <h2 className="text-base font-semibold leading-snug text-white">{question.text}</h2>
        <div className="mt-4 space-y-2">
          {question.options.map((opt) => {
            const isSelected = answers[question.id] === opt.value;
            return (
              <button
                key={opt.label}
                onClick={() => handleAnswer(opt.value)}
                className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left text-sm transition-all active:scale-[0.98] ${
                  isSelected
                    ? 'border-bull/40 bg-bull/10 text-white'
                    : 'border-ink-700 bg-ink-900 text-slate-300 hover:border-ink-600 hover:bg-ink-850'
                }`}
              >
                <span className="font-medium">{opt.label}</span>
                {isSelected && <Check className="h-4 w-4 shrink-0 text-bull" />}
              </button>
            );
          })}
        </div>
      </div>

      <DisclaimerBanner />
    </div>
  );
}
