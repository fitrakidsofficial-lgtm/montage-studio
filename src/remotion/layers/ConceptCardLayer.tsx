import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { BrandConfig, BrollItem, ConceptCard } from "@/lib/types";
import { RootLettersCard } from "./cards/RootLettersCard";
import { SingleWordCard } from "./cards/SingleWordCard";
import { VerseCard } from "./cards/VerseCard";
import { FamilyRecapCard } from "./cards/FamilyRecapCard";
import { PriceTagCard, FeatureListCard, CtaCard } from "./cards/PromoCards";
import { CustomTextCard } from "./cards/CustomTextCard";
import { OpinionChoiceCard } from "./cards/OpinionChoiceCard";

interface Props {
  cards: ConceptCard[];
  brand: BrandConfig;
  style?: "educatif" | "promo" | "broll" | "opinion";
  currentTime?: number;
  words?: { word: string; start: number; end: number }[];
  brolls?: BrollItem[];
  offsetY?: number;
}

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

const STYLE_BACKGROUNDS = {
  educatif: (brand: BrandConfig) => ({
    bg: `radial-gradient(circle at 50% 38%, ${brand.colors.teal}, ${brand.colors.night} 66%, #09282e)`,
    dots: "radial-gradient(circle, rgba(250,244,232,.15) 0 2px, transparent 3px)",
  }),
  promo: (brand: BrandConfig) => ({
    bg: `radial-gradient(circle at 50% 45%, ${brand.colors.orange}33, ${brand.colors.night} 70%, #0a0a0a)`,
    dots: "radial-gradient(circle, rgba(242,138,75,.12) 0 2px, transparent 3px)",
  }),
  broll: (brand: BrandConfig) => ({
    bg: `linear-gradient(180deg, rgba(0,0,0,.7) 0%, rgba(0,0,0,.85) 50%, rgba(0,0,0,.7) 100%)`,
    dots: `radial-gradient(circle, ${brand.colors.teal}15 0 1px, transparent 2px)`,
  }),
  opinion: () => ({
    bg: "#061A2A",
    dots: "none",
  }),
};

function ConceptFrame({
  children,
  opacity,
  brand,
  style = "educatif",
}: {
  children: React.ReactNode;
  opacity: number;
  brand: BrandConfig;
  style?: "educatif" | "promo" | "broll" | "opinion";
}) {
  const theme = STYLE_BACKGROUNDS[style](brand);
  return (
    <AbsoluteFill
      style={{
        opacity,
        background: theme.bg,
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        color: brand.colors.cream,
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage: theme.dots,
          backgroundSize: "82px 82px",
          opacity: 0.3,
        }}
      />
      {children}
    </AbsoluteFill>
  );
}

function renderCardContent(
  card: ConceptCard,
  brand: BrandConfig,
  time: number,
  words?: { word: string; start: number; end: number }[],
  brolls?: BrollItem[],
) {
  const c = card.content;
  switch (c.type) {
    case "root-letters":
      return (
        <RootLettersCard
          content={c}
          brand={brand}
          time={time}
          startTime={card.startTime}
          endTime={card.endTime}
          words={words}
        />
      );
    case "single-word":
      return <SingleWordCard content={c} brand={brand} />;
    case "verse":
      return <VerseCard content={c} brand={brand} />;
    case "family-recap":
      return (
        <FamilyRecapCard
          content={c}
          brand={brand}
          time={time}
          startTime={card.startTime}
        />
      );
    case "price-tag":
      return <PriceTagCard content={c} brand={brand} />;
    case "feature-list":
      return <FeatureListCard content={c} brand={brand} />;
    case "cta":
      return <CtaCard content={c} brand={brand} />;
    case "custom-text":
      return <CustomTextCard content={c} brand={brand} />;
    case "opinion-choice":
      return (
        <OpinionChoiceCard
          content={c}
          brand={brand}
          time={time}
          startTime={card.startTime}
          endTime={card.endTime}
          brolls={brolls}
        />
      );
  }
}

export function ConceptCardLayer({
  cards,
  brand,
  style = "educatif",
  currentTime,
  words,
  brolls,
  offsetY = 0,
}: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = currentTime ?? frame / fps;

  const active = cards.find((c) => time >= c.startTime && time < c.endTime);
  if (!active) return null;

  const opacity = fade(time, active.startTime, active.endTime);

  // Opinion-choice cards render full-frame, skip ConceptFrame wrapper
  if (active.content.type === "opinion-choice") {
    return (
      <AbsoluteFill style={{ opacity }}>
        {renderCardContent(active, brand, time, words, brolls)}
      </AbsoluteFill>
    );
  }

  const entry = spring({
    fps,
    frame: Math.max(0, (time - active.startTime) * fps),
    config: { damping: 11, stiffness: 150, mass: 0.75 },
  });
  const entryScale = interpolate(entry, [0, 1], [0.86, 1]);
  const entryY = interpolate(entry, [0, 1], [70, 0]);

  return (
    <ConceptFrame opacity={opacity} brand={brand} style={style}>
      <div
        style={{
          transform: `translateY(${entryY + offsetY}px) scale(${entryScale})`,
          transformOrigin: "center center",
        }}
      >
        {renderCardContent(active, brand, time, words, brolls)}
      </div>
    </ConceptFrame>
  );
}
