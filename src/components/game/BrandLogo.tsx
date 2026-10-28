import Image from "next/image";
import { BRAND_ASSETS } from "@/lib/brandAssets";

interface BrandLogoProps {
  className?: string;
  priority?: boolean;
  
  logo?: "logo" | "productLogo";
}

export function BrandLogo({ className = "", priority = false, logo = "logo" }: BrandLogoProps) {
  const { src, alt, width, height } = BRAND_ASSETS[logo];
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      draggable={false}
      className={`w-auto select-none ${className}`}
    />
  );
}
