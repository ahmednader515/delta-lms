"use client";

import { ChapterForm } from "./chapter-form";
import { VideoForm } from "./video-form";
import Link from "next/link";
import { ArrowLeft, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/icon-badge";
import { useLanguage } from "@/lib/contexts/language-context";

interface Chapter {
    id: string;
    title: string | null;
    description: string | null;
    videoUrl: string | null;
}

interface ChapterEditContentProps {
    chapter: Chapter;
    courseId: string;
    chapterId: string;
    completionText: string;
    userRole?: string | null;
}

export const ChapterEditContent = ({
    chapter,
    courseId,
    chapterId,
    completionText,
    userRole
}: ChapterEditContentProps) => {
    const { t } = useLanguage();

    return (
        <div className="p-6">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-y-2">
                    <Link
                        href={
                            userRole === "ADMIN"
                                ? `/dashboard/admin/courses/${courseId}`
                                : `/dashboard/teacher/courses/${courseId}`
                        }
                    >
                        <Button variant="ghost" className="mb-4">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {t("teacher.chapterEdit.backToCourse")}
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-medium">
                        {t("teacher.chapterEdit.setupTitle")}
                    </h1>
                    <span className="text-sm text-muted-foreground">
                        {t("teacher.chapterEdit.completeFields", { completion: completionText })}
                    </span>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
                <div>
                    <ChapterForm
                        initialData={chapter}
                        courseId={courseId}
                        chapterId={chapterId}
                    />
                </div>
                <div className="space-y-6">
                    <div>
                        <div className="flex items-center gap-x-2">
                            <IconBadge icon={Video} />
                            <h2 className="text-xl">
                                {t("teacher.chapterEdit.addVideo")}
                            </h2>
                        </div>
                        <VideoForm
                            initialData={chapter}
                            courseId={courseId}
                            chapterId={chapterId}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

