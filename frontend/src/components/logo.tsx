import Image from "next/image";
import Link from "next/link";

import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Show "Synapse" wordmark + tagline beside the mark */
  showWordmark?: boolean;
  /** Icon size in pixels */
  size?: number;
}

export function Logo({ className, showWordmark = true, size = 36 }: LogoProps) {
  return (
    <Link
      href="/"
      className={cn("group flex items-center gap-2.5 rounded-sm outline-offset-4", className)}
      aria-label={`${siteConfig.name} — home`}
    >
      <Image
        src="/logo.svg"
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-[10px] shadow-sm ring-1 ring-rule/40 transition-transform group-hover:scale-[1.02]"
        priority
      />
      {showWordmark && (
        <span className="flex min-w-0 flex-col leading-none">
          <span className="font-serif text-lg font-semibold tracking-tight text-ink sm:text-xl">
            {siteConfig.name}
          </span>
          <span className="mt-0.5 hidden text-[0.6rem] font-medium uppercase tracking-[0.16em] text-ink-faint sm:inline">
            {siteConfig.tagline}
          </span>
        </span>
      )}
    </Link>
  );
}
