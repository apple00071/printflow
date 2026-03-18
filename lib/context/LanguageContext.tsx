"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "te";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (en: string, te: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  console.log("LanguageProvider Rendering, language:", language);

  useEffect(() => {
    console.log("LanguageProvider Mounted");
    const savedLang = localStorage.getItem("app-language") as Language;
    if (savedLang) {
      setLanguageState(savedLang);
    }
    if (savedLang) {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app-language", lang);
  };

  const t = (en: string, te: string) => {
    return language === "te" ? te : en;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  console.log("useLanguage called, context exists:", !!context);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
