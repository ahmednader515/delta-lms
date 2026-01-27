"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/contexts/language-context";

export default function AdminRedirect() {
    const { t } = useLanguage();
    const router = useRouter();

    useEffect(() => {
        router.replace("/dashboard/admin/users");
    }, [router]);

    return (
        <div className="h-full flex items-center justify-center">
            <div className="text-center">
                <div className="text-lg">{t("admin.redirecting")}</div>
            </div>
        </div>
    );
} 