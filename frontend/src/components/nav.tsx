"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const links = [
  { href: "/search", label: "Search" },
  { href: "/upload", label: "Upload" },
  { href: "/graph", label: "Graph" },
];

export function Nav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-rule bg-surface-elevated/95 backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex h-14 items-center justify-between px-5 lg:px-8">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-serif text-xl font-semibold tracking-tight text-ink">Synapse</span>
          <span className="hidden text-[0.65rem] font-medium uppercase tracking-[0.18em] text-ink-faint sm:inline">
            Research intelligence
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-ink-muted hover:bg-paper hover:text-ink",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
