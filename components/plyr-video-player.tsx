"use client";

import { useEffect, useRef } from "react";
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

  // Initialize Plyr on mount/update and destroy on unmount
  useEffect(() => {
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
  }, [videoUrl, youtubeVideoId, videoType, onEnded, onTimeUpdate]);

  const hasVideo = (videoType === "YOUTUBE" && !!youtubeVideoId) || !!videoUrl;

  if (!hasVideo) {
    return (
      <div className={`aspect-video bg-muted rounded-lg flex items-center justify-center ${className || ""}`}>
        <div className="text-muted-foreground">لا يوجد فيديو</div>
      </div>
    );
  }

  // For YouTube videos, use proxy iframe to hide the URL
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
        <video ref={html5VideoRef} className="w-full h-full" playsInline crossOrigin="anonymous">
          {videoUrl ? <source src={videoUrl} type="video/mp4" /> : null}
        </video>
      )}
    </div>
  );
};