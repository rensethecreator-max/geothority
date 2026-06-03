import Link from "next/link";
import Image from "next/image";

interface LogoProps {
  href?: string;
  showText?: boolean;
  size?: number;
  className?: string;
}

export function Logo({ href = "/", showText = true, size = 36, className = "" }: LogoProps) {
  const width = showText ? Math.round(size * 4.3) : size;
  const img = (
    <Image
      src={showText ? "/logo.svg" : "/logo-mark.svg"}
      alt="Geothority"
      width={width}
      height={size}
      sizes={`${width}px`}
      className="object-contain"
      priority
      quality={100}
    />
  );

  const inner = (
    <span className={`inline-flex items-center ${className}`}>
      {img}
    </span>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}
