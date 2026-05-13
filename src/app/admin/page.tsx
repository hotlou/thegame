import { Card } from "@/components/ui";
import { AdminEventSwitcher } from "@/components/admin-event-switcher";
import { getAdminEvent, getAllEvents } from "@/lib/events";
import { getPrisma } from "@/lib/prisma";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const [{ event: eventSlug }, events] = await Promise.all([searchParams, getAllEvents()]);
  const event = await getAdminEvent(eventSlug);
  if (!event) {
    return (
      <Card>
        <p className="tg-body">
          No event exists yet. Run <code style={{ fontFamily: "var(--font-mono)" }}>npm run db:seed</code> to create the
          starter event.
        </p>
      </Card>
    );
  }

  const [teams, games, entries, scoredGames] = await Promise.all([
    getPrisma().team.count({ where: { eventId: event.id } }),
    getPrisma().game.count({ where: { eventId: event.id } }),
    getPrisma().entry.count({ where: { eventId: event.id } }),
    getPrisma().game.count({ where: { eventId: event.id, status: "FINAL" } }),
  ]);

  return (
    <div>
      <AdminEventSwitcher events={events} currentSlug={event.slug} basePath="/admin" />
      <div className="tg-eyebrow">
        <h2>The Console</h2>
        <span className="meta">{event.slug}</span>
      </div>

      <h1 className="tg-h-hero" style={{ marginTop: 4 }}>{event.name}</h1>

      <div className="tg-grid tg-grid--3" style={{ marginTop: 24, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <Stat label="Teams" value={teams} />
        <Stat label="Games" value={games} />
        <Stat label="Final games" value={scoredGames} />
        <Stat label="Entries" value={entries} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--muted)",
        }}
      >
        {label}
      </p>
      <p className="tg-h1" style={{ marginTop: 8, fontFamily: "var(--font-mono)", letterSpacing: "-0.02em" }}>
        {value}
      </p>
    </Card>
  );
}
