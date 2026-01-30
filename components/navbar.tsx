"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useSession, signOut } from "next-auth/react";
import { ScrollProgress } from "@/components/scroll-progress";
import { LogOut } from "lucide-react";
import { useLanguage } from "@/lib/contexts/language-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import { handleLogout } from "@/lib/utils";

export const Navbar = () => {
  const { data: session } = useSession();
  const { t } = useLanguage();

  const handleLogoutClick = async () => {
    await handleLogout();
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-24">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="Logo"
              width={100}
              height={100}
              className="ml-2 w-20 h-20 md:w-[100px] md:h-[100px]"
              unoptimized
            />
          </Link>

          {/* Right side items */}
          <div className="flex items-center gap-2 md:gap-4">
            <LanguageSwitcher />
            {!session ? (
              <>
                <Button className="bg-brand hover:bg-brand/90 text-white text-xs md:text-sm px-2 md:px-4 h-8 md:h-10" asChild>
                  <Link href="/sign-up">{t("navigation.signUp")}</Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="border-brand text-brand hover:bg-brand/10 text-xs md:text-sm px-2 md:px-4 h-8 md:h-10"
                >
                  <Link href="/sign-in">{t("navigation.signIn")}</Link>
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/dashboard">{t("navigation.dashboard")}</Link>
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handleLogoutClick}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors duration-200 ease-in-out"
                >
                  <LogOut className="h-4 w-4 rtl:ml-2 ltr:mr-2"/>
                  {t("navigation.logout")}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
      <ScrollProgress />
    </div>
  );
}; 