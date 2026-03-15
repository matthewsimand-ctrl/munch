import { useEffect, useMemo, useRef, useState } from "react";
import munchLogo from "@/assets/munch-logo.png";

interface MunchLogoProps {
  className?: string;
  size?: number;
  showWordmark?: boolean;
  wordmark?: string;
  wordmarkClassName?: string;
  subtitle?: string;
  subtitleClassName?: string;
  interactiveEyes?: boolean;
}

const SOURCE_WIDTH = 1116;
const SOURCE_HEIGHT = 944;
const CROP_X = 244;
const CROP_Y = 136;
const CROP_SIZE = 640;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function useEyeTracking(enabled: boolean) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) {
      setPupilOffset({ x: 0, y: 0 });
      return;
    }

    const handlePointerMove = (event: MouseEvent) => {
      const target = wrapperRef.current;
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
      const distance = Math.min(4.5, Math.hypot(event.clientX - centerX, event.clientY - centerY) / 65);

      setPupilOffset({
        x: clamp(Math.cos(angle) * distance, -4.5, 4.5),
        y: clamp(Math.sin(angle) * distance, -4.5, 4.5),
      });
    };

    window.addEventListener("mousemove", handlePointerMove);
    return () => window.removeEventListener("mousemove", handlePointerMove);
  }, [enabled]);

  return { wrapperRef, pupilOffset };
}

function LogoArt({
  size,
  interactiveEyes,
}: {
  size: number;
  interactiveEyes?: boolean;
}) {
  const { wrapperRef, pupilOffset } = useEyeTracking(Boolean(interactiveEyes));
  const cropScale = size / CROP_SIZE;
  const leftPupil = useMemo(
    () => ({
      x: 276 + pupilOffset.x / cropScale,
      y: 247 + pupilOffset.y / cropScale,
    }),
    [cropScale, pupilOffset.x, pupilOffset.y],
  );
  const rightPupil = useMemo(
    () => ({
      x: 387 + pupilOffset.x / cropScale,
      y: 243 + pupilOffset.y / cropScale,
    }),
    [cropScale, pupilOffset.x, pupilOffset.y],
  );

  return (
    <div ref={wrapperRef} className="relative shrink-0 overflow-hidden" style={{ width: size, height: size }}>
      <img
        src={munchLogo}
        alt="Munch logo"
        className="absolute max-w-none select-none"
        style={{
          width: `${(SOURCE_WIDTH / CROP_SIZE) * size}px`,
          height: `${(SOURCE_HEIGHT / CROP_SIZE) * size}px`,
          left: `${-(CROP_X / CROP_SIZE) * size}px`,
          top: `${-(CROP_Y / CROP_SIZE) * size}px`,
        }}
        draggable={false}
      />
      {interactiveEyes && (
        <svg viewBox={`0 0 ${CROP_SIZE} ${CROP_SIZE}`} width={size} height={size} className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <circle cx={leftPupil.x} cy={leftPupil.y} r="6.5" fill="#6e3b22" />
          <circle cx={rightPupil.x} cy={rightPupil.y} r="6.5" fill="#6e3b22" />
          <circle cx={leftPupil.x - 2} cy={leftPupil.y - 2.5} r="2" fill="#fff" opacity="0.95" />
          <circle cx={rightPupil.x - 2} cy={rightPupil.y - 2.5} r="2" fill="#fff" opacity="0.95" />
        </svg>
      )}
    </div>
  );
}

export function MunchLogo({
  className,
  size = 44,
  showWordmark = true,
  wordmark = "Munch",
  wordmarkClassName,
  subtitle,
  subtitleClassName,
  interactiveEyes = false,
}: MunchLogoProps) {
  return (
    <div className={className ? `flex items-center gap-3 ${className}` : "flex items-center gap-3"}>
      <LogoArt size={size} interactiveEyes={interactiveEyes} />
      {showWordmark && (
        <div>
          <p className={wordmarkClassName || "text-lg font-bold tracking-tight text-stone-900"}>{wordmark}</p>
          {subtitle ? (
            <p className={subtitleClassName || "text-xs text-stone-500"}>{subtitle}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function MunchHeroLogo({
  className,
  size = 320,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <div className={className}>
      <div
        className="overflow-hidden rounded-[28%]"
        style={{ width: size, height: size }}
      >
        <LogoArt size={size} />
      </div>
    </div>
  );
}
