import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { BrandConfig } from "@/lib/types";

type CtaObjective =
  "engagement" | "save" | "share" | "subscribe" | "traffic" | "sale";

const CTA_CONFIG: Record<
  CtaObjective,
  { text: string; sub: string; icon: string }
> = {
  engagement: {
    text: "Dis-moi en commentaire",
    sub: "Quelle racine veux-tu decouvrir ?",
    icon: "💬",
  },
  save: {
    text: "Enregistre ce reel",
    sub: "Pour reviser plus tard",
    icon: "🔖",
  },
  share: {
    text: "Partage avec quelqu'un",
    sub: "Qui apprend l'arabe",
    icon: "↗",
  },
  subscribe: {
    text: "Abonne-toi",
    sub: "1 racine arabe par jour",
    icon: "🔔",
  },
  traffic: {
    text: "Lien dans la bio",
    sub: "Decouvre le programme complet",
    icon: "↓",
  },
  sale: {
    text: "Rejoins le programme",
    sub: "Places limitees",
    icon: "→",
  },
};

interface Props {
  objective: CtaObjective;
  brand: BrandConfig;
}

export function CtaLayer({ objective, brand }: Props) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const config = CTA_CONFIG[objective];

  const fadeIn = interpolate(frame, [0, Math.round(0.5 * fps)], [0, 1], {
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - Math.round(0.3 * fps), durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp" },
  );
  const opacity = fadeIn * fadeOut;

  const slideUp = interpolate(frame, [0, Math.round(0.5 * fps)], [60, 0], {
    extrapolateRight: "clamp",
  });

  const scale = interpolate(frame, [0, Math.round(0.5 * fps)], [0.9, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.7) 40%, ${brand.colors.night} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity,
      }}
    >
      <div
        style={{
          transform: `translateY(${slideUp}px) scale(${scale})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          padding: "0 60px",
        }}
      >
        <div style={{ fontSize: 80 }}>{config.icon}</div>
        <div
          style={{
            fontSize: 52,
            fontFamily: brand.fonts.title,
            color: brand.colors.orange,
            textAlign: "center",
            lineHeight: 1.3,
            textShadow: "0 4px 20px rgba(0,0,0,0.6)",
          }}
        >
          {config.text}
        </div>
        <div
          style={{
            fontSize: 36,
            fontFamily: brand.fonts.body,
            color: brand.colors.cream,
            textAlign: "center",
            lineHeight: 1.4,
            opacity: 0.9,
          }}
        >
          {config.sub}
        </div>
      </div>
    </AbsoluteFill>
  );
}
