"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Gamepad2, Gift, Home, Wallet } from "lucide-react";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/scan", label: "Scan", icon: Camera },
  { href: "/play", label: "Play", icon: Gamepad2 },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/rewards", label: "Prizes", icon: Gift },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="bottom-nav" aria-label="Quest navigation">
      {links.map((link) => {
        const isActive =
          link.href === "/"
            ? pathname === "/"
            : pathname?.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={isActive ? "is-active" : ""}
          >
            <Icon aria-hidden className="h-5 w-5" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
