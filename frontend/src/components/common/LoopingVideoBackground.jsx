import { useEffect, useRef } from "react";

const FADE_SECONDS = 0.5;

export default function LoopingVideoBackground({ src, className = "", videoClassName = "", style }) {
  const videoRef = useRef(null);
  const frameRef = useRef(null);
  const restartTimeoutRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const setOpacity = (opacity) => {
      video.style.opacity = String(Math.min(1, Math.max(0, opacity)));
    };

    const tick = () => {
      const { currentTime, duration } = video;

      if (Number.isFinite(duration) && duration > 0) {
        if (currentTime < FADE_SECONDS) {
          setOpacity(currentTime / FADE_SECONDS);
        } else if (duration - currentTime < FADE_SECONDS) {
          setOpacity((duration - currentTime) / FADE_SECONDS);
        } else {
          setOpacity(1);
        }
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    const restart = () => {
      setOpacity(0);
      restartTimeoutRef.current = window.setTimeout(() => {
        video.currentTime = 0;
        video.play().catch(() => {});
      }, 100);
    };

    setOpacity(0);
    video.addEventListener("ended", restart);
    video.play().catch(() => {});
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      video.removeEventListener("ended", restart);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (restartTimeoutRef.current) window.clearTimeout(restartTimeoutRef.current);
    };
  }, []);

  return (
    <div className={`absolute z-0 overflow-hidden ${className}`} style={style} aria-hidden="true">
      <video
        ref={videoRef}
        className={`absolute h-full w-full object-cover transition-opacity duration-100 ${videoClassName}`}
        src={src}
        muted
        playsInline
        preload="auto"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
    </div>
  );
}
