import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { BrandConfig, ConceptCard } from "@/lib/types";

interface TexteCle {
  time: number;
  duration: number;
  text: string;
}

interface Props {
  texteCles: TexteCle[];
  brand: BrandConfig;
  currentTime: number;
  cards?: ConceptCard[];
  offsetY?: number;
}

export function TexteCleLayer({
  texteCles,
  brand,
  currentTime,
  cards,
  offsetY = 0,
}: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!texteCles || texteCles.length === 0) return null;

  const active = texteCles.find(
    (t) => currentTime >= t.time && currentTime < t.time + t.duration,
  );
  if (!active) return null;

  // Don't show texte-cle when a concept card is active (avoids overlap)
  if (
    cards &&
    cards.some((c) => currentTime >= c.startTime && currentTime < c.endTime)
  ) {
    return null;
  }

  const elapsed = currentTime - active.time;
  const progress = elapsed / active.duration;

  // Pop-in + fade-out
  const scale = interpolate(progress, [0, 0.15, 0.85, 1], [0.6, 1.05, 1, 0.9], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(progress, [0, 0.1, 0.8, 1], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          transform: `scale(${scale}) translateY(${offsetY}px)`,
          opacity,
          fontSize: 72,
          fontFamily: brand.fonts.title,
          color: brand.colors.orange,
          textAlign: "center",
          lineHeight: 1.2,
          padding: "0 80px",
          textShadow: `0 4px 24px rgba(0,0,0,0.8), 0 0 60px ${brand.colors.night}`,
          fontWeight: 900,
          textTransform: "uppercase",
        }}
      >
        {active.text}
      </div>
    </AbsoluteFill>
  );
}
