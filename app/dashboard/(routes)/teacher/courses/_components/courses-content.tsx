"use client";

import { CoursesTable } from "./courses-table";
import { useColumns } from "./columns";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/lib/contexts/language-context";

interface Course {
    id: string;
    title: string;
    price: number;
    isPublished: boolean;
    createdAt: Date;
    publishedChaptersCount: number;
    publishedQuizzesCount: number;
}

interface CoursesContentProps {
    courses: Course[];
    hasUnpublishedCourses: boolean;
}

export const CoursesContent = ({ courses, hasUnpublishedCourses }: CoursesContentProps) => {
    const { t } = useLanguage();
    const columns = useColumns();

    return (
        <div className="p-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{t("teacher.courses.title")}</h1>
                <Link href="/dashboard/teacher/courses/create">
                    <Button className="bg-brand hover:bg-brand/90 text-white">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        {t("teacher.courses.createNew")}
                    </Button>
                </Link>
            </div>

            {hasUnpublishedCourses && (
                <Alert className="mt-6 border-orange-200 bg-orange-50">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                        <div className="mb-2">
                            <strong>{t("teacher.courses.unpublishedWarning")}</strong>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>{t("teacher.courses.requirements.title")}</li>
                            <li>{t("teacher.courses.requirements.description")}</li>
                            <li>{t("teacher.courses.requirements.image")}</li>
                            <li>{t("teacher.courses.requirements.chapter")}</li>
                            <li>{t("teacher.courses.requirements.publish")}</li>
                        </ul>
                    </AlertDescription>
                </Alert>
            )}

            <div className="mt-6">
                <CoursesTable columns={columns} data={courses} />
            </div>
        </div>
    );
};

