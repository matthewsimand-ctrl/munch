import { useEffect, useRef, useState } from "react";

interface AppPromoVideoProps {
  className?: string;
  videoClassName?: string;
  posterClassName?: string;
  priority?: boolean;
}

export default function AppPromoVideo({
  className = "",
  videoClassName = "",
  posterClassName = "",
  priority = false,
}: AppPromoVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVisible, setIsVisible] = useState(priority);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    syncPreference();

    mediaQuery.addEventListener("change", syncPreference);
    return () => mediaQuery.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    if (priority) {
      setIsVisible(true);
      return;
    }

    const element = videoRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.35 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [priority]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (prefersReducedMotion || !isVisible || document.visibilityState === "hidden") {
      video.pause();
      return;
    }

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        // Ignore autoplay rejections; the poster remains visible.
      });
    }
  }, [isVisible, prefersReducedMotion]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        video.pause();
        return;
      }

      if (!prefersReducedMotion && (priority || isVisible)) {
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {});
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isVisible, prefersReducedMotion, priority]);

  return (
    <div className={className}>
      <video
        ref={videoRef}
        className={videoClassName}
        poster="/media/munch-demo-poster.jpg"
        autoPlay={priority}
        muted
        loop
        playsInline
        preload={priority ? "metadata" : "none"}
      >
        <source src="/media/munch-demo.mp4" type="video/mp4" />
        <source src="/media/munch-demo.webm" type="video/webm" />
      </video>
      {posterClassName ? (
        <img
          src="/media/munch-demo-poster.jpg"
          alt="Munch app demo"
          className={posterClassName}
        />
      ) : null}
    </div>
  );
}
