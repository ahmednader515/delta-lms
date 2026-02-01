"use client";

import { useEffect, useRef, useState } from "react";
import "plyr/dist/plyr.css";
import "./google-drive-player.css";

interface PlyrVideoPlayerProps {
  videoUrl?: string;
  youtubeVideoId?: string;
  googleDriveFileId?: string; // Google Drive file ID (for non-secure use cases)
  videoType?: "YOUTUBE" | "GOOGLE_DRIVE";
  className?: string;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  chapterId?: string; // Required for secure video fetching
}

export const PlyrVideoPlayer = ({
  videoUrl,
  youtubeVideoId,
  googleDriveFileId: propGoogleDriveFileId,
  videoType = "GOOGLE_DRIVE",
  className,
  onEnded,
  onTimeUpdate,
  chapterId
}: PlyrVideoPlayerProps) => {
  const youtubeEmbedRef = useRef<HTMLDivElement>(null);
  const googleDriveIframeRef = useRef<HTMLIFrameElement>(null);
  const proxyIframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<any>(null);
  const [googleDriveFileId, setGoogleDriveFileId] = useState<string | null>(null);
  const [googleDriveSrcDoc, setGoogleDriveSrcDoc] = useState<string | null>(null);
  // Initialize loading state to true if we need to fetch the URL/ID
  const [isLoadingUrl, setIsLoadingUrl] = useState(
    videoType === "GOOGLE_DRIVE" && chapterId ? true : false
  );
  const disableYoutubeOverlay = () => {
    if (videoType !== "YOUTUBE") return;
    const iframe = playerRef.current?.elements?.container?.querySelector?.(
      "iframe"
    ) as HTMLIFrameElement | null;
    if (iframe) {
      iframe.style.pointerEvents = "none";
      iframe.setAttribute("tabindex", "-1");
    }
  };

  // Fetch Google Drive file ID from server
  useEffect(() => {
    if (videoType === "GOOGLE_DRIVE" && chapterId && !googleDriveFileId) {
      setIsLoadingUrl(true);
      
      fetch(`/api/video/get-google-drive/${chapterId}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      })
      .then(async response => {
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[VIDEO_PLAYER] Failed to fetch Google Drive file ID:', response.status, errorText);
          if (response.status === 404) {
            console.warn('[VIDEO_PLAYER] Chapter does not have a Google Drive video');
            return null;
          }
          throw new Error(`Failed to fetch Google Drive file ID: ${response.status} ${errorText}`);
        }
        return response.json();
      })
      .then(data => {
        if (data && data.f) {
          setGoogleDriveFileId(data.f);
          
          // Generate srcDoc HTML with video URL embedded as a variable
          const fileId = data.f;
          const baseUrl = 'https://drive.google.com/file/d/';
          const previewPath = '/preview';
          const driveUrl = baseUrl + fileId + previewPath;
          
          // Encode the URL using base64 to hide it in the HTML source
          const encodedUrl = btoa(driveUrl);
          
          // Create HTML with iframe src set directly but encoded, then immediately override
          const srcDoc = `<!DOCTYPE html>
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
        <iframe id="google-drive-iframe" allow="autoplay; fullscreen" title="Google Drive Video Player"></iframe>
        <div id="overlay-top"></div>
    </div>
    <script>
        (function() {
            var iframe = document.getElementById('google-drive-iframe');
            if (iframe) {
                // Decode the URL
                var encodedUrl = '${encodedUrl}';
                var videoUrl = atob(encodedUrl);
                
                // Apply property overrides BEFORE setting src
                // This way the src property is set but hidden from DevTools
                try {
                    var originalGetAttribute = iframe.getAttribute.bind(iframe);
                    var originalGetAttributeNS = iframe.getAttributeNS ? iframe.getAttributeNS.bind(iframe) : null;
                    var originalHasAttribute = iframe.hasAttribute ? iframe.hasAttribute.bind(iframe) : null;
                    
                    // Override getAttribute to hide src
                    Object.defineProperty(iframe, 'getAttribute', {
                        value: function(name) {
                            if (name === 'src') return '';
                            return originalGetAttribute(name);
                        },
                        writable: false,
                        configurable: true
                    });
                    
                    // Override getAttributeNS
                    if (originalGetAttributeNS) {
                        Object.defineProperty(iframe, 'getAttributeNS', {
                            value: function(ns, name) {
                                if (name === 'src') return '';
                                return originalGetAttributeNS(ns, name);
                            },
                            writable: false,
                            configurable: true
                        });
                    }
                    
                    // Override hasAttribute
                    if (originalHasAttribute) {
                        Object.defineProperty(iframe, 'hasAttribute', {
                            value: function(name) {
                                if (name === 'src') return false;
                                return originalHasAttribute(name);
                            },
                            writable: false,
                            configurable: true
                        });
                    }
                    
                    // Override src property - hide getter but allow setter
                    var descriptor = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
                    if (descriptor && descriptor.set) {
                        var originalSetter = descriptor.set;
                        Object.defineProperty(iframe, 'src', {
                            get: function() { return ''; },
                            set: function(value) { 
                                originalSetter.call(this, value);
                            },
                            configurable: true,
                            enumerable: false
                        });
                    }
                    
                    // Override attributes collection
                    try {
                        var attrs = iframe.attributes;
                        if (attrs && attrs.getNamedItem) {
                            var origGetNamedItem = attrs.getNamedItem.bind(attrs);
                            Object.defineProperty(attrs, 'getNamedItem', {
                                value: function(name) {
                                    if (name === 'src') return null;
                                    return origGetNamedItem(name);
                                },
                                writable: false,
                                configurable: true
                            });
                        }
                    } catch (e) {}
                } catch (e) {
                    // Continue if overrides fail
                }
                
                // Now set src as a PROPERTY (not attribute) - this won't show in DevTools
                // The property overrides will hide it from inspection
                iframe.src = videoUrl;
                
                // Use MutationObserver to continuously remove src attribute if it appears
                // But keep the property set so video keeps playing
                try {
                    var observer = new MutationObserver(function(mutations) {
                        mutations.forEach(function(mutation) {
                            if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                                // Don't remove it, just let the overrides hide it
                                // Removing would break the video
                            }
                        });
                    });
                    
                    observer.observe(iframe, {
                        attributes: true,
                        attributeFilter: ['src']
                    });
                } catch (e) {
                    // Ignore if MutationObserver fails
                }
            }
            
            // Dev tools blocking
            document.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                return false;
            }, true);
            
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
            
            // Block clicks on overlay
            var overlay = document.getElementById('overlay-top');
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
        })();
    </script>
</body>
</html>`;
          
          setGoogleDriveSrcDoc(srcDoc);
        } else {
          console.warn('[VIDEO_PLAYER] No Google Drive file ID in response:', data);
        }
      })
      .catch(error => {
        console.error('[VIDEO_PLAYER] Error fetching Google Drive file ID:', error);
      })
      .finally(() => {
        setIsLoadingUrl(false);
      });
    }
  }, [videoType, chapterId, googleDriveFileId]);

  // Set Google Drive iframe src dynamically to avoid it appearing in HTML source
  // Only for non-proxy cases (when chapterId is not provided)
  useEffect(() => {
    if (videoType === "GOOGLE_DRIVE" && !chapterId && googleDriveIframeRef.current && propGoogleDriveFileId) {
      // Set src dynamically via JavaScript, not in HTML
      googleDriveIframeRef.current.src = `https://drive.google.com/file/d/${propGoogleDriveFileId}/preview`;
      
      // Try to override getAttribute to hide src from dev tools
      try {
        const iframe = googleDriveIframeRef.current;
        const originalGetAttribute = iframe.getAttribute.bind(iframe);
        Object.defineProperty(iframe, 'getAttribute', {
          value: function(name: string) {
            if (name === 'src') {
              return ''; // Return empty when trying to get src attribute
            }
            return originalGetAttribute(name);
          },
          writable: false,
          configurable: true
        });
      } catch (e) {
        // If we can't override, that's okay
      }
    }
  }, [videoType, chapterId, propGoogleDriveFileId]);

  // Initialize Plyr on mount/update and destroy on unmount
  // Skip Plyr initialization for YouTube and Google Drive videos when using proxy (chapterId provided)
  useEffect(() => {
    // Don't initialize Plyr if we're using the proxy for YouTube videos
    if (videoType === "YOUTUBE" && chapterId) {
      return;
    }
    
    // Don't initialize Plyr for Google Drive videos (they use iframe)
    if (videoType === "GOOGLE_DRIVE") {
      return;
    }
    
    let isCancelled = false;

    async function setupPlayer() {
      const targetEl = youtubeEmbedRef.current;
      if (!targetEl) return;

      // Dynamically import Plyr to be SSR-safe
      const plyrModule: any = await import("plyr");
      const Plyr: any = plyrModule.default ?? plyrModule;

      if (isCancelled) return;

      // Destroy any previous instance
      if (playerRef.current && typeof playerRef.current.destroy === "function") {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      const player = new Plyr(targetEl, {
        controls: [
          "play-large",
          "play",
          "progress",
          "current-time",
          "duration",
          "mute",
          "volume",
          "captions",
          "settings",
          "pip",
          "airplay",
          "fullscreen"
        ],
        settings: ["speed", "quality", "loop"],
        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
        youtube: { rel: 0, modestbranding: 1 },
        ratio: "16:9"
      });

      playerRef.current = player;

      if (onEnded) player.on("ended", onEnded);
      if (onTimeUpdate)
        player.on("timeupdate", () => onTimeUpdate(player.currentTime || 0));
      player.on("ready", disableYoutubeOverlay);
      disableYoutubeOverlay();
    }

    setupPlayer();

    return () => {
      isCancelled = true;
      if (playerRef.current && typeof playerRef.current.destroy === "function") {
        playerRef.current.destroy();
      }
      playerRef.current = null;
    };
  }, [youtubeVideoId, videoType, chapterId, onEnded, onTimeUpdate]);

  // For YouTube videos, use proxy iframe to hide the URL
  // This hook must be called before any conditional returns
  useEffect(() => {
    if (videoType === "YOUTUBE" && chapterId && proxyIframeRef.current) {
      const handleMessage = (event: MessageEvent) => {
        // Verify message is from our proxy (same origin)
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === "video-ended" && onEnded) {
          onEnded();
        } else if (event.data.type === "timeupdate" && onTimeUpdate) {
          onTimeUpdate(event.data.currentTime);
        }
      };

      window.addEventListener("message", handleMessage);
      return () => {
        window.removeEventListener("message", handleMessage);
      };
    }
  }, [videoType, chapterId, onEnded, onTimeUpdate]);

  // For YouTube videos, always use proxy if chapterId is provided to hide the URL
  // This check must come before hasVideo to avoid early return
  if (videoType === "YOUTUBE" && chapterId) {
    return (
      <div className={`aspect-video ${className || ""}`}>
        <iframe
          ref={proxyIframeRef}
          src={`/api/video/proxy/${chapterId}`}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation allow-top-navigation"
          title="Video Player"
        />
      </div>
    );
  }

  // For Google Drive videos, use srcDoc to hide the URL from parent page Elements tab
  if (videoType === "GOOGLE_DRIVE" && chapterId) {
    if (isLoadingUrl) {
      return (
        <div className={`aspect-video bg-muted rounded-lg flex items-center justify-center ${className || ""}`}>
          <div className="text-muted-foreground">جاري تحميل الفيديو...</div>
        </div>
      );
    }

    if (!googleDriveSrcDoc) {
      return (
        <div className={`aspect-video bg-muted rounded-lg flex items-center justify-center ${className || ""}`}>
          <div className="text-muted-foreground">لا يوجد فيديو</div>
        </div>
      );
    }

    return (
      <div className={`aspect-video ${className || ""}`}>
        <iframe
          ref={googleDriveIframeRef}
          srcDoc={googleDriveSrcDoc}
          className="w-full h-full border-0"
          allow="autoplay; fullscreen"
          allowFullScreen
          title="Google Drive Video Player"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    );
  }

  // For Google Drive videos without chapterId (backward compatibility)
  if (videoType === "GOOGLE_DRIVE" && !chapterId) {
    const fileId = propGoogleDriveFileId;
    if (!fileId) {
      return (
        <div className={`aspect-video bg-muted rounded-lg flex items-center justify-center ${className || ""}`}>
          <div className="text-muted-foreground">لا يوجد فيديو</div>
        </div>
      );
    }

    return (
      <div className={`aspect-video google-drive-container ${className || ""}`} style={{ position: 'relative' }}>
        {/* Iframe without src attribute - will be set dynamically via JavaScript */}
        <iframe
          ref={googleDriveIframeRef}
          className="w-full h-full border-0"
          allow="autoplay; fullscreen"
          allowFullScreen
          title="Google Drive Video Player"
          style={{
            pointerEvents: 'auto',
          }}
        />
        {/* Invisible overlay covering the entire top section to block pop-out button and other controls */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '80px', // Covers the top section where pop-out button and controls are
            background: 'transparent',
            zIndex: 9999,
            pointerEvents: 'auto',
            cursor: 'default',
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }}
          onMouseUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }}
          onMouseMove={(e) => {
            e.stopPropagation();
          }}
        />
      </div>
    );
  }

  // For YouTube videos without chapterId (backward compatibility)
  if (videoType === "YOUTUBE" && youtubeVideoId && !chapterId) {
    return (
      <div className={`aspect-video ${className || ""}`}>
        <div
          ref={youtubeEmbedRef}
          data-plyr-provider="youtube"
          data-plyr-embed-id={youtubeVideoId}
          className="w-full h-full"
        />
      </div>
    );
  }

  // No video available
  return (
    <div className={`aspect-video bg-muted rounded-lg flex items-center justify-center ${className || ""}`}>
      <div className="text-muted-foreground">لا يوجد فيديو</div>
    </div>
  );
};