import { Card, ButtonLink } from "@/components/ui";
import { AdminEventSwitcher } from "@/components/admin-event-switcher";
import { getAdminEvent, getAllEvents } from "@/lib/events";

export default async function ExportsPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const [{ event: eventSlug }, events] = await Promise.all([searchParams, getAllEvents()]);
  const event = await getAdminEvent(eventSlug);
  if (!event)
    return (
      <Card>
        <p className="tg-body">No event found.</p>
      </Card>
    );

  return (
    <>
      <AdminEventSwitcher events={events} currentSlug={event.slug} basePath="/admin/exports" />
      <div className="tg-eyebrow">
        <h2>Exports</h2>
        <span className="meta">{event.slug}</span>
      </div>
      <Card>
        <h1 className="tg-h2">Exports</h1>
        <p className="tg-body-sm tg-muted" style={{ marginTop: 8 }}>
          Download current entry and leaderboard data as CSV.
        </p>
        <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 12 }}>
          <ButtonLink href={`/api/admin/export/entries?event=${event.slug}`}>Entries CSV</ButtonLink>
          <ButtonLink href={`/api/admin/export/leaderboard?event=${event.slug}`} variant="alt">
            Leaderboard CSV
          </ButtonLink>
        </div>
      </Card>
    </>
  );
}
