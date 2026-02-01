"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Video, Pencil, Link, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import { PlyrVideoPlayer } from "@/components/plyr-video-player";
import { useLanguage } from "@/lib/contexts/language-context";

interface VideoFormProps {
    initialData: {
        videoUrl: string | null;
        videoType: string | null;
        youtubeVideoId: string | null;
        googleDriveFileId: string | null;
    };
    courseId: string;
    chapterId: string;
}

export const VideoForm = ({
    initialData,
    courseId,
    chapterId
}: VideoFormProps) => {
    const { t } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [googleDriveUrl, setGoogleDriveUrl] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const onSubmitGoogleDrive = async () => {
        if (!googleDriveUrl.trim()) {
            toast.error("الرجاء إدخال رابط Google Drive");
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await fetch(`/api/courses/${courseId}/chapters/${chapterId}/google-drive`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ googleDriveUrl }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || 'Failed to add Google Drive video');
            }

            toast.success("تم إضافة فيديو Google Drive بنجاح");
            setIsEditing(false);
            setGoogleDriveUrl("");
            router.refresh();
        } catch (error) {
            console.error("[CHAPTER_GOOGLE_DRIVE]", error);
            toast.error(error instanceof Error ? error.message : t("teacher.chapterEdit.uploadError"));
        } finally {
            setIsSubmitting(false);
        }
    }

    if (!isMounted) {
        return null;
    }

    return (
        <div className="mt-6 border bg-card rounded-md p-4">
            <div className="font-medium flex items-center justify-between">
                {t("teacher.chapterEdit.chapterVideo")}
                <Button onClick={() => setIsEditing(!isEditing)} variant="ghost">
                    {isEditing ? (
                        <>{t("common.cancel")}</>
                    ) : (
                        <>
                            <Pencil className="h-4 w-4 mr-2" />
                            {t("teacher.chapterEdit.editVideo")}
                        </>
                    )}
                </Button>
            </div>
            
            {!isEditing && (
                <div className="relative aspect-video mt-2">
                    {initialData.videoType === "GOOGLE_DRIVE" ? (
                        <PlyrVideoPlayer
                            videoType="GOOGLE_DRIVE"
                            chapterId={chapterId}
                            className="w-full h-full"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full bg-muted rounded-md">
                            <Video className="h-8 w-8 text-muted-foreground" />
                        </div>
                    )}
                </div>
            )}
            
            {isEditing && (
                <div className="mt-4">
                    <div className="space-y-4">
                        <div className="text-sm text-muted-foreground">
                            الصق رابط Google Drive للفيديو
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="google-drive-url">رابط Google Drive</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="google-drive-url"
                                    placeholder="https://drive.google.com/file/d/FILE_ID/view"
                                    value={googleDriveUrl}
                                    onChange={(e) => setGoogleDriveUrl(e.target.value)}
                                    className="flex-1"
                                />
                                <Button 
                                    onClick={onSubmitGoogleDrive}
                                    disabled={isSubmitting || !googleDriveUrl.trim()}
                                    className="flex items-center gap-2"
                                >
                                    <Link className="h-4 w-4" />
                                    {t("teacher.chapterEdit.add")}
                                </Button>
                            </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            الروابط المدعومة:
                            <br />
                            • https://drive.google.com/file/d/FILE_ID/view
                            <br />
                            • https://drive.google.com/file/d/FILE_ID/edit
                            <br />
                            • https://drive.google.com/open?id=FILE_ID
                            <br />
                            <br />
                            ملاحظة: تأكد من أن الملف قابل للمشاركة (Anyone with the link)
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
} 