"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "te" | "hi";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (en: string, te: string, hi?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const savedLang = localStorage.getItem("app-language") as Language;
    const validLangs: Language[] = ["en", "te", "hi"];
    if (savedLang && validLangs.includes(savedLang)) {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app-language", lang);
  };

  const t = (en: string, te: string, hi?: string) => {
    if (language === "te") return te;
    if (language === "hi") return hi || en;
    return en;
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
