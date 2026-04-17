import Link from "next/link";
import Image from "next/image";

interface LogoProps {
  href?: string;
  showText?: boolean;
  size?: number;
  className?: string;
}

export function Logo({ href = "/", showText = true, size = 36, className = "" }: LogoProps) {
  const img = (
    <Image
      src="/logo.svg"
      alt="Geothority"
      width={size}
      height={size}
      sizes={`${size}px`}
      className="object-contain rounded-lg"
      priority
      quality={100}
    />
  );

  const inner = (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      {img}
      {showText && (
        <span className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
          Geothority
        </span>
      )}
    </span>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}
