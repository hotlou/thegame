import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { getCurrentEvent, getEventBySlug } from "@/lib/events";
import { NavLinks } from "./nav-links";

export async function SiteNav({ eventSlug }: { eventSlug?: string } = {}) {
  const [session, event] = await Promise.all([safeAuth(), eventSlug ? getEventBySlug(eventSlug) : getCurrentEvent()]);
  const eventHref = event ? `/events/${event.slug}` : "/";

  return (
    <>
      <div className="tg-masthead-top">
        <span>
          <Link href="/contact">Contact</Link>
        </span>
        <span>
          <Link href="/about">About</Link>
          <a href="https://discord.gg/ultiworld" target="_blank" rel="noreferrer">
            Discord
          </a>
          <a href="https://ultiworld.com" target="_blank" rel="noreferrer">
            Ultiworld &#8599;
          </a>
        </span>
      </div>

      <Link href={eventHref} className="tg-masthead">
        <Image
          src="/brand/ultiworld-logo.png"
          alt="Ultiworld"
          width={200}
          height={200}
          priority
          className="uw-logo"
        />
        <div className="lockup">
          <div className="brand-mark">
            The<span className="red">Game</span>
          </div>
          <div className="presented-by">
            Presented by <span className="uw-name">Ultiworld</span>
          </div>
        </div>
      </Link>

      <NavLinks
        eventHref={event ? eventHref : null}
        isAdmin={session?.user?.role === "ADMIN"}
        userEmail={session?.user?.email ?? null}
      />
    </>
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
