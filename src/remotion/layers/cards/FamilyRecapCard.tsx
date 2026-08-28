import { interpolate } from "remotion";
import type { BrandConfig, FamilyRecapContent } from "@/lib/types";

export function FamilyRecapCard({
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
