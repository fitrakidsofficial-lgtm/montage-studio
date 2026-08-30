import type { BrandConfig, VerseContent } from "@/lib/types";

export function VerseCard({
  content,
  brand,
}: {
  content: VerseContent;
  brand: BrandConfig;
}) {
  return (
    <>
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
      <div
        dir="rtl"
        style={{
          maxWidth: 740,
          fontFamily: brand.fonts.arabic,
          color: brand.colors.cream,
          fontSize: 72,
          lineHeight: 1.7,
          textAlign: "center",
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
            color: brand.colors.cream,
            marginTop: 18,
            textAlign: "center",
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
          background: brand.colors.gold,
          opacity: 0.5,
        }}
      />
      <div
        style={{
          fontFamily: brand.fonts.body,
          color: brand.colors.cream,
          fontSize: 40,
          lineHeight: 1.4,
          textAlign: "center",
          textShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}
      >
        {content.translation}
      </div>
    </>
  );
}
