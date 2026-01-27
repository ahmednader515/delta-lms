"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, ChevronLeft } from "lucide-react";
import Image from "next/image";
import { getDashboardUrlByRole } from "@/lib/utils";
import { useLanguage } from "@/lib/contexts/language-context";

export default function SignInPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    phoneNumber: "",
    password: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    // Client-side validation
    if (!formData.phoneNumber.trim() || !formData.password.trim()) {
      toast.error(t("auth.errors.missingCredentials"));
      setIsLoading(false);
      return;
    }

    try {
      // First, validate credentials with our custom API to get specific error messages
      const validationResponse = await fetch("/api/auth/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: formData.phoneNumber.trim(),
          password: formData.password,
        }),
      });

      const validationData = await validationResponse.json();

      if (!validationResponse.ok || validationData.error) {
        // Handle specific error messages
        const errorMessages: Record<string, string> = {
          "MISSING_CREDENTIALS": t("auth.errors.missingCredentials"),
          "INVALID_CREDENTIALS": t("auth.errors.invalidCredentials"),
          "NO_PASSWORD_SET": t("auth.errors.noPasswordSet"),
          "SERVER_ERROR": t("auth.errors.serverError"),
        };

        const errorMessage = errorMessages[validationData.error] || t("auth.errors.invalidCredentials");
        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }

      // If validation passes, proceed with NextAuth sign-in
      const result = await signIn("credentials", {
        phoneNumber: formData.phoneNumber.trim(),
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        // Fallback error handling for NextAuth errors
        const errorMessages: Record<string, string> = {
          "CredentialsSignin": t("auth.errors.invalidCredentials"),
          "Configuration": t("auth.errors.serverError"),
          "AccessDenied": t("auth.errors.accessDenied"),
          "Verification": t("auth.errors.verificationFailed"),
        };

        const errorMessage = errorMessages[result.error] || t("auth.errors.invalidCredentials");
        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }

      toast.success(t("auth.errors.signInSuccess"));
      
      // Get user data to determine role and redirect accordingly
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const sessionData = await response.json();
      const userRole = sessionData?.user?.role || "USER";
      const dashboardUrl = getDashboardUrlByRole(userRole);

      // Force a full reload to ensure fresh session on the dashboard
      const target = `${dashboardUrl}?t=${Date.now()}`;
      if (typeof window !== "undefined") {
        window.location.replace(target);
      } else {
        router.replace(target);
      }
    } catch (error) {
      // Handle network errors or other unexpected errors
      if (error instanceof Error) {
        if (error.message.includes("Network") || error.message.includes("fetch")) {
          toast.error(t("auth.errors.networkError"));
        } else if (error.message.includes("timeout")) {
          toast.error(t("auth.errors.timeout"));
        } else {
          toast.error(t("auth.errors.invalidCredentials"));
        }
      } else {
        toast.error(t("auth.errors.invalidCredentials"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background overflow-y-auto">
      <div className="absolute top-4 left-4 z-10">
        <Button variant="ghost" size="lg" asChild>
          <Link href="/">
            <ChevronLeft className="h-10 w-10" />
          </Link>
        </Button>
      </div>
      
      {/* Right Side - Image */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-brand/10 to-brand/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-brand/5"></div>
        <div className="relative z-10 flex items-center justify-center w-full">
          <div className="text-center space-y-6 p-8">
            <div className="relative w-64 h-[268px] mx-auto rounded-full border-4 border-brand/20 shadow-2xl overflow-hidden p-0">
              <Image
                src="/logo.png"
                alt="Teacher"
                fill
                className="object-cover rounded-full"
                unoptimized
                style={{ objectFit: 'cover' }}
              />
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-brand">
                {t("auth.welcomeBack")}
              </h3>
              <p className="text-lg text-muted-foreground max-w-md">
                {t("auth.welcomeMessage")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Left Side - Form */}
      <div className="flex-1 flex items-start justify-center p-8">
        <div className="w-full max-w-md space-y-6 py-8 mt-8">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              {t("auth.signInTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("auth.signInSubtitle")}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">{t("auth.phoneNumber")}</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                autoComplete="tel"
                required
                disabled={isLoading}
                className="h-10"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder="+20XXXXXXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                  className="h-10 rtl:pr-10 ltr:pl-10"
                  value={formData.password}
                  onChange={handleInputChange}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute rtl:right-0 ltr:left-0 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <LoadingButton
              type="submit"
              loading={isLoading}
              loadingText={t("auth.signInLoading")}
              className="w-full h-10 bg-brand hover:bg-brand/90 text-white"
            >
              {t("auth.signInButton")}
            </LoadingButton>
          </form>
          <div className="text-center text-sm">
            <span className="text-muted-foreground">{t("auth.dontHaveAccount")} </span>
            <Link 
              href="/sign-up" 
              className="text-primary hover:underline transition-colors"
            >
              {t("auth.createNewAccount")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 