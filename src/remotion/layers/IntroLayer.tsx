import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { BrandConfig } from "@/lib/types";

interface Props {
  text: string;
  brand: BrandConfig;
}

export function IntroLayer({ text, brand }: Props) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Fade in 0-0.6s, hold, fade out last 0.5s
  const fadeIn = interpolate(frame, [0, Math.round(0.6 * fps)], [0, 1], {
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - Math.round(0.5 * fps), durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp" },
  );
  const opacity = fadeIn * fadeOut;

  // Scale entrance
  const scale = interpolate(frame, [0, Math.round(0.6 * fps)], [0.85, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${brand.colors.night} 0%, ${brand.colors.teal} 50%, ${brand.colors.night} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity,
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          padding: "0 60px",
        }}
      >
        {brand.logoUrl && (
          <img
            src={brand.logoUrl}
            alt=""
            style={{ width: 140, height: 140, objectFit: "contain" }}
          />
        )}
        <div
          style={{
            fontSize: 52,
            fontFamily: brand.fonts.title,
            color: brand.colors.cream,
            textAlign: "center",
            lineHeight: 1.3,
            textShadow: "0 4px 20px rgba(0,0,0,0.5)",
          }}
        >
          {text}
        </div>
      </div>
    </AbsoluteFill>
  );
}
