"use client";

import { R2FileUpload } from "@/components/r2-file-upload";

interface FileUploadProps {
    onChange: (res?: { url: string; name: string }) => void;
    endpoint?: string; // Kept for backward compatibility, but not used
    folder?: string; // Optional folder for R2 organization
    accept?: string; // Optional file type filter
    maxSize?: number; // Optional max file size in bytes
}

export const FileUpload = ({
    onChange,
    endpoint,
    folder,
    accept,
    maxSize,
}: FileUploadProps) => {
    // Map endpoint to folder if not provided
    const getFolder = () => {
        if (folder) return folder;
        if (endpoint === "courseImage") return "images";
        if (endpoint === "courseAttachment") return "documents";
        if (endpoint === "chapterVideo") return "videos";
        return undefined;
    };

    // Map endpoint to accept types if not provided
    const getAccept = () => {
        if (accept) return accept;
        if (endpoint === "courseImage") return "image/*";
        if (endpoint === "courseAttachment") return "image/*,application/pdf,video/*,audio/*,text/*";
        if (endpoint === "chapterVideo") return "video/*";
        return undefined;
    };

    // Map endpoint to max size if not provided
    const getMaxSize = () => {
        if (maxSize) return maxSize;
        if (endpoint === "courseImage") return 4 * 1024 * 1024; // 4MB
        if (endpoint === "courseAttachment") return 512 * 1024 * 1024; // 512MB
        if (endpoint === "chapterVideo") return 512 * 1024 * 1024 * 1024; // 512GB
        return undefined;
    };

    return (
        <R2FileUpload
            onChange={onChange}
            folder={getFolder()}
            accept={getAccept()}
            maxSize={getMaxSize()}
        />
    );
}