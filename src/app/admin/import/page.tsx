import { Card } from "@/components/ui";
import { AdminEventSwitcher } from "@/components/admin-event-switcher";
import { ImportTool } from "@/components/import-tool";
import { getAdminEvent, getAllEvents } from "@/lib/events";
import { getPrisma } from "@/lib/prisma";

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const [{ event: eventSlug }, events] = await Promise.all([searchParams, getAllEvents()]);
  const event = await getAdminEvent(eventSlug);
  const importEvents = await getPrisma().event.findMany({
    include: {
      _count: { select: { entries: true } },
      divisions: {
        include: {
          _count: { select: { teams: true, games: true } },
          importSources: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
  });
  const importToolEvents = importEvents.map((eventOption) => ({
    id: eventOption.id,
    name: eventOption.name,
    slug: eventOption.slug,
    entryCount: eventOption._count.entries,
    divisions: eventOption.divisions.map((division) => ({
      id: division.id,
      name: division.name,
      slug: division.slug,
      gender: division.gender,
      teamCount: division._count.teams,
      gameCount: division._count.games,
      sourceUrls: [
        ...new Set([
          ...division.importSources.map((source) => source.sourceUrl),
          ...(division.usauUrl ? [division.usauUrl] : []),
        ]),
      ],
    })),
  }));

  return (
    <>
      {event && <AdminEventSwitcher events={events} currentSlug={event.slug} basePath="/admin/import" />}
      <div className="tg-eyebrow">
        <h2>USAU Import</h2>
        <span className="meta">{event ? event.name : "No event selected"}</span>
      </div>
      <Card>
        <h1 className="tg-h2">USAU guided import</h1>
        <p className="tg-body-sm tg-muted" style={{ marginTop: 8 }}>
          Paste a USAU schedule page, review what was parsed, then choose exactly which event and division should own
          the source.
        </p>
        <div style={{ marginTop: 20 }}>
          <ImportTool events={importToolEvents} currentEventId={event?.id ?? ""} />
        </div>
      </Card>
    </>
  );
}
