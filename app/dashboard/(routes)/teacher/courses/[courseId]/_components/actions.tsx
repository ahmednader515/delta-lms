"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Info } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/lib/contexts/language-context";

interface ActionsProps {
    disabled: boolean;
    courseId: string;
    isPublished: boolean;
}

export const Actions = ({
    disabled,
    courseId,
    isPublished,
}: ActionsProps) => {
    const { t } = useLanguage();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const onClick = async () => {
        try {
            setIsLoading(true);

            if (isPublished) {
                await axios.patch(`/api/courses/${courseId}/unpublish`);
                toast.success(t("teacher.courseEdit.forms.unpublishSuccess"));
            } else {
                await axios.patch(`/api/courses/${courseId}/publish`);
                toast.success(t("teacher.courseEdit.forms.publishSuccess"));
            }

            router.refresh();
        } catch {
            toast.error(t("teacher.courseEdit.forms.publishError"));
        } finally {
            setIsLoading(false);
        }
    }

    const publishButton = (
        <Button
            onClick={onClick}
            disabled={disabled || isLoading}
            className="bg-brand hover:bg-brand/90 text-white"
            size="sm"
        >
            {isPublished ? (
                <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    {t("teacher.courseEdit.forms.unpublish")}
                </>
            ) : (
                <>
                    <Eye className="h-4 w-4 mr-2" />
                    {t("teacher.courseEdit.forms.publish")}
                </>
            )}
        </Button>
    );

    return (
        <div className="flex items-center gap-x-2">
            {disabled && !isPublished ? (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="relative">
                                {publishButton}
                                <Info className="h-4 w-4 absolute -top-1 -right-1 text-orange-500" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                            <div className="text-sm">
                                <p className="font-semibold mb-2">{t("teacher.courseEdit.forms.cannotPublish")}</p>
                                <ul className="space-y-1 text-xs">
                                    <li>• {t("teacher.courseEdit.forms.requirements.title")}</li>
                                    <li>• {t("teacher.courseEdit.forms.requirements.description")}</li>
                                    <li>• {t("teacher.courseEdit.forms.requirements.image")}</li>
                                    <li>• {t("teacher.courseEdit.forms.requirements.price")}</li>
                                    <li>• {t("teacher.courseEdit.forms.requirements.chapter")}</li>
                                </ul>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ) : (
                publishButton
            )}
        </div>
    )
} 