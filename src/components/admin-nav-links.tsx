"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

export function AdminNavLinks({ links }: { links: Array<[string, string]> }) {
  const pathname = usePathname() ?? "";
  return (
    <nav className="tg-nav">
      {links.map(([href, label]) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/");
        return (
          <Link key={href} href={href} className={clsx("tg-link", active && "tg-link--active")}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
