import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../locales/translations';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  // Theme state: 'light' | 'dark'
  const [theme, setThemeState] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('railpulse_theme');
      if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
    } catch (e) {
      console.warn('Unable to read theme from localStorage', e);
    }
    return 'light';
  });

  // Language state: 'en' | 'hi'
  const [language, setLanguageState] = useState(() => {
    try {
      const savedLang = localStorage.getItem('railpulse_language');
      if (savedLang === 'hi' || savedLang === 'en') return savedLang;
    } catch (e) {
      console.warn('Unable to read language from localStorage', e);
    }
    return 'en';
  });

  // Settings modal visibility state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sync theme with document class and localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    try {
      localStorage.setItem('railpulse_theme', theme);
    } catch (e) {
      console.warn('Unable to save theme to localStorage', e);
    }
  }, [theme]);

  // Sync language with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('railpulse_language', language);
    } catch (e) {
      console.warn('Unable to save language to localStorage', e);
    }
  }, [language]);

  const setTheme = (newTheme) => {
    setThemeState(newTheme === 'dark' ? 'dark' : 'light');
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setLanguage = (newLang) => {
    setLanguageState(newLang === 'hi' ? 'hi' : 'en');
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'en' ? 'hi' : 'en'));
  };

  const openSettings = () => setIsSettingsOpen(true);
  const closeSettings = () => setIsSettingsOpen(false);
  const toggleSettings = () => setIsSettingsOpen((prev) => !prev);

  // Translation helper function
  const t = (key, params = {}) => {
    const langDict = translations[language] || translations.en;
    let text = langDict[key] || translations.en[key] || key;

    // Substitute params e.g. {count: 5, delay: 12}
    if (typeof text === 'string' && params && typeof params === 'object') {
      Object.entries(params).forEach(([paramKey, paramVal]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
      });
    }

    return text;
  };

  return (
    <SettingsContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        language,
        setLanguage,
        toggleLanguage,
        isSettingsOpen,
        openSettings,
        closeSettings,
        toggleSettings,
        t,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
