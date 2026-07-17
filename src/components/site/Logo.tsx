import Image from "next/image";
import { existsSync } from "fs";
import { join } from "path";

/**
 * Brand lockup. Uses the real logo file when present at public/brand/logo.png
 * (drop the registered "Amity Arts®" artwork there); falls back to a styled
 * wordmark that follows the logo's black + gold language.
 */
const LOGO_PATH = join(process.cwd(), "public", "brand", "logo.png");
const hasLogoFile = existsSync(LOGO_PATH);

export function Logo({ className = "" }: { className?: string }) {
  if (hasLogoFile) {
    return (
      <Image
        src="/brand/logo.png"
        alt="Amity Arts India"
        width={280}
        height={141}
        priority
        className={`h-12 md:h-16 w-auto ${className}`}
      />
    );
  }
  return (
    <span className={`font-display font-semibold text-2xl tracking-wide text-ink-950 ${className}`}>
      Amity&nbsp;Arts
      <sup className="text-[10px] font-sans font-normal text-ink-500 ml-0.5">®</sup>
    </span>
  );
}
