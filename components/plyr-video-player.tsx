"use client";

import { useEffect, useRef, useState } from "react";
import "plyr/dist/plyr.css";

interface PlyrVideoPlayerProps {
  videoUrl?: string;
  youtubeVideoId?: string;
  videoType?: "UPLOAD" | "YOUTUBE";
  className?: string;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  chapterId?: string; // Required for YouTube proxy
}

export const PlyrVideoPlayer = ({
  videoUrl,
  youtubeVideoId,
  videoType = "UPLOAD",
  className,
  onEnded,
  onTimeUpdate,
  chapterId
}: PlyrVideoPlayerProps) => {
  const html5VideoRef = useRef<HTMLVideoElement>(null);
  const youtubeEmbedRef = useRef<HTMLDivElement>(null);
  const proxyIframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<any>(null);
  const [proxyVideoUrl, setProxyVideoUrl] = useState<string | null>(null);
  // Initialize loading state to true if we need to fetch the URL
  const [isLoadingUrl, setIsLoadingUrl] = useState(
    videoType === "UPLOAD" && chapterId ? true : false
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

  // Fetch video URL from server if using proxy for uploaded videos
  useEffect(() => {
    // Only fetch if we haven't already fetched the URL
    if (videoType === "UPLOAD" && chapterId && !proxyVideoUrl) {
      setIsLoadingUrl(true);
      
      fetch(`/api/video/get-url/${chapterId}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      })
      .then(async response => {
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[VIDEO_PLAYER] Failed to fetch video URL:', response.status, errorText);
          // If 404, the chapter might not have a video - that's okay
          if (response.status === 404) {
            console.warn('[VIDEO_PLAYER] Chapter does not have an uploaded video');
            return null;
          }
          throw new Error(`Failed to fetch video URL: ${response.status} ${errorText}`);
        }
        return response.json();
      })
      .then(data => {
        if (data && data.u) {
          // Use proxy route instead of direct URL
          setProxyVideoUrl(`/api/video/proxy-upload/${chapterId}`);
        } else {
          console.warn('[VIDEO_PLAYER] No video URL in response:', data);
        }
      })
      .catch(error => {
        console.error('[VIDEO_PLAYER] Error fetching video URL:', error);
        // Don't throw - just log the error, video won't load
      })
      .finally(() => {
        setIsLoadingUrl(false);
      });
    }
  }, [videoType, chapterId, proxyVideoUrl]);

  // Initialize Plyr on mount/update and destroy on unmount
  // Skip Plyr initialization for YouTube videos when using proxy (chapterId provided)
  useEffect(() => {
    // Don't initialize Plyr if we're using the proxy for YouTube videos
    if (videoType === "YOUTUBE" && chapterId) {
      return;
    }
    
    // Don't initialize if we're waiting for proxy URL for uploaded videos
    if (videoType === "UPLOAD" && chapterId && !proxyVideoUrl) {
      return;
    }

    let isCancelled = false;

    async function setupPlayer() {
      const targetEl =
        videoType === "YOUTUBE" ? youtubeEmbedRef.current : html5VideoRef.current;
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
  }, [videoUrl, youtubeVideoId, videoType, chapterId, onEnded, onTimeUpdate, proxyVideoUrl]);

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

  // For uploaded videos with chapterId, show loading state while fetching
  if (videoType === "UPLOAD" && chapterId && isLoadingUrl) {
    return (
      <div className={`aspect-video bg-muted rounded-lg flex items-center justify-center ${className || ""}`}>
        <div className="text-muted-foreground">جاري تحميل الفيديو...</div>
      </div>
    );
  }

  // For uploaded videos with chapterId, check if we have the proxy URL
  // For backward compatibility, also check direct videoUrl
  const hasVideo = (videoType === "YOUTUBE" && !!youtubeVideoId) || 
                   (videoType === "UPLOAD" && chapterId && (proxyVideoUrl || videoUrl)) ||
                   (videoType === "UPLOAD" && !chapterId && !!videoUrl);

  // For uploaded videos with chapterId, render video element even if proxy URL is not yet set
  // This allows Plyr to initialize and the source will be added once the proxy URL is fetched
  if (videoType === "UPLOAD" && chapterId && !proxyVideoUrl && !isLoadingUrl && !videoUrl) {
    return (
      <div className={`aspect-video bg-muted rounded-lg flex items-center justify-center ${className || ""}`}>
        <div className="text-muted-foreground">لا يوجد فيديو</div>
      </div>
    );
  }

  if (!hasVideo && videoType !== "UPLOAD") {
    return (
      <div className={`aspect-video bg-muted rounded-lg flex items-center justify-center ${className || ""}`}>
        <div className="text-muted-foreground">لا يوجد فيديو</div>
      </div>
    );
  }

  return (
    <div className={`aspect-video ${className || ""}`}>
      {videoType === "YOUTUBE" && youtubeVideoId ? (
        <div
          ref={youtubeEmbedRef}
          data-plyr-provider="youtube"
          data-plyr-embed-id={youtubeVideoId}
          className="w-full h-full"
        />
      ) : (
        <video 
          key={proxyVideoUrl || videoUrl || 'video'} 
          ref={html5VideoRef} 
          className="w-full h-full" 
          playsInline 
          crossOrigin="anonymous"
        >
          {/* Use proxy URL if available (when chapterId is provided), otherwise fallback to direct URL */}
          {chapterId && proxyVideoUrl ? (
            <source src={proxyVideoUrl} type="video/mp4" />
          ) : videoUrl ? (
            <source src={videoUrl} type="video/mp4" />
          ) : null}
        </video>
      )}
    </div>
  );
};