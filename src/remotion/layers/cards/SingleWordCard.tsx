import type { BrandConfig, SingleWordContent } from "@/lib/types";
import { arabicFontSize } from "./shared";

export function SingleWordCard({
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
        <div
          dir="rtl"
          style={{
            maxWidth: 760,
            fontFamily: brand.fonts.arabic,
            fontSize: arabicFontSize(content.arabic),
            fontWeight: 700,
            lineHeight: 1.45,
            color: brand.colors.cream,
            textShadow: "0 0 40px rgba(242,138,75,0.3)",
          }}
        >
          {content.arabic}
        </div>
      </div>
      {content.translation && (
        <div
          style={{
            fontFamily: brand.fonts.body,
            color: brand.colors.cream,
            fontSize: 62,
            lineHeight: 1.18,
            marginTop: 34,
            textAlign: "center",
            textShadow: "0 4px 20px rgba(0,0,0,0.4)",
          }}
        >
          {content.translation}
        </div>
      )}
    </>
  );
}
