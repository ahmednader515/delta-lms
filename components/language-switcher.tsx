"use client";

import { useState, useEffect } from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/contexts/language-context";

export const LanguageSwitcher = () => {
  const { language, setLanguage, t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleLanguage = () => {
    const newLanguage = language === "ar" ? "en" : "ar";
    setLanguage(newLanguage);
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Languages className="h-4 w-4" />
          <span className="hidden sm:inline">EN</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleLanguage}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        title={language === "ar" ? t("common.switchToEnglish") : t("common.arabic")}
      >
        <Languages className="h-4 w-4" />
        <span className="hidden sm:inline">
          {language === "ar" ? "EN" : "عربي"}
        </span>
      </Button>
    </div>
  );
};

