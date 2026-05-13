import { ButtonLink, Card, PageShell, Pill } from "@/components/ui";
import { SiteNav } from "@/components/site-nav";
import { entryIsLocked, getAllEvents, picksAreVisible } from "@/lib/events";
import { formatDateInZone, formatDateTimeInZone } from "@/lib/time-zone";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const events = await getAllEvents();

  return (
    <PageShell>
      <SiteNav />
      {events.length === 0 ? (
        <Card>
          <h1 className="tg-h1">TheGame is ready for setup.</h1>
          <p className="tg-body tg-muted" style={{ marginTop: 12 }}>
            Run the seed script or create an event in the admin console to begin configuring events.
          </p>
        </Card>
      ) : (
        <>
          <div className="tg-eyebrow">
            <h2>Events</h2>
            <span className="meta">{events.length} available</span>
          </div>
          <h1 className="tg-h-hero" style={{ marginTop: 4 }}>
            Choose your event
          </h1>
          <section className="tg-grid tg-grid--2" style={{ marginTop: 24 }}>
            {events.map((event) => {
              const locked = entryIsLocked(event);
              const visible = picksAreVisible(event);
              return (
                <Card key={event.id}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <Pill tone={locked ? "red" : "accent"}>{locked ? "Entries locked" : "Entries open"}</Pill>
                    <Pill>{visible ? "Picks visible" : "Picks hidden"}</Pill>
                  </div>
                  <h2 className="tg-h2" style={{ marginTop: 12 }}>
                    {event.name}
                  </h2>
                  <p className="tg-body-sm tg-muted" style={{ marginTop: 6 }}>
                    {event.startsAt ? `Starts ${formatDateInZone(event.startsAt, event.timeZone)}` : "Start time TBD"}
                    {event.entryLockAt ? ` · Locks ${formatDateTimeInZone(event.entryLockAt, event.timeZone)}` : ""}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
                    <ButtonLink href={`/events/${event.slug}`}>Event</ButtonLink>
                    <ButtonLink href={`/events/${event.slug}/leaderboard`} variant="alt">
                      Leaderboard
                    </ButtonLink>
                  </div>
                </Card>
              );
            })}
          </section>
        </>
      )}
    </PageShell>
  );
}
