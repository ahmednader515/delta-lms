"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Chapter, Course, Quiz } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { CourseContentList } from "./course-content-list";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/contexts/language-context";

interface CourseContentFormProps {
    initialData: Course & { chapters: Chapter[]; quizzes: Quiz[] };
    courseId: string;
}

export const CourseContentForm = ({
    initialData,
    courseId
}: CourseContentFormProps) => {
    const { t } = useLanguage();
    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [title, setTitle] = useState("");

    const router = useRouter();
    const pathname = usePathname();
    const isAdminRoute = pathname?.includes("/admin/");

    const onCreate = async () => {
        try {
            setIsUpdating(true);
            await axios.post(`/api/courses/${courseId}/chapters`, { title });
            toast.success(t("teacher.courseEdit.content.toasts.chapterCreated"));
            setTitle("");
            setIsCreating(false);
            router.refresh();
        } catch {
            toast.error(t("teacher.courseEdit.content.toasts.error"));
        } finally {
            setIsUpdating(false);
        }
    }

    const onDelete = async (id: string, type: "chapter" | "quiz") => {
        try {
            setIsUpdating(true);
            if (type === "chapter") {
                const response = await axios.delete(`/api/courses/${courseId}/chapters/${id}`);
                toast.success(t("teacher.courseEdit.content.toasts.chapterDeleted"));
            } else {
                await axios.delete(`/api/teacher/quizzes/${id}`);
                toast.success(t("teacher.courseEdit.content.toasts.quizDeleted"));
            }
            router.refresh();
        } catch (error: any) {
            console.error("[DELETE_ERROR]", error);
            const errorMessage = error?.response?.data || error?.message || t("teacher.courseEdit.content.toasts.error");
            toast.error(errorMessage);
        } finally {
            setIsUpdating(false);
        }
    }

    const onReorder = async (updateData: { id: string; position: number; type: "chapter" | "quiz" }[]) => {
        try {
            setIsUpdating(true);
            await axios.put(`/api/courses/${courseId}/reorder`, {
                list: updateData
            });
            toast.success(t("teacher.courseEdit.content.toasts.reordered"));
            router.refresh();
        } catch {
            toast.error(t("teacher.courseEdit.content.toasts.error"));
        } finally {
            setIsUpdating(false);
        }
    }

    const onEdit = (id: string, type: "chapter" | "quiz") => {
        if (type === "chapter") {
            const basePath = isAdminRoute ? "/dashboard/admin" : "/dashboard/teacher";
            router.push(`${basePath}/courses/${courseId}/chapters/${id}`);
        } else {
            const basePath = isAdminRoute ? "/dashboard/admin" : "/dashboard/teacher";
            router.push(`${basePath}/quizzes/${id}/edit`);
        }
    }

    // Combine chapters and quizzes for display
    const courseItems = [
        ...initialData.chapters.map(chapter => ({
            id: chapter.id,
            title: chapter.title,
            position: chapter.position,
            isPublished: chapter.isPublished,
            type: "chapter" as const,
            isFree: chapter.isFree
        })),
        ...initialData.quizzes.map(quiz => ({
            id: quiz.id,
            title: quiz.title,
            position: quiz.position,
            isPublished: quiz.isPublished,
            type: "quiz" as const
        }))
    ].sort((a, b) => a.position - b.position);

    return (
        <div className="relative mt-6 border bg-card rounded-md p-4">
            {isUpdating && (
                <div className="absolute h-full w-full bg-background/50 top-0 right-0 rounded-m flex items-center justify-center">
                    <div className="animate-spin h-6 w-6 border-4 border-primary rounded-full border-t-transparent" />
                </div>
            )}
            <div className="font-medium flex items-center justify-between">
                {t("teacher.courseEdit.content.title")}
                <div className="flex gap-2">
                    <Button onClick={() => {
                        const basePath = isAdminRoute ? "/dashboard/admin" : "/dashboard/teacher";
                        router.push(`${basePath}/quizzes/create?courseId=${courseId}`);
                    }} variant="ghost">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        {t("teacher.courseEdit.content.addQuiz")}
                    </Button>
                    <Button onClick={() => setIsCreating((current) => !current)} variant="ghost">
                        {isCreating ? (
                            <>{t("teacher.courseEdit.content.cancel")}</>
                        ) : (
                            <>
                                <PlusCircle className="h-4 w-4 mr-2" />
                                {t("teacher.courseEdit.content.addChapter")}
                            </>
                        )}
                    </Button>
                </div>
            </div>
            {isCreating && (
                <div className="mt-4 space-y-4">
                    <Input
                        disabled={isUpdating}
                        placeholder={t("teacher.courseEdit.content.chapterPlaceholder")}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                    <Button
                        onClick={onCreate}
                        disabled={!title || isUpdating}
                        type="button"
                    >
                        {t("teacher.courseEdit.content.create")}
                    </Button>
                </div>
            )}
            {!isCreating && (
                <div className={cn(
                    "text-sm mt-2",
                    !courseItems.length && "text-muted-foreground italic"
                )}>
                    {!courseItems.length && t("teacher.courseEdit.content.noContent")}
                    <CourseContentList
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onReorder={onReorder}
                        items={courseItems}
                    />
                </div>
            )}
            {!isCreating && courseItems.length > 0 && (
                <p className="text-xs text-muted-foreground mt-4">
                    {t("teacher.courseEdit.content.dragDropHint")}
                </p>
            )}
        </div>
    );
}; 