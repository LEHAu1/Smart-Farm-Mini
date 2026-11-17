import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations, type Language, type TranslationKey } from '../locales/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey | string, defaultText?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('smartfarm_language') as Language | null;
    if (saved === 'vi' || saved === 'en') return saved;
    // Default to Vietnamese as primary
    return 'vi';
  });

  useEffect(() => {
    localStorage.setItem('smartfarm_language', language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'vi' ? 'en' : 'vi'));
  };

  const t = (key: TranslationKey | string, defaultText?: string): string => {
    const langDict = translations[language] as Record<string, string>;
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    // Fallback to Vietnamese if available
    const viDict = translations.vi as Record<string, string>;
    if (viDict && viDict[key]) {
      return viDict[key];
    }
    return defaultText ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: 'vi' as Language,
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: (key: TranslationKey | string, defaultText?: string) => {
        const viDict = translations.vi as Record<string, string>;
        if (viDict && viDict[key as TranslationKey]) {
          return viDict[key as TranslationKey];
        }
        return defaultText ?? key;
      },
    };
  }
  return context;
}
