"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

export function NavLinks({
  eventHref,
  isAdmin,
  userEmail,
}: {
  eventHref: string | null;
  isAdmin: boolean;
  userEmail: string | null;
}) {
  const pathname = usePathname() ?? "";

  const linkClass = (href: string, exact?: boolean) =>
    clsx("tg-link", isActive(pathname, href, exact) && "tg-link--active");

  return (
    <nav className="tg-nav">
      <Link href="/" className={linkClass("/", true)}>
        Events
      </Link>
      {eventHref && (
        <Link href={eventHref} className={linkClass(eventHref, true)}>
          Event
        </Link>
      )}
      {eventHref && (
        <Link href={`${eventHref}/leaderboard`} className={linkClass(`${eventHref}/leaderboard`)}>
          Leaderboard
        </Link>
      )}
      {eventHref && (
        <Link href={`${eventHref}/entry`} className={linkClass(`${eventHref}/entry`)}>
          My Entry
        </Link>
      )}
      {isAdmin && (
        <Link href="/admin" className={linkClass("/admin")}>
          Admin
        </Link>
      )}
      <div className="tg-nav-right">
        {userEmail ? (
          <span className="tg-pill">{userEmail}</span>
        ) : (
          <Link href="/sign-in" className="tg-btn tg-btn--sm">
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}

function isActive(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}
