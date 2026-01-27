"use client";

import { IconBadge } from "@/components/icon-badge";
import { LayoutDashboard } from "lucide-react";
import { TitleForm } from "./title-form";
import { DescriptionForm } from "./description-form";
import { ImageForm } from "./image-form";
import { PriceForm } from "./price-form";
import { GradeForm } from "./grade-form";
import { CourseContentForm } from "./course-content-form";
import { Banner } from "@/components/banner";
import { Actions } from "./actions";
import { useLanguage } from "@/lib/contexts/language-context";

interface Course {
    id: string;
    title: string | null;
    description: string | null;
    imageUrl: string | null;
    price: number | null;
    grade: number | null;
    isPublished: boolean;
    chapters: Array<{ isPublished: boolean }>;
}

interface CourseEditContentProps {
    course: Course;
    courseId: string;
    completionText: string;
    isComplete: boolean;
    completionStatus: {
        title: boolean;
        description: boolean;
        imageUrl: boolean;
        price: boolean;
        publishedChapters: boolean;
    };
}

export const CourseEditContent = ({
    course,
    courseId,
    completionText,
    isComplete,
    completionStatus
}: CourseEditContentProps) => {
    const { t } = useLanguage();

    return (
        <>
            {!course.isPublished && (
                <Banner
                    variant="warning"
                    label={t("teacher.courseEdit.unpublishedBanner")}
                />
            )}
            <div className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-y-2">
                        <h1 className="text-2xl font-medium">
                            {t("teacher.courseEdit.setupTitle")}
                        </h1>
                        <span className="text-sm text-slate-700">
                            {t("teacher.courseEdit.completeFields", { completion: completionText })}
                        </span>
                        {!isComplete && (
                            <div className="text-xs text-muted-foreground mt-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className={`flex items-center gap-1 ${completionStatus.title ? 'text-brand' : 'text-red-600'}`}>
                                        <span>{completionStatus.title ? '✓' : '✗'}</span>
                                        <span>{t("teacher.courseEdit.fields.title")}</span>
                                    </div>
                                    <div className={`flex items-center gap-1 ${completionStatus.description ? 'text-brand' : 'text-red-600'}`}>
                                        <span>{completionStatus.description ? '✓' : '✗'}</span>
                                        <span>{t("teacher.courseEdit.fields.description")}</span>
                                    </div>
                                    <div className={`flex items-center gap-1 ${completionStatus.imageUrl ? 'text-brand' : 'text-red-600'}`}>
                                        <span>{completionStatus.imageUrl ? '✓' : '✗'}</span>
                                        <span>{t("teacher.courseEdit.fields.image")}</span>
                                    </div>
                                    <div className={`flex items-center gap-1 ${completionStatus.price ? 'text-brand' : 'text-red-600'}`}>
                                        <span>{completionStatus.price ? '✓' : '✗'}</span>
                                        <span>{t("teacher.courseEdit.fields.price")}</span>
                                    </div>
                                    <div className={`flex items-center gap-1 ${completionStatus.publishedChapters ? 'text-brand' : 'text-red-600'}`}>
                                        <span>{completionStatus.publishedChapters ? '✓' : '✗'}</span>
                                        <span>{t("teacher.courseEdit.fields.publishedChapter")}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <Actions
                        disabled={!isComplete}
                        courseId={courseId}
                        isPublished={course.isPublished}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
                    <div>
                        <div className="flex items-center gap-x-2">
                            <IconBadge icon={LayoutDashboard} />
                            <h2 className="text-xl">
                                {t("teacher.courseEdit.customizeCourse")}
                            </h2>
                        </div>
                        <TitleForm
                            initialData={course}
                            courseId={course.id}
                        />
                        <DescriptionForm
                            initialData={course}
                            courseId={course.id}
                        />
                        <PriceForm
                            initialData={course}
                            courseId={course.id}
                        />
                        <GradeForm
                            initialData={course}
                            courseId={course.id}
                        />
                    </div>
                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center gap-x-2">
                                <IconBadge icon={LayoutDashboard} />
                                <h2 className="text-xl">
                                    {t("teacher.courseEdit.resourcesChapters")}
                                </h2>
                            </div>
                            <CourseContentForm
                                initialData={course}
                                courseId={course.id}
                            />
                        </div>
                        <div>
                            <div className="flex items-center gap-x-2">
                                <IconBadge icon={LayoutDashboard} />
                                <h2 className="text-xl">
                                    {t("teacher.courseEdit.courseSettings")}
                                </h2>
                            </div>
                            <ImageForm
                                initialData={course}
                                courseId={course.id}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

