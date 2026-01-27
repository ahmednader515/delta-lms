"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useLanguage } from "@/lib/contexts/language-context";

interface RTLContextType {
  isRTL: boolean;
  setIsRTL: (isRTL: boolean) => void;
}

const RTLContext = createContext<RTLContextType>({
  isRTL: true,
  setIsRTL: () => {},
});

export const useRTL = () => useContext(RTLContext);

export const RTLProvider = ({ children }: { children: React.ReactNode }) => {
  const { isRTL: languageIsRTL } = useLanguage();
  const [isRTL, setIsRTL] = useState(languageIsRTL);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync with language context
  useEffect(() => {
    setIsRTL(languageIsRTL);
  }, [languageIsRTL]);

  useEffect(() => {
    if (!mounted) return;

    // Update document direction when isRTL changes
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = isRTL ? "ar" : "en";
  }, [isRTL, mounted]);

  return (
    <RTLContext.Provider value={{ isRTL, setIsRTL }}>
      {children}
    </RTLContext.Provider>
  );
}; 