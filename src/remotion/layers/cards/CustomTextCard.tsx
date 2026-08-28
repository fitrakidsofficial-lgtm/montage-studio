import type { BrandConfig, CustomTextContent } from "@/lib/types";
import { KidsCard, CARD_ROTATIONS, type KidsAccent } from "./shared";

export function CustomTextCard({
  content,
  brand,
}: {
  content: CustomTextContent;
  brand: BrandConfig;
}) {
  const colorMap: Record<string, string> = {
    cream: brand.colors.night,
    gold: brand.colors.gold,
    orange: brand.colors.orange,
    teal: brand.colors.teal,
  };
  const isQuiz =
    content.lines.length === 4 &&
    content.lines
      .slice(1)
      .every((line, index) =>
        new RegExp(`^\\s*${index + 1}\\s*[·.)-]`).test(line.text),
      );
  const accent: KidsAccent = content.lines.some(
    (line) => line.color === "orange",
  )
    ? "orange"
    : "gold";

  if (isQuiz) {
    const [question, ...options] = content.lines;
    return (
      <KidsCard
        brand={brand}
        accent="orange"
        rotation={CARD_ROTATIONS["custom-text"] ?? 0}
        padding="76px 58px 78px"
      >
        <div
          style={{
            fontFamily: brand.fonts.title,
            fontSize: Math.max(48, question.fontSize),
            lineHeight: 1.15,
            color: brand.colors.teal,
            marginBottom: 36,
          }}
        >
          {question.text}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {options.map((line, index) => (
            <div
              key={index}
              style={{
                minHeight: 92,
                boxSizing: "border-box",
                padding: "13px 24px 13px 16px",
                border: `6px solid ${brand.colors.teal}`,
                borderRadius: 42,
                background: brand.colors.cream,
                display: "flex",
                alignItems: "center",
                gap: 20,
                textAlign: "left",
              }}
            >
              <span
                style={{
                  width: 62,
                  height: 62,
                  flex: "0 0 62px",
                  borderRadius: "50%",
                  background: brand.colors.teal,
                  color: brand.colors.cream,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: brand.fonts.title,
                  fontSize: 42,
                  lineHeight: 1,
                  paddingTop: 3,
                  boxSizing: "border-box",
                }}
              >
                {index + 1}
              </span>
              <span
                style={{
                  fontFamily: brand.fonts.body,
                  fontSize: Math.max(44, line.fontSize),
                  lineHeight: 1.12,
                  color: brand.colors.night,
                }}
              >
                {line.text.replace(/^\s*\d\s*[·.)-]\s*/, "")}
              </span>
            </div>
          ))}
        </div>
      </KidsCard>
    );
  }

  return (
    <KidsCard
      brand={brand}
      accent={accent}
      rotation={CARD_ROTATIONS["custom-text"] ?? 0}
      padding="78px 66px 82px"
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
        }}
      >
        {content.lines.map((line, i) => (
          <div
            key={i}
            style={{
              fontFamily: i === 0 ? brand.fonts.title : brand.fonts.body,
              fontSize: Math.max(40, line.fontSize),
              lineHeight: 1.18,
              color: colorMap[line.color],
            }}
          >
            {line.text}
          </div>
        ))}
      </div>
    </KidsCard>
  );
}
