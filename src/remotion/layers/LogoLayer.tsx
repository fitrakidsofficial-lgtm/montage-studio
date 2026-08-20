import { Img } from "remotion";
import type { BrandConfig } from "@/lib/types";

interface Props {
  brand: BrandConfig;
}

export function LogoLayer({ brand }: Props) {
  if (!brand.logoUrl) return null;

  return (
    <Img
      src={brand.logoUrl}
      style={{
        position: "absolute",
        width: 180,
        height: "auto",
        objectFit: "contain",
        right: 28,
        bottom: 28,
      }}
    />
  );
}
