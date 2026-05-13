"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { clsx } from "clsx";

export function AdminNavLinks({ links }: { links: Array<[string, string]> }) {
  const pathname = usePathname() ?? "";
  const selectedEvent = useSearchParams().get("event");
  return (
    <nav className="tg-nav">
      {links.map(([href, label]) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/");
        const resolvedHref = selectedEvent ? `${href}?event=${encodeURIComponent(selectedEvent)}` : href;
        return (
          <Link key={href} href={resolvedHref} className={clsx("tg-link", active && "tg-link--active")}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
