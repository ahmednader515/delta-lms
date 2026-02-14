"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/contexts/language-context";
import toast from "react-hot-toast";
import axios from "axios";

export function SessionMonitor() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useLanguage();
  const isLoggingOutRef = useRef(false);
  const toastShownRef = useRef(false);

  // Function to handle logout and redirect to homepage
  const handleLogout = useCallback(() => {
    if (isLoggingOutRef.current) return;
    
    isLoggingOutRef.current = true;
    console.log("🔄 Session invalidated - Redirecting to homepage...");
    
    // Show toast notification only once
    if (!toastShownRef.current) {
      toastShownRef.current = true;
      toast.error(t('auth.sessionExpired') || "Your session has expired. Please sign in again.");
    }
    
    // Redirect to homepage immediately
    router.push("/");
    
    // Sign out in the background
    signOut({ redirect: false });
  }, [t, router]);

  // Intercept API calls for 401 errors
  useEffect(() => {
    if (typeof window === "undefined" || status !== "authenticated" || !session) {
      return;
    }

    // Axios interceptor
    const axiosInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          const url = error.config?.url || "";
          if (url.includes("/api/") && !url.includes("/api/auth/session")) {
            handleLogout();
          }
        }
        return Promise.reject(error);
      }
    );

    // Fetch interceptor
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      try {
        const response = await originalFetch.apply(this, args);
        if (response.status === 401) {
          const url = args[0];
          const urlString = typeof url === "string" ? url : url.toString();
          if (urlString.includes("/api/") && !urlString.includes("/api/auth/session")) {
            handleLogout();
          }
        }
        return response;
      } catch (error) {
        throw error;
      }
    };

    // XMLHttpRequest interceptor
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method: string, url: string | URL, async?: boolean, username?: string | null, password?: string | null) {
      (this as any)._url = url.toString();
      return originalXHROpen.call(this, method, url, async ?? true, username ?? null, password ?? null);
    };

    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
      const xhr = this;
      const url = (xhr as any)._url || "";

      xhr.addEventListener("load", function () {
        if (xhr.status === 401 && url.includes("/api/") && !url.includes("/api/auth/session")) {
          handleLogout();
        }
      });

      return originalXHRSend.call(this, body ?? null);
    };

    // Cleanup
    return () => {
      axios.interceptors.response.eject(axiosInterceptor);
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXHROpen;
      XMLHttpRequest.prototype.send = originalXHRSend;
      isLoggingOutRef.current = false;
      toastShownRef.current = false;
    };
  }, [session, status, handleLogout]);

  // Monitor session status changes
  useEffect(() => {
    if (status === "authenticated" && session) {
      const isExpired = session.expires && new Date(session.expires) < new Date();
      const hasInvalidUser = !session.user?.id || session.user.id === "";
      
      if (isExpired || hasInvalidUser) {
        handleLogout();
        return;
      }
    }
    
    if (status === "unauthenticated" && session === null) {
      const currentPath = window.location.pathname;
      if (currentPath.startsWith("/dashboard")) {
        router.push("/");
      }
    }
  }, [status, session, router, handleLogout]);

  // Periodic session validation check (every 5 seconds)
  useEffect(() => {
    if (typeof window === "undefined" || status !== "authenticated" || !session) {
      return;
    }

    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          handleLogout();
          return;
        }

        const sessionData = await response.json();
        
        if (!sessionData?.user?.id || sessionData.user.id === "") {
          handleLogout();
          return;
        }

        if (sessionData.expires && new Date(sessionData.expires) < new Date()) {
          handleLogout();
          return;
        }
      } catch (error) {
        console.error("Session check error:", error);
        handleLogout();
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 5000);

    return () => clearInterval(interval);
  }, [status, session, handleLogout]);

  return null;
}

