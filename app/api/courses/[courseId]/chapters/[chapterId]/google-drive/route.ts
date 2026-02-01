import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { extractGoogleDriveFileId, isValidGoogleDriveUrl } from "@/lib/google-drive";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Allow admins to add Google Drive videos to any chapter, or teachers to their own courses
        if (user?.role === "ADMIN") {
            // Admin can add Google Drive videos to any chapter, no need to check course ownership
        } else {
            const courseOwner = await db.course.findUnique({
                where: {
                    id: resolvedParams.courseId,
                    userId,
                }
            });

            if (!courseOwner) {
                return new NextResponse("Unauthorized", { status: 401 });
            }
        }

        const { googleDriveUrl } = await req.json();

        if (!googleDriveUrl) {
            return new NextResponse("Missing Google Drive URL", { status: 400 });
        }

        if (!isValidGoogleDriveUrl(googleDriveUrl)) {
            return new NextResponse("Invalid Google Drive URL", { status: 400 });
        }

        const googleDriveFileId = extractGoogleDriveFileId(googleDriveUrl);

        if (!googleDriveFileId) {
            return new NextResponse("Could not extract file ID from Google Drive URL", { status: 400 });
        }

        // Update chapter with Google Drive video
        await db.chapter.update({
            where: {
                id: resolvedParams.chapterId,
                courseId: resolvedParams.courseId,
            },
            data: {
                videoUrl: null, // Don't store full URL
                videoType: "GOOGLE_DRIVE",
                googleDriveFileId: googleDriveFileId, // Store only the file ID
                youtubeVideoId: null, // Clear any YouTube video ID
            }
        });

        return NextResponse.json({ 
            success: true,
            googleDriveFileId: googleDriveFileId
        });
    } catch (error) {
        console.log("[CHAPTER_GOOGLE_DRIVE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

