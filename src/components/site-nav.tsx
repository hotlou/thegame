import Link from "next/link";
import { auth } from "@/auth";
import { getCurrentEvent } from "@/lib/events";

export async function SiteNav() {
  const [session, event] = await Promise.all([safeAuth(), getCurrentEvent()]);
  const eventHref = event ? `/events/${event.slug}` : "/";

  return (
    <nav className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
      <Link href={eventHref} className="text-xl font-bold tracking-normal">
        TheGame
      </Link>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {event && <Link href={`/events/${event.slug}/leaderboard`}>Leaderboard</Link>}
        {event && <Link href={`/events/${event.slug}/entry`}>My entry</Link>}
        {session?.user?.role === "ADMIN" && <Link href="/admin">Admin</Link>}
        {session?.user ? (
          <span className="rounded-full bg-white px-3 py-1 text-[var(--muted)]">{session.user.email}</span>
        ) : (
          <Link href="/sign-in" className="rounded-md bg-[var(--accent)] px-3 py-2 font-semibold text-white">
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}

async function safeAuth() {
  try {
    return await auth();
  } catch (error) {
    if (
      process.env.NODE_ENV === "development" &&
      (!process.env.DATABASE_URL || isMissingSecretError(error))
    ) {
      return null;
    }
    throw error;
  }
}

function isMissingSecretError(error: unknown) {
  return error instanceof Error && error.message.includes("Please define a `secret`");
}
