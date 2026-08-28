import type { BrandConfig, SingleWordContent } from "@/lib/types";
import {
  KidsCard,
  OrganicHighlight,
  arabicFontSize,
  CARD_ROTATIONS,
} from "./shared";

export function SingleWordCard({
  content,
  brand,
}: {
  content: SingleWordContent;
  brand: BrandConfig;
}) {
  return (
    <KidsCard
      brand={brand}
      accent="gold"
      rotation={CARD_ROTATIONS["single-word"] ?? 0}
      padding="82px 58px 86px"
    >
      <div
        style={{
          display: "inline-block",
          padding: "11px 24px 8px",
          borderRadius: 28,
          background: brand.colors.gold,
          color: brand.colors.cream,
          fontFamily: brand.fonts.title,
          fontSize: 44,
          letterSpacing: 2.5,
          lineHeight: 1.1,
        }}
      >
        {content.label}
      </div>
      <div style={{ marginTop: 38 }}>
        <OrganicHighlight brand={brand}>
          <div
            dir="rtl"
            style={{
              maxWidth: 760,
              fontFamily: brand.fonts.arabic,
              fontSize: arabicFontSize(content.arabic),
              fontWeight: 400,
              lineHeight: 1.45,
              color: brand.colors.night,
            }}
          >
            {content.arabic}
          </div>
        </OrganicHighlight>
      </div>
      <div
        style={{
          fontFamily: brand.fonts.body,
          color: brand.colors.night,
          fontSize: 62,
          lineHeight: 1.18,
          marginTop: 34,
        }}
      >
        {content.translation}
      </div>
    </KidsCard>
  );
}
