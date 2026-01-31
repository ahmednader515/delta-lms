"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface DevToolsBlockerProps {
  redirectUrl?: string;
  message?: string;
}

export const DevToolsBlocker = ({ 
  redirectUrl = "/dashboard/search",
  message = "Developer tools are not allowed on this page."
}: DevToolsBlockerProps) => {
  const router = useRouter();
  const [devToolsOpen, setDevToolsOpen] = useState(false);

  useEffect(() => {
    // Don't block in development mode
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    let devToolsDetected = false;

    // Method 1: Detect via window size difference (docked dev tools)
    const checkWindowSize = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      
      if (widthThreshold || heightThreshold) {
        return true;
      }
      return false;
    };

    // Method 2: Detect via debugger timing
    const checkDebuggerTiming = () => {
      const start = performance.now();
      // This will pause if dev tools are open with debugger
      // eslint-disable-next-line no-debugger
      debugger;
      const end = performance.now();
      // If it took more than 100ms, dev tools are likely open
      return (end - start) > 100;
    };

    // Method 3: Detect via console.log with getter (fires when inspected)
    const detectViaConsole = () => {
      const element = new Image();
      let opened = false;
      
      Object.defineProperty(element, 'id', {
        get: function() {
          opened = true;
          return 'devtools-detector';
        }
      });
      
      console.log(element);
      console.clear();
      
      return opened;
    };

    // Method 4: Detect via toString (fires when object is inspected in console)
    const detectViaToString = () => {
      let opened = false;
      const obj = {
        toString: function() {
          opened = true;
          return '';
        }
      };
      console.log('%c', obj);
      console.clear();
      return opened;
    };

    // Combined detection
    const detectDevTools = () => {
      // Check window size first (most reliable for docked)
      if (checkWindowSize()) {
        return true;
      }
      
      // Check via console methods
      if (detectViaConsole() || detectViaToString()) {
        return true;
      }
      
      return false;
    };

    // Action when dev tools detected
    const onDevToolsDetected = () => {
      if (!devToolsDetected) {
        devToolsDetected = true;
        setDevToolsOpen(true);
        
        // Clear any sensitive data from memory
        try {
          // Clear console
          console.clear();
          // Show alert
          alert(message);
          // Redirect
          router.push(redirectUrl);
        } catch (e) {
          // Fallback: just redirect
          window.location.href = redirectUrl;
        }
      }
    };

    // Check periodically
    const interval = setInterval(() => {
      if (detectDevTools()) {
        onDevToolsDetected();
      }
    }, 1000);

    // Also check on resize (when dev tools dock/undock)
    const handleResize = () => {
      if (checkWindowSize()) {
        onDevToolsDetected();
      }
    };
    window.addEventListener('resize', handleResize);

    // Block keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (Chrome dev tools)
      if (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+U (view source)
      if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Cmd+Option+I (Mac dev tools)
      if (e.metaKey && e.altKey && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);

    // Block right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };
    document.addEventListener('contextmenu', handleContextMenu, true);

    // Cleanup
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [router, redirectUrl, message]);

  // If dev tools are detected, show a blocking overlay
  if (devToolsOpen) {
    return (
      <div className="fixed inset-0 bg-black z-[9999] flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>{message}</p>
          <p className="mt-4">Redirecting...</p>
        </div>
      </div>
    );
  }

  return null;
};

