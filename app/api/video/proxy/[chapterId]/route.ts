import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  try {
    const { userId } = await auth();
    const { chapterId } = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get chapter with course info
    const chapter = await db.chapter.findUnique({
      where: {
        id: chapterId,
      },
      include: {
        course: {
          select: {
            id: true,
            userId: true,
            price: true,
            isPublished: true,
          },
        },
      },
    });

    if (!chapter) {
      return new NextResponse("Chapter not found", { status: 404 });
    }

    // Check if user has access to the course
    const hasPurchase = await db.purchase.findFirst({
      where: {
        userId,
        courseId: chapter.course.id,
        status: "ACTIVE",
      },
    });

    const isFree = chapter.isFree;
    const isCourseOwner = chapter.course.userId === userId;
    const isFreeCourse = chapter.course.price === 0;
    const isPublished = chapter.course.isPublished;

    // Allow access if:
    // - Chapter is free, OR
    // - User has active purchase, OR
    // - User is course owner, OR
    // - Course is free, OR
    // - Course is published (for preview)
    if (!isFree && !hasPurchase && !isCourseOwner && !isFreeCourse && !isPublished) {
      return new NextResponse("Access denied", { status: 403 });
    }

    // Only allow YouTube videos through this proxy
    if (chapter.videoType !== "YOUTUBE" || !chapter.youtubeVideoId) {
      return new NextResponse("Invalid video type", { status: 400 });
    }

    // Return HTML page with Plyr initialized for YouTube video
    // The YouTube video ID is hidden and only used server-side
    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Video Player</title>
    <link rel="stylesheet" href="https://cdn.plyr.io/3.7.8/plyr.css" />
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body, html {
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: #000;
        }
        #player-container {
            width: 100%;
            height: 100%;
        }
        .plyr--youtube .plyr__video-wrapper iframe {
            pointer-events: none;
            user-select: none;
        }
    </style>
</head>
<body>
    <div id="player-container">
        <div 
            id="plyr-player"
            data-plyr-provider="youtube"
            data-plyr-embed-id="${chapter.youtubeVideoId}"
        ></div>
    </div>
    <script src="https://cdn.plyr.io/3.7.8/plyr.polyfilled.js"></script>
    <script>
        (function() {
            const container = document.getElementById('plyr-player');
            if (!container) return;
            
            const player = new Plyr(container, {
                controls: [
                    'play-large',
                    'play',
                    'progress',
                    'current-time',
                    'duration',
                    'mute',
                    'volume',
                    'captions',
                    'settings',
                    'pip',
                    'airplay',
                    'fullscreen'
                ],
                settings: ['speed', 'quality', 'loop'],
                quality: {
                    default: 'auto',
                    options: ['auto', 2160, 1440, 1080, 720, 480, 360, 240],
                    forced: true
                },
                speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
                youtube: { 
                    rel: 0, 
                    modestbranding: 1,
                    iv_load_policy: 3,
                    controls: 0,
                    disablekb: 0,
                    enablejsapi: 1
                },
                ratio: '16:9'
            });
            
            // Disable YouTube overlay interactions
            function disableYoutubeOverlay() {
                const iframe = player.elements?.container?.querySelector('iframe');
                if (iframe) {
                    iframe.style.pointerEvents = 'none';
                    iframe.setAttribute('tabindex', '-1');
                }
            }
            
            
            // Wait for YouTube player to be ready
            player.on('ready', () => {
                disableYoutubeOverlay();
            });
            
            // Also call immediately in case ready already fired
            disableYoutubeOverlay();
            
            // Send events to parent window via postMessage
            player.on('ended', () => {
                if (window.parent) {
                    window.parent.postMessage({ type: 'video-ended' }, '*');
                }
            });
            
            player.on('timeupdate', () => {
                if (window.parent && player.currentTime !== null) {
                    window.parent.postMessage({ 
                        type: 'timeupdate', 
                        currentTime: player.currentTime 
                    }, '*');
                }
            });
            
            // Cleanup on unload
            window.addEventListener('beforeunload', () => {
                if (player && typeof player.destroy === 'function') {
                    player.destroy();
                }
            });
        })();
    </script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Frame-Options": "SAMEORIGIN",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[VIDEO_PROXY]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
