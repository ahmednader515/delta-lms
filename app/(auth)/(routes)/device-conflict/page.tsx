"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/lib/contexts/language-context";
import { getDashboardUrlByRole } from "@/lib/utils";

function DeviceConflictContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLanguage();
  const phoneNumber = searchParams.get("phoneNumber") || "";
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    phoneNumber: phoneNumber,
    password: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleForceLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.phoneNumber.trim() || !formData.password.trim()) {
      toast.error(t("auth.phonePasswordRequired"));
      setIsLoading(false);
      return;
    }

    try {
      // First, call force-login to sign out all devices
      const forceLoginResponse = await fetch("/api/auth/force-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: formData.phoneNumber.trim(),
          password: formData.password,
        }),
      });

      if (!forceLoginResponse.ok) {
        const errorData = await forceLoginResponse.json().catch(() => ({}));
        toast.error(errorData.error || t("auth.forceLoginError"));
        setIsLoading(false);
        return;
      }

      // Then, sign in on the current device
      const result = await signIn("credentials", {
        phoneNumber: formData.phoneNumber.trim(),
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(t("auth.errors.invalidCredentials"));
        setIsLoading(false);
        return;
      }

      toast.success(t("auth.errors.signInSuccess"));
      
      // Redirect to dashboard
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (typeof window !== "undefined") {
        window.location.href = "/dashboard";
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("[FORCE_LOGIN_ERROR]", error);
      toast.error(t("auth.forceLoginError"));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t("auth.accountLoggedInAnotherDevice")}</DialogTitle>
            <DialogDescription>
              {t("auth.accountLoggedInAnotherDeviceDescription")}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleForceLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">{t("auth.phoneNumber")}</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                required
                disabled={isLoading}
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
                  required
                  disabled={isLoading}
                  className="rtl:pr-10 ltr:pl-10"
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

            <p className="text-sm text-muted-foreground">
              {t("auth.forceLoginWarning")}
            </p>

            <DialogFooter>
              <LoadingButton
                type="submit"
                loading={isLoading}
                loadingText={t("auth.signingOutAllDevices")}
                className="w-full bg-brand hover:bg-brand/90 text-white"
              >
                {t("auth.signOutAllDevicesAndSignIn")}
              </LoadingButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DeviceConflictPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    }>
      <DeviceConflictContent />
    </Suspense>
  );
}

