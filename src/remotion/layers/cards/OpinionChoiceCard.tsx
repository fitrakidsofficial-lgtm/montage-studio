import { Img, interpolate } from "remotion";
import type { BrandConfig, BrollItem, OpinionChoiceContent } from "@/lib/types";

/** Opinion-specific brand colors (override for this template family) */
const OPINION_COLORS = {
  night: "#061A2A",
  gold: "#F8B831",
  teal: "#1D776A",
  orange: "#C6611D",
  cream: "#F7FAF9",
};

interface Props {
  content: OpinionChoiceContent;
  brand: BrandConfig;
  time: number;
  startTime: number;
  endTime: number;
  brolls?: BrollItem[];
}

function resolveImageUrl(
  option: OpinionChoiceContent["options"][number],
  brolls?: BrollItem[],
): string | null {
  if (option.imageUrl) return option.imageUrl;
  if (option.brollId && brolls) {
    const match = brolls.find((b) => b.id === option.brollId);
    if (match) return match.fileUrl;
  }
  return null;
}

function LabelBadge({
  label,
  highlight,
}: {
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: 16,
        background: highlight ? OPINION_COLORS.gold : OPINION_COLORS.night,
        color: highlight ? OPINION_COLORS.night : OPINION_COLORS.cream,
        fontFamily: "'Luckiest Guy', sans-serif",
        fontSize: 42,
        fontWeight: 400,
        padding: "6px 24px",
        borderRadius: 16,
        zIndex: 2,
        letterSpacing: 2,
      }}
    >
      {label}
    </div>
  );
}

function OptionImage({
  src,
  label,
  opacity,
  translateY,
  scale,
  highlight,
}: {
  src: string | null;
  label: string;
  opacity: number;
  translateY: number;
  scale: number;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        position: "relative",
        flex: 1,
        overflow: "hidden",
        borderRadius: 20,
        opacity,
        transform: `translateY(${translateY}px) scale(${scale})`,
        border: highlight
          ? `4px solid ${OPINION_COLORS.gold}`
          : "2px solid rgba(255,255,255,0.08)",
      }}
    >
      <LabelBadge label={label} highlight={highlight} />
      {src ? (
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            background: OPINION_COLORS.night,
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: OPINION_COLORS.night,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: OPINION_COLORS.cream,
            fontFamily: "'Poppins', sans-serif",
            fontSize: 36,
            opacity: 0.3,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

function ABLayout({
  content,
  brolls,
  progress,
}: {
  content: OpinionChoiceContent;
  brolls?: BrollItem[];
  progress: number;
}) {
  const [a, b] = content.options;
  const srcA = resolveImageUrl(a, brolls);
  const srcB = resolveImageUrl(b, brolls);

  const oA = interpolate(progress, [0, 0.15], [0, 1], {
    extrapolateRight: "clamp",
  });
  const oB = interpolate(progress, [0.2, 0.35], [0, 1], {
    extrapolateRight: "clamp",
  });
  const yA = interpolate(progress, [0, 0.15], [30, 0], {
    extrapolateRight: "clamp",
  });
  const yB = interpolate(progress, [0.2, 0.35], [30, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        width: "100%",
        height: "100%",
        padding: "0 64px",
      }}
    >
      <OptionImage
        src={srcA}
        label={a?.label || "A"}
        opacity={oA}
        translateY={yA}
        scale={1}
      />
      <OptionImage
        src={srcB}
        label={b?.label || "B"}
        opacity={oB}
        translateY={yB}
        scale={1}
      />
    </div>
  );
}

function ABCLayout({
  content,
  brolls,
  progress,
}: {
  content: OpinionChoiceContent;
  brolls?: BrollItem[];
  progress: number;
}) {
  const [a, b, c] = content.options;
  const srcA = resolveImageUrl(a, brolls);
  const srcB = resolveImageUrl(b, brolls);
  const srcC = c ? resolveImageUrl(c, brolls) : null;

  const oA = interpolate(progress, [0, 0.12], [0, 1], {
    extrapolateRight: "clamp",
  });
  const oB = interpolate(progress, [0.15, 0.27], [0, 1], {
    extrapolateRight: "clamp",
  });
  const oC = interpolate(progress, [0.3, 0.42], [0, 1], {
    extrapolateRight: "clamp",
  });
  const yA = interpolate(progress, [0, 0.12], [24, 0], {
    extrapolateRight: "clamp",
  });
  const yB = interpolate(progress, [0.15, 0.27], [24, 0], {
    extrapolateRight: "clamp",
  });
  const yC = interpolate(progress, [0.3, 0.42], [24, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        width: "100%",
        height: "100%",
        padding: "0 64px",
      }}
    >
      <OptionImage
        src={srcA}
        label={a?.label || "A"}
        opacity={oA}
        translateY={yA}
        scale={1}
      />
      <div style={{ display: "flex", gap: 16, flex: 1 }}>
        <OptionImage
          src={srcB}
          label={b?.label || "B"}
          opacity={oB}
          translateY={yB}
          scale={1}
        />
        {c && (
          <OptionImage
            src={srcC}
            label={c.label || "C"}
            opacity={oC}
            translateY={yC}
            scale={1}
          />
        )}
      </div>
    </div>
  );
}

function AvecSansLayout({
  content,
  brolls,
  progress,
}: {
  content: OpinionChoiceContent;
  brolls?: BrollItem[];
  progress: number;
}) {
  const [avec, sans] = content.options;
  const srcAvec = resolveImageUrl(avec, brolls);
  const srcSans = resolveImageUrl(sans, brolls);

  const oA = interpolate(progress, [0, 0.15], [0, 1], {
    extrapolateRight: "clamp",
  });
  const oB = interpolate(progress, [0.2, 0.35], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        width: "100%",
        height: "100%",
        padding: "0 64px",
        position: "relative",
      }}
    >
      <div style={{ flex: 1, overflow: "hidden" }}>
        <OptionImage
          src={srcAvec}
          label={avec?.label || "AVEC"}
          opacity={oA}
          translateY={0}
          scale={1}
        />
      </div>
      {/* Separator */}
      <div
        style={{
          height: 6,
          background: OPINION_COLORS.gold,
          margin: "0 0",
          zIndex: 3,
          borderRadius: 3,
        }}
      />
      <div style={{ flex: 1, overflow: "hidden" }}>
        <OptionImage
          src={srcSans}
          label={sans?.label || "SANS"}
          opacity={oB}
          translateY={0}
          scale={1}
        />
      </div>
    </div>
  );
}

function ResultatLayout({
  content,
  brolls,
  progress,
}: {
  content: OpinionChoiceContent;
  brolls?: BrollItem[];
  progress: number;
}) {
  const winner = content.options.find((o) => o.id === content.winnerId);
  const winnerSrc = winner ? resolveImageUrl(winner, brolls) : null;

  const oWinner = interpolate(progress, [0.15, 0.35], [0, 1], {
    extrapolateRight: "clamp",
  });
  const scaleWinner = interpolate(progress, [0.15, 0.4], [0.92, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: "0 64px",
        gap: 16,
      }}
    >
      {/* Winner badge */}
      <div
        style={{
          background: OPINION_COLORS.gold,
          color: OPINION_COLORS.night,
          fontFamily: "'Luckiest Guy', sans-serif",
          fontSize: 38,
          padding: "10px 32px",
          borderRadius: 20,
          opacity: oWinner,
          letterSpacing: 2,
        }}
      >
        VOTRE CHOIX
      </div>
      {/* Winner image */}
      <div
        style={{
          flex: 1,
          width: "100%",
          borderRadius: 24,
          overflow: "hidden",
          opacity: oWinner,
          transform: `scale(${scaleWinner})`,
          border: `4px solid ${OPINION_COLORS.gold}`,
        }}
      >
        {winnerSrc ? (
          <Img
            src={winnerSrc}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              background: OPINION_COLORS.night,
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: OPINION_COLORS.night,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: OPINION_COLORS.cream,
              fontFamily: "'Poppins', sans-serif",
              fontSize: 48,
            }}
          >
            {winner?.label || "?"}
          </div>
        )}
      </div>
    </div>
  );
}

export function OpinionChoiceCard({
  content,
  brand,
  time,
  startTime,
  endTime,
  brolls,
}: Props) {
  const duration = endTime - startTime;
  const progress = Math.max(0, Math.min(1, (time - startTime) / duration));

  // Header animation
  const headerOpacity = interpolate(progress, [0, 0.08], [0, 1], {
    extrapolateRight: "clamp",
  });
  const headerY = interpolate(progress, [0, 0.08], [-20, 0], {
    extrapolateRight: "clamp",
  });

  // CTA animation (appears in last 30%)
  const ctaOpacity = interpolate(progress, [0.65, 0.75], [0, 1], {
    extrapolateRight: "clamp",
  });
  const ctaY = interpolate(progress, [0.65, 0.75], [20, 0], {
    extrapolateRight: "clamp",
  });

  const logoUrl = brand.logoUrl;

  return (
    <div
      style={{
        width: 1080,
        height: 1920,
        display: "flex",
        flexDirection: "column",
        background: OPINION_COLORS.night,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Logo top-right */}
      {logoUrl && (
        <div
          style={{
            position: "absolute",
            top: 32,
            right: 32,
            zIndex: 10,
            opacity: headerOpacity,
          }}
        >
          <Img src={logoUrl} style={{ height: 72, objectFit: "contain" }} />
        </div>
      )}

      {/* Eyebrow + Question zone (top) */}
      <div
        style={{
          padding: "60px 64px 20px",
          opacity: headerOpacity,
          transform: `translateY(${headerY}px)`,
          flexShrink: 0,
        }}
      >
        {content.eyebrow && (
          <div
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: 32,
              fontWeight: 600,
              color: OPINION_COLORS.gold,
              textTransform: "uppercase",
              letterSpacing: 3,
              marginBottom: 12,
            }}
          >
            {content.eyebrow}
          </div>
        )}
        <div
          style={{
            fontFamily: "'Luckiest Guy', sans-serif",
            fontSize: content.question.length > 40 ? 52 : 64,
            color: OPINION_COLORS.cream,
            lineHeight: 1.15,
            maxWidth: 900,
          }}
        >
          {content.question}
        </div>
      </div>

      {/* Images zone (center, flexible) */}
      <div style={{ flex: 1, minHeight: 0, padding: "8px 0" }}>
        {content.mode === "ab" && (
          <ABLayout content={content} brolls={brolls} progress={progress} />
        )}
        {content.mode === "abc" && (
          <ABCLayout content={content} brolls={brolls} progress={progress} />
        )}
        {content.mode === "avec-sans" && (
          <AvecSansLayout
            content={content}
            brolls={brolls}
            progress={progress}
          />
        )}
        {content.mode === "resultat" && (
          <ResultatLayout
            content={content}
            brolls={brolls}
            progress={progress}
          />
        )}
      </div>

      {/* CTA zone (bottom — safe area 220px) */}
      <div
        style={{
          padding: "20px 64px 80px",
          opacity: ctaOpacity,
          transform: `translateY(${ctaY}px)`,
          flexShrink: 0,
          minHeight: 220,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
        }}
      >
        <div
          style={{
            fontFamily: "'Luckiest Guy', sans-serif",
            fontSize: content.cta.length > 50 ? 40 : 50,
            color: OPINION_COLORS.gold,
            lineHeight: 1.2,
            marginBottom: content.footerText ? 12 : 0,
          }}
        >
          {content.cta}
        </div>
        {content.footerText && (
          <div
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: 30,
              color: OPINION_COLORS.cream,
              opacity: 0.8,
              lineHeight: 1.3,
            }}
          >
            {content.footerText}
          </div>
        )}
      </div>
    </div>
  );
}
