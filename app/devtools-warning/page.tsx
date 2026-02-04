"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const LAST_PATH_KEY = "devtools:last-path";

export default function DevToolsWarningPage() {
  const router = useRouter();

  const lastPath = useMemo(() => {
    try {
      return sessionStorage.getItem(LAST_PATH_KEY) || "/";
    } catch {
      return "/";
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-2xl font-bold">تم اكتشاف أدوات المطور</h1>
        <p className="text-muted-foreground">
          من فضلك اغلق أدوات المطور ثم اضغط للرجوع للصفحة السابقة.
        </p>
        <div className="flex items-center justify-center">
          <Button onClick={() => router.push(lastPath)}>
            العودة للصفحة السابقة
          </Button>
        </div>
      </div>
    </div>
  );
}

