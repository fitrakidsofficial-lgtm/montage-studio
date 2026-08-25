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
  style: "overlay" | "card";
}

export function HookLayer({ text, brand, style }: Props) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, Math.round(0.4 * fps)], [0, 1], {
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - Math.round(0.4 * fps), durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp" },
  );
  const opacity = fadeIn * fadeOut;

  const slideUp = interpolate(frame, [0, Math.round(0.4 * fps)], [40, 0], {
    extrapolateRight: "clamp",
  });

  if (style === "card") {
    // Legacy opaque intro card
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

  // Overlay hook — text on top of video, no opaque background
  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: 180,
        opacity,
      }}
    >
      <div
        style={{
          transform: `translateY(${slideUp}px)`,
          padding: "0 50px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 58,
            fontFamily: brand.fonts.title,
            color: brand.colors.cream,
            lineHeight: 1.3,
            textShadow:
              "0 4px 16px rgba(0,0,0,0.95), 0 0 40px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,1)",
            WebkitTextStroke: "1px rgba(0,0,0,0.3)",
          }}
        >
          {text}
        </div>
      </div>
    </AbsoluteFill>
  );
}
