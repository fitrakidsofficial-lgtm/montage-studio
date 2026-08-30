import { Img } from "remotion";
import type { BrandConfig } from "@/lib/types";

interface Props {
  brand: BrandConfig;
  x?: number;
  y?: number;
  size?: number;
}

export function LogoLayer({ brand, x = 28, y = 28, size = 180 }: Props) {
  if (!brand.logoUrl) return null;

  return (
    <Img
      src={brand.logoUrl}
      style={{
        position: "absolute",
        width: size,
        height: "auto",
        objectFit: "contain",
        right: x,
        bottom: y,
      }}
    />
  );
}
