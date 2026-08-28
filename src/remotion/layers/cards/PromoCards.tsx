import type {
  BrandConfig,
  PriceTagContent,
  FeatureListContent,
  CtaContent,
} from "@/lib/types";
import { KidsCard, CARD_ROTATIONS } from "./shared";

export function PriceTagCard({
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

export function FeatureListCard({
  content,
  brand,
}: {
  content: FeatureListContent;
  brand: BrandConfig;
}) {
  return (
    <KidsCard
      brand={brand}
      accent="orange"
      rotation={CARD_ROTATIONS["feature-list"] ?? 0}
      padding="78px 64px 82px"
    >
      <div
        style={{
          fontFamily: brand.fonts.title,
          color: brand.colors.orange,
          fontSize: 52,
          lineHeight: 1.12,
          letterSpacing: 2,
          marginBottom: 42,
        }}
      >
        {content.title}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
          alignItems: "flex-start",
        }}
      >
        {content.features.map((f) => (
          <div
            key={f}
            style={{
              fontFamily: brand.fonts.body,
              width: "100%",
              boxSizing: "border-box",
              padding: "15px 24px",
              border: `5px solid ${brand.colors.teal}`,
              borderRadius: 34,
              fontSize: 48,
              lineHeight: 1.15,
              color: brand.colors.night,
              display: "flex",
              alignItems: "center",
              gap: 20,
              textAlign: "left",
            }}
          >
            <span
              style={{
                width: 30,
                height: 30,
                flex: "0 0 30px",
                borderRadius: "50%",
                background: brand.colors.teal,
                boxShadow: `inset 0 0 0 8px ${brand.colors.cream}`,
              }}
            >
              &nbsp;
            </span>
            {f}
          </div>
        ))}
      </div>
    </KidsCard>
  );
}

export function CtaCard({
  content,
  brand,
}: {
  content: CtaContent;
  brand: BrandConfig;
}) {
  return (
    <KidsCard
      brand={brand}
      accent="orange"
      rotation={CARD_ROTATIONS.cta ?? 0}
      padding="88px 62px 82px"
    >
      <div
        style={{
          padding: "30px 34px 24px",
          borderRadius: 44,
          background: brand.colors.orange,
          fontFamily: brand.fonts.title,
          color: brand.colors.night,
          fontSize: 88,
          lineHeight: 1.12,
          letterSpacing: 1,
        }}
      >
        {content.mainText}
      </div>
      <div
        style={{
          fontFamily: brand.fonts.body,
          fontSize: 50,
          lineHeight: 1.25,
          marginTop: 38,
          color: brand.colors.night,
        }}
      >
        {content.subText}
      </div>
    </KidsCard>
  );
}
