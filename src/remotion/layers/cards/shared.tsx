import type { BrandConfig, ConceptCard } from "@/lib/types";

export type KidsAccent = "gold" | "orange";

export const CARD_ROTATIONS: Partial<Record<ConceptCard["type"], number>> = {
  "single-word": -1.2,
  "custom-text": 1.1,
  verse: -0.7,
  "feature-list": 0.9,
  cta: -1.4,
};

export function KidsDecorations({
  brand,
  accent,
}: {
  brand: BrandConfig;
  accent: KidsAccent;
}) {
  const accentColor = brand.colors[accent];
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 30,
          top: 28,
          width: 34,
          height: 34,
          color: accentColor,
          fontFamily: brand.fonts.title,
          fontSize: 38,
          lineHeight: "34px",
          transform: "rotate(10deg)",
        }}
      >
        ✦
      </div>
      <div
        style={{
          position: "absolute",
          right: 36,
          top: 42,
          display: "flex",
          gap: 8,
          opacity: 0.42,
        }}
      >
        {[9, 6, 9].map((size, index) => (
          <span
            key={index}
            style={{
              width: size,
              height: size,
              borderRadius: "50%",
              background: brand.colors.teal,
            }}
          />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: 35,
          bottom: 35,
          width: 38,
          height: 24,
          border: `6px solid ${brand.colors.teal}`,
          borderBottom: 0,
          borderRadius: "38px 38px 0 0",
          opacity: 0.4,
          transform: "rotate(-12deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 38,
          bottom: 30,
          color: brand.colors.teal,
          fontFamily: brand.fonts.body,
          fontSize: 38,
          lineHeight: 1,
          opacity: 0.4,
          transform: "rotate(12deg)",
        }}
      >
        ‚‚
      </div>
    </>
  );
}

export function KidsCard({
  children,
  brand,
  accent,
  rotation,
  padding = "74px 70px",
}: {
  children: React.ReactNode;
  brand: BrandConfig;
  accent: KidsAccent;
  rotation: number;
  padding?: string;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: 920,
        boxSizing: "border-box",
        padding,
        overflow: "hidden",
        border: `9px solid ${brand.colors.teal}`,
        borderRadius: 60,
        background: brand.colors.cream,
        boxShadow: `0 14px 0 rgba(46,125,108,0.22)`,
        color: brand.colors.night,
        transform: `rotate(${rotation}deg)`,
      }}
    >
      <KidsDecorations brand={brand} accent={accent} />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

export function OrganicHighlight({
  children,
  brand,
}: {
  children: React.ReactNode;
  brand: BrandConfig;
}) {
  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        maxWidth: "100%",
        padding: "16px 28px 20px 35px",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "10px 3px 4px -7px",
          borderRadius: "44% 56% 47% 53% / 58% 43% 57% 42%",
          background: brand.colors.gold,
          opacity: 0.18,
          transform: "rotate(-1.4deg)",
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

export function arabicFontSize(text: string) {
  const glyphCount = text.replace(/\p{Mark}|\s|·/gu, "").length;
  return Math.round(Math.max(88, Math.min(188, 235 - glyphCount * 5.4)));
}
