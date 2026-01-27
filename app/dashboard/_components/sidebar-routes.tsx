"use client";

import { BarChart, Compass, Layout, List, Wallet, Shield, Users, Eye, TrendingUp, BookOpen, FileText, Award, PlusSquare, Key, Ticket } from "lucide-react";
import { SidebarItem } from "./sidebar-item";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/contexts/language-context";

export const SidebarRoutes = ({ closeOnClick = false }: { closeOnClick?: boolean }) => {
    const pathName = usePathname();
    const { t } = useLanguage();

    const guestRoutes = [
        {
            icon: Layout,
            label: t("sidebar.dashboard"),
            href: "/dashboard",
        },
        {
            icon: Compass,
            label: t("sidebar.courses"),
            href: "/dashboard/search",
        },
        {
            icon: Wallet,
            label: t("sidebar.balance"),
            href: "/dashboard/balance",
        },
    ];

    const teacherRoutes = [
        {
            icon: List,
            label: t("sidebar.teacher.courses"),
            href: "/dashboard/teacher/courses",
        },
        {
            icon: FileText,
            label: t("sidebar.teacher.quizzes"),
            href: "/dashboard/teacher/quizzes",
        },
        {
            icon: Award,
            label: t("sidebar.teacher.grades"),
            href: "/dashboard/teacher/grades",
        },
        {
            icon: BarChart,
            label: t("sidebar.teacher.analytics"),
            href: "/dashboard/teacher/analytics",
        },
        {
            icon: Users,
            label: t("sidebar.teacher.manageStudents"),
            href: "/dashboard/teacher/users",
        },
        {
            icon: Wallet,
            label: t("sidebar.teacher.manageBalances"),
            href: "/dashboard/teacher/balances",
        },
        {
            icon: BookOpen,
            label: t("sidebar.teacher.addDeleteCourses"),
            href: "/dashboard/teacher/add-courses",
        },
        {
            icon: Key,
            label: t("sidebar.teacher.passwords"),
            href: "/dashboard/teacher/passwords",
        },
        {
            icon: Ticket,
            label: t("sidebar.teacher.codes"),
            href: "/dashboard/teacher/codes",
        },
        {
            icon: Shield,
            label: t("sidebar.teacher.createStudentAccount"),
            href: "/dashboard/teacher/create-account",
        },
    ];

    const adminRoutes = [
        {
            icon: Users,
            label: t("sidebar.admin.manageUsers"),
            href: "/dashboard/admin/users",
        },
        {
            icon: List,
            label: t("sidebar.admin.courses"),
            href: "/dashboard/admin/courses",
        },
        {
            icon: FileText,
            label: t("sidebar.admin.quizzes"),
            href: "/dashboard/admin/quizzes",
        },
        {
            icon: Shield,
            label: t("sidebar.admin.createStudentAccount"),
            href: "/dashboard/admin/create-account",
        },
        {
            icon: Eye,
            label: t("sidebar.admin.passwords"),
            href: "/dashboard/admin/passwords",
        },
        {
            icon: Wallet,
            label: t("sidebar.admin.manageBalances"),
            href: "/dashboard/admin/balances",
        },
        {
            icon: TrendingUp,
            label: t("sidebar.admin.studentProgress"),
            href: "/dashboard/admin/progress",
        },
        {
            icon: BookOpen,
            label: t("sidebar.admin.addDeleteCourses"),
            href: "/dashboard/admin/add-courses",
        },
        {
            icon: Ticket,
            label: t("sidebar.admin.codes"),
            href: "/dashboard/admin/codes",
        },
    ];

    const isTeacherPage = pathName?.includes("/dashboard/teacher");
    const isAdminPage = pathName?.includes("/dashboard/admin");
    const routes = isAdminPage ? adminRoutes : isTeacherPage ? teacherRoutes : guestRoutes;

    return (
        <div className="flex flex-col w-full pt-0">
            {routes.map((route) => (
                <SidebarItem
                  key={route.href}
                  icon={route.icon}
                  label={route.label}
                  href={route.href}
                  closeOnClick={closeOnClick}
                />
            ))}
        </div>
    );
}