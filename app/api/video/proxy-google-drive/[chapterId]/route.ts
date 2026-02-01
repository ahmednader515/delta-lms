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

    // Only allow Google Drive videos through this proxy
    if (chapter.videoType !== "GOOGLE_DRIVE" || !chapter.googleDriveFileId) {
      return new NextResponse("Invalid video type", { status: 400 });
    }

    // Validate file ID before obfuscation
    if (!chapter.googleDriveFileId || chapter.googleDriveFileId.trim().length === 0) {
      return new NextResponse("Invalid file ID", { status: 400 });
    }

    // Obfuscate the Google Drive file ID using base64 encoding with a simple XOR
    // This makes it harder to extract from the HTML source without corrupting the data
    const fileIdToObfuscate = chapter.googleDriveFileId.trim();
    // Use a simple XOR cipher with a key to obfuscate
    const key = 0x42; // Simple key
    const obfuscated = Buffer.from(
      fileIdToObfuscate.split('').map((c) => 
        String.fromCharCode(c.charCodeAt(0) ^ key)
      ).join('')
    ).toString('base64');
    
    // Return HTML page with Google Drive iframe
    // The file ID is obfuscated and dynamically decoded, never in the HTML source
    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Video Player</title>
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
            position: relative;
        }
        #google-drive-iframe {
            width: 100%;
            height: 100%;
            border: 0;
            pointer-events: auto;
        }
        /* Overlay to block pop-out button */
        #overlay-top {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 80px;
            background: transparent;
            z-index: 9999;
            pointer-events: auto;
            cursor: default;
        }
        * {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
        }
        body {
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            -khtml-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
        }
    </style>
</head>
<body>
    <div id="player-container">
        <iframe id="google-drive-iframe"></iframe>
        <div id="overlay-top"></div>
    </div>
    <script>
        (function() {
            // Dev tools blocking - keyboard shortcuts and right-click only
            // Disable right-click
            document.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                return false;
            }, true);
            
            // Block keyboard shortcuts
            document.addEventListener('keydown', function(e) {
                if (e.key === 'F12' || 
                    (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) ||
                    (e.ctrlKey && ['u', 'U', 's', 'S', 'p', 'P'].includes(e.key)) ||
                    (e.metaKey && e.altKey && ['i', 'I'].includes(e.key))) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }, true);
            
            // Decode the obfuscated file ID
            const obf = '${obfuscated}';
            let fileId = '';
            try {
                const decoded = atob(obf);
                // Decode with XOR (same key as encoding)
                const key = 0x42;
                fileId = decoded.split('').map((c) => 
                    String.fromCharCode(c.charCodeAt(0) ^ key)
                ).join('');
                
                // Validate file ID format (Google Drive file IDs are typically 33 characters, but can vary)
                if (!fileId || fileId.length < 20) {
                    throw new Error('Invalid file ID length: ' + (fileId ? fileId.length : 0));
                }
            } catch (e) {
                console.error('Failed to decode file ID:', e);
                document.body.innerHTML = '<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: white; text-align: center; padding: 20px;"><h2>Error Loading Video</h2><p>Could not decode the video file ID.</p></div>';
                return;
            }
            
            // Set iframe src dynamically (not in HTML source)
            // This way the Google Drive URL is never in the static HTML
            // Note: File must be shared with "Anyone with the link" permission in Google Drive
            const iframe = document.getElementById('google-drive-iframe');
            if (iframe) {
                // Build the Google Drive preview URL in parts to avoid it appearing as a complete string
                const baseUrl = 'https://drive.google.com/file/d/';
                const previewPath = '/preview';
                const driveUrl = baseUrl + fileId + previewPath;
                
                // Set attributes first
                iframe.setAttribute('allow', 'autoplay; fullscreen');
                iframe.setAttribute('title', 'Google Drive Video Player');
                
                // Override getAttribute and src property BEFORE setting src
                // This ensures the URL is hidden from dev tools
                try {
                    const originalGetAttribute = iframe.getAttribute.bind(iframe);
                    
                    // Override getAttribute to hide src
                    Object.defineProperty(iframe, 'getAttribute', {
                        value: function(name) {
                            if (name === 'src') {
                                return ''; // Return empty when trying to get src attribute
                            }
                            return originalGetAttribute(name);
                        },
                        writable: false,
                        configurable: true
                    });
                    
                    // Override src property getter
                    try {
                        Object.defineProperty(iframe, 'src', {
                            get: function() {
                                return ''; // Return empty when accessing src property
                            },
                            set: function(value) {
                                // Store internally and set via native method
                                const nativeSet = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src')?.set;
                                if (nativeSet) {
                                    nativeSet.call(this, value);
                                } else {
                                    // Fallback: use setAttribute but it will be hidden by getAttribute override
                                    this.setAttribute('src', value);
                                }
                            },
                            configurable: true
                        });
                    } catch (e) {
                        // If we can't override src property, continue with getAttribute override
                    }
                } catch (e) {
                    // If we can't override, continue normally
                }
                
                // Set src using the overridden setter (which will hide it from getters)
                setTimeout(function() {
                    iframe.src = driveUrl;
                }, 0);
            }
            
            // Block clicks on overlay
            const overlay = document.getElementById('overlay-top');
            if (overlay) {
                overlay.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }, true);
                overlay.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }, true);
                overlay.addEventListener('mousedown', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }, true);
            }
            
            // Send events to parent window via postMessage
            // Note: Google Drive iframe doesn't expose player events easily
            // We'll need to use postMessage if Google Drive supports it
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
    console.error("[VIDEO_PROXY_GOOGLE_DRIVE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

