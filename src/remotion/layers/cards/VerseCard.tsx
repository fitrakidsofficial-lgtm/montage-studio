import type { BrandConfig, VerseContent } from "@/lib/types";
import { KidsCard, OrganicHighlight, CARD_ROTATIONS } from "./shared";

export function VerseCard({
  content,
  brand,
}: {
  content: VerseContent;
  brand: BrandConfig;
}) {
  return (
    <KidsCard
      brand={brand}
      accent="gold"
      rotation={CARD_ROTATIONS.verse ?? 0}
      padding="72px 58px 76px"
    >
      <div
        style={{
          fontFamily: brand.fonts.title,
          color: brand.colors.cream,
          background: brand.colors.gold,
          display: "inline-block",
          padding: "10px 23px 8px",
          borderRadius: 28,
          fontSize: 40,
          letterSpacing: 2,
          lineHeight: 1.1,
          marginBottom: 34,
        }}
      >
        {content.surahLabel}
      </div>
      <OrganicHighlight brand={brand}>
        <div
          dir="rtl"
          style={{
            maxWidth: 740,
            fontFamily: brand.fonts.arabic,
            color: brand.colors.night,
            fontSize: 72,
            lineHeight: 1.7,
          }}
        >
          {content.arabic}
        </div>
      </OrganicHighlight>
      {content.salawat && (
        <div
          dir="rtl"
          style={{
            fontFamily: brand.fonts.arabic,
            fontSize: 55,
            color: brand.colors.night,
            marginTop: 18,
          }}
        >
          {content.salawat}
        </div>
      )}
      <div
        style={{
          width: 120,
          height: 7,
          margin: "30px auto 26px",
          borderRadius: 20,
          background: brand.colors.teal,
          opacity: 0.4,
        }}
      />
      <div
        style={{
          fontFamily: brand.fonts.body,
          color: brand.colors.night,
          fontSize: 40,
          lineHeight: 1.4,
        }}
      >
        {content.translation}
      </div>
    </KidsCard>
  );
}
