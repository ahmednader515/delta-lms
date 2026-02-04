"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Video, Pencil, Link } from "lucide-react";
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
    const [youtubeUrl, setYoutubeUrl] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const onSubmitYouTube = async () => {
        if (!youtubeUrl.trim()) {
            toast.error("الرجاء إدخال رابط YouTube");
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await fetch(`/api/courses/${courseId}/chapters/${chapterId}/youtube`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ youtubeUrl }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || 'Failed to add YouTube video');
            }

            toast.success("تم إضافة فيديو YouTube بنجاح");
            setIsEditing(false);
            setYoutubeUrl("");
            router.refresh();
        } catch (error) {
            console.error("[CHAPTER_YOUTUBE]", error);
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
                    {initialData.videoType === "YOUTUBE" && initialData.youtubeVideoId ? (
                        <PlyrVideoPlayer
                            videoType="YOUTUBE"
                            youtubeVideoId={initialData.youtubeVideoId}
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
                            الصق رابط YouTube للفيديو
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="youtube-url">رابط YouTube</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="youtube-url"
                                    placeholder="https://www.youtube.com/watch?v=VIDEO_ID"
                                    value={youtubeUrl}
                                    onChange={(e) => setYoutubeUrl(e.target.value)}
                                    className="flex-1"
                                />
                                <Button 
                                    onClick={onSubmitYouTube}
                                    disabled={isSubmitting || !youtubeUrl.trim()}
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
                            • https://www.youtube.com/watch?v=VIDEO_ID
                            <br />
                            • https://youtu.be/VIDEO_ID
                            <br />
                            • https://www.youtube.com/embed/VIDEO_ID
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
} 