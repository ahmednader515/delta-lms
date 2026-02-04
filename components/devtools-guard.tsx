"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DevToolsBlocker } from "@/components/dev-tools-blocker";
import { useDevToolsDetect } from "@/hooks/use-dev-tools-detect";

const LAST_PATH_KEY = "devtools:last-path";

export function DevToolsGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/devtools-warning")) return;
    try {
      const fullPath =
        window.location.pathname +
        window.location.search +
        window.location.hash;
      sessionStorage.setItem(LAST_PATH_KEY, fullPath);
    } catch {
      // Ignore storage errors (e.g. disabled storage).
    }
  }, [pathname]);

  const handleDetect = useCallback(() => {
    if (pathname?.startsWith("/devtools-warning")) return;
    try {
      const fullPath =
        window.location.pathname +
        window.location.search +
        window.location.hash;
      sessionStorage.setItem(LAST_PATH_KEY, fullPath);
    } catch {
      // Ignore storage errors (e.g. disabled storage).
    }
    router.push("/devtools-warning");
  }, [pathname, router]);

  useDevToolsDetect(handleDetect, pathname ?? "");

  return <DevToolsBlocker />;
}

