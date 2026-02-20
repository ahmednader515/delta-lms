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
    
    // Sign out from NextAuth
    signOut({ redirect: false });
    
    // Use full page reload to ensure the old device fully refreshes
    // This ensures the old device detects the logout when logged out from another device
    if (typeof window !== "undefined") {
      window.location.href = "/";
    } else {
      router.push("/");
    }
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
      // Only check expiration if expires is set and is a valid date
      const isExpired = session.expires && 
                       session.expires !== "1970-01-01T00:00:00.000Z" && 
                       new Date(session.expires) < new Date();
      const hasInvalidUser = !session.user?.id || session.user.id === "";
      
      // Only trigger logout if session is actually expired (not the placeholder expired date)
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
  // Add a delay before first check to avoid false positives right after login
  useEffect(() => {
    if (typeof window === "undefined" || status !== "authenticated" || !session) {
      return;
    }

    // Wait 2 seconds before first check to allow session to fully initialize
    const initialDelay = setTimeout(() => {
      const checkSession = async () => {
        try {
          const response = await fetch("/api/auth/session", {
            method: "GET",
            cache: "no-store",
          });

          if (!response.ok) {
            // Only logout if it's a 401 (unauthorized), not other errors
            if (response.status === 401) {
              handleLogout();
            }
            return;
          }

          const sessionData = await response.json();
          
          // Check if session has valid user data
          if (!sessionData?.user?.id || sessionData.user.id === "") {
            handleLogout();
            return;
          }

          // Only check expiration if expires is set and is not the placeholder expired date
          if (sessionData.expires && 
              sessionData.expires !== "1970-01-01T00:00:00.000Z" && 
              new Date(sessionData.expires) < new Date()) {
            handleLogout();
            return;
          }
        } catch (error) {
          console.error("Session check error:", error);
          // Don't logout on network errors, only on actual session errors
          // The API interceptors will handle 401 errors
        }
      };

      checkSession();
      const interval = setInterval(checkSession, 5000);

      return () => clearInterval(interval);
    }, 2000);

    return () => clearTimeout(initialDelay);
  }, [status, session, handleLogout]);

  return null;
}

