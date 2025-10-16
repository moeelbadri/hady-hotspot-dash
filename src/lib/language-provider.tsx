'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Language = 'en' | 'es' | 'fr' | 'de' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Language metadata for future i18n implementation
export const supportedLanguages = {
  en: { name: 'English', nativeName: 'English', flag: '🇺🇸' },
  es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  ar: { name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
} as const;

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);


  // Load language from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const storedLanguage = localStorage.getItem('language') as Language;
    if (storedLanguage && Object.keys(supportedLanguages).includes(storedLanguage)) {
      setLanguage(storedLanguage);
    } else {
      // Try to detect browser language
      const browserLang = navigator.language.split('-')[0] as Language;
      if (Object.keys(supportedLanguages).includes(browserLang)) {
        setLanguage(browserLang);
      }
    }
  }, []);

  // Apply language to document
  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = language;
    }
  }, [language, mounted]);

  const handleSetLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage);
    if (mounted) {
      localStorage.setItem('language', newLanguage);
    }
  };

  // Always provide context, but with safe defaults when not mounted
  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    console.error('useLanguage must be used within a LanguageProvider');
    // Return default values instead of throwing to prevent crashes
    return {
      language: 'en' as Language,
      setLanguage: () => {}
    };
  }
  return context;
}
