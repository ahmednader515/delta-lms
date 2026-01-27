"use client";

import { useState, useEffect, useRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { Button } from "@/components/ui/button";
import { Loader2, Shield } from "lucide-react";
import { useLanguage } from "@/lib/contexts/language-context";
import axios from "axios";

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

interface RecaptchaGateProps {
  children: React.ReactNode;
}

export function RecaptchaGate({ children }: RecaptchaGateProps) {
  const { t } = useLanguage();
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  useEffect(() => {
    // Check if user is already verified in this session
    const verified = sessionStorage.getItem("recaptcha_verified");
    if (verified === "true") {
      setIsVerified(true);
    }
    setIsLoading(false);
  }, []);

  const handleRecaptchaChange = async (token: string | null) => {
    if (!token) {
      return;
    }

    setIsVerifying(true);

    try {
      // Verify the token on the server
      const response = await axios.post("/api/auth/verify-recaptcha-gate", {
        recaptchaToken: token,
      });

      if (response.data.success) {
        // Store verification in sessionStorage
        sessionStorage.setItem("recaptcha_verified", "true");
        setIsVerified(true);
      } else {
        // Verification failed, reset reCaptcha
        recaptchaRef.current?.reset();
        setIsVerifying(false);
      }
    } catch (error) {
      console.error("reCAPTCHA verification error:", error);
      // Reset reCaptcha on error
      recaptchaRef.current?.reset();
      setIsVerifying(false);
    }
  };

  // Show loading state while checking sessionStorage
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-[9999]">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  // Show reCaptcha gate if not verified
  if (!isVerified) {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-[9999]">
        <div className="bg-card border rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-brand" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{t("recaptchaGate.title")}</h2>
            <p className="text-muted-foreground">
              {t("recaptchaGate.description")}
            </p>
          </div>

          <div className="flex justify-center mb-6">
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={RECAPTCHA_SITE_KEY}
              onChange={handleRecaptchaChange}
            />
          </div>

          {isVerifying && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t("recaptchaGate.verifying")}</span>
            </div>
          )}

          <div className="text-center mt-6">
            <p className="text-xs text-muted-foreground">
              {t("recaptchaGate.helpText")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render children if verified
  return <>{children}</>;
}

