import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type {
  BrandConfig,
  ConceptCard,
  CtaContent,
  CustomTextContent,
  FamilyRecapContent,
  FeatureListContent,
  PriceTagContent,
  RootLettersContent,
  SingleWordContent,
  VerseContent,
} from "@/lib/types";

interface Props {
  cards: ConceptCard[];
  brand: BrandConfig;
  style?: "educatif" | "promo" | "broll";
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
  style?: "educatif" | "promo" | "broll";
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

function RootLetters({
  content,
  brand,
  time,
  startTime,
}: {
  content: RootLettersContent;
  brand: BrandConfig;
  time: number;
  startTime: number;
}) {
  return (
    <>
      <div
        style={{
          fontFamily: brand.fonts.title,
          color: brand.colors.gold,
          fontSize: 50,
          letterSpacing: 3,
        }}
      >
        {content.label}
      </div>
      <div
        dir="rtl"
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 60,
          marginTop: 60,
        }}
      >
        {content.letters.map((l, i) => {
          const local = time - startTime;
          const delay = i * 0.25;
          const letterOpacity = interpolate(
            local,
            [delay, delay + 0.25],
            [0, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            },
          );
          const letterScale = interpolate(
            local,
            [delay, delay + 0.25],
            [0.5, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            },
          );
          return (
            <span
              key={i}
              style={{
                fontFamily: brand.fonts.arabic,
                fontSize: 160,
                fontWeight: 700,
                color: i === 0 ? brand.colors.orange : brand.colors.cream,
                opacity: letterOpacity,
                transform: `scale(${letterScale})`,
                textShadow: "0 0 40px rgba(242,138,75,0.5)",
              }}
            >
              {l}
            </span>
          );
        })}
      </div>
    </>
  );
}

function SingleWord({
  content,
  brand,
}: {
  content: SingleWordContent;
  brand: BrandConfig;
}) {
  return (
    <>
      <div
        style={{
          fontFamily: brand.fonts.title,
          color: brand.colors.gold,
          fontSize: 43,
          letterSpacing: 3,
        }}
      >
        {content.label}
      </div>
      <div
        dir="rtl"
        style={{
          fontFamily: brand.fonts.arabic,
          fontSize: 200,
          fontWeight: 700,
          marginTop: 50,
        }}
      >
        {content.arabic}
      </div>
      <div
        style={{
          fontFamily: brand.fonts.title,
          color: brand.colors.orange,
          fontSize: 62,
          marginTop: 40,
        }}
      >
        {content.translation}
      </div>
    </>
  );
}

function Verse({
  content,
  brand,
}: {
  content: VerseContent;
  brand: BrandConfig;
}) {
  return (
    <div
      style={{
        width: 920,
        padding: "60px 50px",
        borderRadius: 36,
        border: `4px solid rgba(200,151,42,.6)`,
        background: "rgba(255,255,255,.08)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: brand.fonts.title,
          color: brand.colors.gold,
          fontSize: 36,
          letterSpacing: 3,
          marginBottom: 30,
        }}
      >
        {content.surahLabel}
      </div>
      <div
        style={{
          height: 3,
          margin: "0 60px 36px",
          background: `linear-gradient(90deg, transparent, ${brand.colors.gold}, transparent)`,
        }}
      />
      <div
        dir="rtl"
        style={{
          fontFamily: brand.fonts.arabic,
          color: brand.colors.cream,
          fontSize: 72,
          lineHeight: 1.7,
          marginBottom: 36,
        }}
      >
        {content.arabic}
      </div>
      {content.salawat && (
        <div
          dir="rtl"
          style={{
            fontFamily: brand.fonts.arabic,
            fontSize: 55,
            color: brand.colors.gold,
            marginTop: 15,
          }}
        >
          {content.salawat}
        </div>
      )}
      <div
        style={{
          height: 2,
          margin: "0 80px 28px",
          background: "rgba(250,244,232,.2)",
        }}
      />
      <div
        style={{
          fontFamily: brand.fonts.body,
          color: "rgba(250,244,232,.85)",
          fontSize: 40,
          lineHeight: 1.4,
          fontStyle: "italic",
        }}
      >
        {content.translation}
      </div>
    </div>
  );
}

function FamilyRecap({
  content,
  brand,
  time,
  startTime,
}: {
  content: FamilyRecapContent;
  brand: BrandConfig;
  time: number;
  startTime: number;
}) {
  const local = time - startTime;
  return (
    <>
      {content.rootLetters && (
        <div
          dir="rtl"
          style={{
            fontFamily: brand.fonts.arabic,
            fontSize: 80,
            fontWeight: 700,
            color: brand.colors.cream,
            marginBottom: 20,
          }}
        >
          {content.rootLetters}
        </div>
      )}
      <div
        style={{
          fontFamily: brand.fonts.title,
          fontSize: 40,
          color: brand.colors.gold,
          letterSpacing: 3,
          marginBottom: 40,
        }}
      >
        {content.label}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
        }}
      >
        {content.words.map((w, i) => {
          const delay = i * 0.5;
          const itemOpacity = interpolate(local, [delay, delay + 0.3], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div key={i} style={{ opacity: itemOpacity, textAlign: "center" }}>
              <div
                dir="rtl"
                style={{
                  fontFamily: brand.fonts.arabic,
                  fontSize: 90,
                  fontWeight: 700,
                  color:
                    i === content.words.length - 1
                      ? brand.colors.orange
                      : brand.colors.cream,
                }}
              >
                {w.arabic}
              </div>
              <div
                style={{
                  fontFamily: brand.fonts.body,
                  fontSize: 40,
                  color: brand.colors.gold,
                  marginTop: 4,
                }}
              >
                {w.translation}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function PriceTag({
  content,
  brand,
}: {
  content: PriceTagContent;
  brand: BrandConfig;
}) {
  return (
    <>
      <div
        style={{
          fontFamily: brand.fonts.title,
          color: brand.colors.gold,
          fontSize: 52,
          letterSpacing: 3,
        }}
      >
        {content.headline}
      </div>
      <div
        style={{
          fontFamily: brand.fonts.title,
          color: brand.colors.orange,
          fontSize: 260,
          lineHeight: 1,
          marginTop: 30,
        }}
      >
        {content.price}
      </div>
      <div
        style={{
          fontFamily: brand.fonts.body,
          fontSize: 56,
          marginTop: 40,
          color: brand.colors.cream,
        }}
      >
        {content.subtitle}
      </div>
    </>
  );
}

function FeatureList({
  content,
  brand,
}: {
  content: FeatureListContent;
  brand: BrandConfig;
}) {
  return (
    <>
      <div
        style={{
          fontFamily: brand.fonts.title,
          color: brand.colors.gold,
          fontSize: 48,
          letterSpacing: 3,
          marginBottom: 50,
        }}
      >
        {content.title}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 28,
          alignItems: "flex-start",
          paddingLeft: 120,
        }}
      >
        {content.features.map((f) => (
          <div
            key={f}
            style={{
              fontFamily: brand.fonts.body,
              fontSize: 58,
              color: brand.colors.cream,
              display: "flex",
              alignItems: "center",
              gap: 22,
            }}
          >
            <span style={{ color: brand.colors.orange, fontSize: 42 }}>
              &#x2714;
            </span>
            {f}
          </div>
        ))}
      </div>
    </>
  );
}

function CtaCard({
  content,
  brand,
}: {
  content: CtaContent;
  brand: BrandConfig;
}) {
  return (
    <>
      <div
        style={{
          fontFamily: brand.fonts.title,
          color: brand.colors.orange,
          fontSize: 96,
          lineHeight: 1.2,
        }}
      >
        {content.mainText}
      </div>
      <div
        style={{
          fontFamily: brand.fonts.body,
          fontSize: 48,
          marginTop: 45,
          color: brand.colors.cream,
        }}
      >
        {content.subText}
      </div>
    </>
  );
}

function CustomText({
  content,
  brand,
}: {
  content: CustomTextContent;
  brand: BrandConfig;
}) {
  const colorMap = {
    cream: brand.colors.cream,
    gold: brand.colors.gold,
    orange: brand.colors.orange,
    teal: brand.colors.teal,
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
      }}
    >
      {content.lines.map((line, i) => (
        <div
          key={i}
          style={{
            fontFamily: brand.fonts.title,
            fontSize: line.fontSize,
            color: colorMap[line.color],
          }}
        >
          {line.text}
        </div>
      ))}
    </div>
  );
}

function renderCardContent(
  card: ConceptCard,
  brand: BrandConfig,
  time: number,
) {
  const c = card.content;
  switch (c.type) {
    case "root-letters":
      return (
        <RootLetters
          content={c}
          brand={brand}
          time={time}
          startTime={card.startTime}
        />
      );
    case "single-word":
      return <SingleWord content={c} brand={brand} />;
    case "verse":
      return <Verse content={c} brand={brand} />;
    case "family-recap":
      return (
        <FamilyRecap
          content={c}
          brand={brand}
          time={time}
          startTime={card.startTime}
        />
      );
    case "price-tag":
      return <PriceTag content={c} brand={brand} />;
    case "feature-list":
      return <FeatureList content={c} brand={brand} />;
    case "cta":
      return <CtaCard content={c} brand={brand} />;
    case "custom-text":
      return <CustomText content={c} brand={brand} />;
  }
}

export function ConceptCardLayer({ cards, brand, style = "educatif" }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  const active = cards.find((c) => time >= c.startTime && time < c.endTime);
  if (!active) return null;

  const opacity = fade(time, active.startTime, active.endTime);

  return (
    <ConceptFrame opacity={opacity} brand={brand} style={style}>
      {renderCardContent(active, brand, time)}
    </ConceptFrame>
  );
}
