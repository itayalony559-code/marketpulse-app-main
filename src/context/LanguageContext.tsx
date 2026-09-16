import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { translations, type Language, type TranslationKey, type Translations } from '@/i18n/translations';

const STORAGE_KEY = 'marketpulse_language';

type LanguageContextType = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
};

const RTL_LANGUAGES: Language[] = ['he', 'ar'];

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function readStored(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (stored && translations[stored]) return stored;
  } catch {
    /* ignore */
  }
  return 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(readStored);
  const isRTL = RTL_LANGUAGES.includes(lang);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang, isRTL]);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      const dict: Translations = translations[lang] ?? translations.en;
      return dict[key] ?? translations.en[key] ?? key;
    },
    [lang],
  );

  const value = useMemo<LanguageContextType>(
    () => ({ lang, setLang, t, isRTL }),
    [lang, setLang, t, isRTL],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
