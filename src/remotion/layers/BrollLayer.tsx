import {
  AbsoluteFill,
  Img,
  Video,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { BrollItem, BrollLayout } from "@/lib/types";

interface Props {
  brolls: BrollItem[];
  currentTime?: number;
  /** Context for auto layout: are subtitles visible at this time? */
  hasSubtitle?: boolean;
  /** Context for auto layout: is a texte-cle visible? */
  hasTexteCle?: boolean;
  /** Context for auto layout: is hook/CTA active? */
  hasOverlay?: boolean;
}

// ── Fade helper ──

function fade(time: number, start: number, end: number, edge = 0.3) {
  return Math.min(
    interpolate(time, [start, start + edge], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    interpolate(time, [end - edge, end], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
}

// ── Auto layout resolver ──
// Deterministic: same inputs → same output, no randomness

function resolveAutoLayout(
  broll: BrollItem,
  hasSubtitle: boolean,
  hasTexteCle: boolean,
  hasOverlay: boolean,
): Exclude<BrollLayout, "auto"> {
  const isLandscape = broll.orientation === "landscape";
  const isVideo = broll.mediaType === "video";

  // Portrait video/image → fullscreen (native format for 9:16)
  if (!isLandscape && !hasOverlay) return "fullscreen";

  // Landscape + texte-cle active → top-half (text is usually bottom)
  if (isLandscape && hasTexteCle) return "top-half";

  // Landscape + subtitle active → top-half (subs are at bottom)
  if (isLandscape && hasSubtitle) return "top-half";

  // Landscape + hook/CTA overlay → bottom-half (overlay is usually top/center)
  if (isLandscape && hasOverlay) return "bottom-half";

  // Landscape video → overlay (cinematic feel, show main video behind)
  if (isLandscape && isVideo) return "overlay";

  // Landscape image → centered-card (clean presentation)
  if (isLandscape) return "centered-card";

  // Portrait with overlay → picture-in-picture (don't hide overlay)
  if (hasOverlay) return "picture-in-picture";

  return "fullscreen";
}

// ── Media element ──

function BrollMedia({
  broll,
  scale,
  objectFit = "cover",
  borderRadius,
}: {
  broll: BrollItem;
  scale: number;
  objectFit?: "cover" | "contain";
  borderRadius?: number;
}) {
  const style: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit,
    transform: `scale(${scale})`,
    borderRadius: borderRadius ?? 0,
  };

  if (broll.mediaType === "video") {
    return <Video src={broll.fileUrl} muted style={style} />;
  }
  return <Img src={broll.fileUrl} style={style} />;
}

// ── Gradient overlays ──

function TopGradient() {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "30%",
        background: "linear-gradient(180deg, rgba(0,0,0,0.85), transparent)",
        pointerEvents: "none",
      }}
    />
  );
}

function BottomGradient() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "25%",
        background: "linear-gradient(0deg, rgba(0,0,0,0.6), transparent)",
        pointerEvents: "none",
      }}
    />
  );
}

function FullGradient() {
  return (
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(180deg, rgba(0,0,0,.08), transparent 55%, rgba(0,0,0,.64))",
        pointerEvents: "none",
      }}
    />
  );
}

// ── Main component ──

export function BrollLayer({
  brolls,
  currentTime,
  hasSubtitle = false,
  hasTexteCle = false,
  hasOverlay = false,
}: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = currentTime ?? frame / fps;

  const active = brolls.find((b) => time >= b.startTime && time < b.endTime);
  if (!active) return null;

  const opacity = fade(time, active.startTime, active.endTime);
  const progress =
    (time - active.startTime) / (active.endTime - active.startTime);
  const scale = interpolate(progress, [0, 1], [1.02, 1.08]);

  const layout: Exclude<BrollLayout, "auto"> =
    active.layout && active.layout !== "auto"
      ? active.layout
      : resolveAutoLayout(active, hasSubtitle, hasTexteCle, hasOverlay);

  // ── fullscreen ──
  if (layout === "fullscreen") {
    return (
      <AbsoluteFill style={{ opacity }}>
        <BrollMedia broll={active} scale={scale} />
        <FullGradient />
      </AbsoluteFill>
    );
  }

  // ── bottom-half ──
  if (layout === "bottom-half") {
    return (
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "50%",
          opacity,
          overflow: "hidden",
        }}
      >
        <BrollMedia broll={active} scale={scale} />
        <TopGradient />
        <BottomGradient />
      </div>
    );
  }

  // ── top-half ──
  if (layout === "top-half") {
    return (
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: "50%",
          opacity,
          overflow: "hidden",
        }}
      >
        <BrollMedia broll={active} scale={scale} />
        <BottomGradient />
      </div>
    );
  }

  // ── overlay (60% height, centered, rounded, shadow) ──
  if (layout === "overlay") {
    return (
      <div
        style={{
          position: "absolute",
          left: 40,
          right: 40,
          top: "20%",
          height: "45%",
          opacity,
          overflow: "hidden",
          borderRadius: 24,
          boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
        }}
      >
        <BrollMedia broll={active} scale={scale} />
      </div>
    );
  }

  // ── picture-in-picture (small corner, 35% width) ──
  if (layout === "picture-in-picture") {
    return (
      <div
        style={{
          position: "absolute",
          right: 30,
          top: 180,
          width: "35%",
          aspectRatio: active.orientation === "landscape" ? "16/9" : "9/16",
          maxHeight: "40%",
          opacity,
          overflow: "hidden",
          borderRadius: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          border: "2px solid rgba(255,255,255,0.12)",
        }}
      >
        <BrollMedia broll={active} scale={1} objectFit="cover" />
      </div>
    );
  }

  // ── centered-card (contain, centered, with dark backdrop) ──
  return (
    <AbsoluteFill
      style={{
        opacity,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.75)",
      }}
    >
      <div
        style={{
          width: "85%",
          maxHeight: "55%",
          overflow: "hidden",
          borderRadius: 20,
          boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
        }}
      >
        <BrollMedia
          broll={active}
          scale={scale}
          objectFit="contain"
          borderRadius={20}
        />
      </div>
    </AbsoluteFill>
  );
}
