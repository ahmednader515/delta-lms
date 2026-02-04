"use client";

import { useEffect, useRef } from "react";

export function useDevToolsDetect(onDetect: () => void, resetKey?: string) {
  const hasDetectedRef = useRef(false);
  const lastOpenSeenAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isMobileLike =
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia?.("(pointer: coarse)").matches;
      if (isMobileLike) {
        return;
      }
    }

    if (resetKey !== undefined) {
      hasDetectedRef.current = false;
      lastOpenSeenAtRef.current = null;
    }

    const threshold = 160;

    const notifyOnce = () => {
      if (!hasDetectedRef.current) {
        hasDetectedRef.current = true;
        lastOpenSeenAtRef.current = Date.now();
        onDetect();
      }
    };

    const detectSizeDiff = () => {
      if (typeof window === "undefined") return;

      const devtoolsOpen =
        window.outerWidth - window.innerWidth > threshold ||
        window.outerHeight - window.innerHeight > threshold;

      if (devtoolsOpen) {
        notifyOnce();
        return;
      }

      if (hasDetectedRef.current && lastOpenSeenAtRef.current) {
        if (Date.now() - lastOpenSeenAtRef.current > 2000) {
          hasDetectedRef.current = false;
          lastOpenSeenAtRef.current = null;
        }
      }
    };

    const sizeInterval = setInterval(detectSizeDiff, 500);
    let worker: Worker | null = null;
    let workerUrl: string | null = null;
    let lastWorkerTick = Date.now();

    if (typeof Worker !== "undefined") {
      const workerCode = `
        const tick = () => {
          const start = Date.now();
          debugger;
          const delta = Date.now() - start;
          postMessage({ type: "tick", delta });
          setTimeout(tick, 1000);
        };
        tick();
      `;
      const blob = new Blob([workerCode], { type: "application/javascript" });
      workerUrl = URL.createObjectURL(blob);
      worker = new Worker(workerUrl);
      worker.onmessage = (event) => {
        const delta = event?.data?.delta;
        lastWorkerTick = Date.now();
        if (typeof delta === "number" && delta > 100) {
          notifyOnce();
        }
      };
    }

    const workerWatchdog = setInterval(() => {
      if (worker && Date.now() - lastWorkerTick > 1500) {
        notifyOnce();
      }
    }, 500);

    return () => {
      clearInterval(sizeInterval);
      clearInterval(workerWatchdog);
      if (worker) worker.terminate();
      if (workerUrl) URL.revokeObjectURL(workerUrl);
    };
  }, [onDetect, resetKey]);
}

