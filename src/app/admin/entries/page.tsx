import { Card } from "@/components/ui";
import { AdminEventSwitcher } from "@/components/admin-event-switcher";
import { getAdminEvent, getAllEvents } from "@/lib/events";
import { getPrisma } from "@/lib/prisma";

export default async function EntriesPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const [{ event: eventSlug }, events] = await Promise.all([searchParams, getAllEvents()]);
  const event = await getAdminEvent(eventSlug);
  if (!event)
    return (
      <Card>
        <p className="tg-body">No event found.</p>
      </Card>
    );
  const entries = await getPrisma().entry.findMany({
    where: { eventId: event.id },
    include: {
      user: true,
      score: true,
      picks: { include: { team: { include: { division: true } } }, orderBy: { slot: "asc" } },
    },
    orderBy: { submittedAt: "desc" },
  });

  return (
    <>
      <AdminEventSwitcher events={events} currentSlug={event.slug} basePath="/admin/entries" />
      <div className="tg-eyebrow">
        <h2>Entries</h2>
        <span className="meta">{entries.length} submitted</span>
      </div>
      <Card>
        <h1 className="tg-h2">Entries</h1>
        <div style={{ marginTop: 16, overflowX: "auto" }}>
          <table className="tg-table" style={{ minWidth: 860 }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Submitted</th>
                <th>Score</th>
                <th>Picks</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="tg-strong">{entry.displayName}</td>
                  <td className="tg-muted">{entry.user.email}</td>
                  <td>{entry.submittedAt.toLocaleString()}</td>
                  <td className="rank-cell">{entry.score?.totalPoints ?? 0}</td>
                  <td className="tg-muted">
                    {entry.picks.map((pick) => `${pick.slot}: ${formatPickTeam(pick.team)}`).join(", ")}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="tg-muted" style={{ textAlign: "center", padding: 24 }}>
                    No entries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function formatPickTeam(team: { name: string; division: { gender: string } }) {
  return `${team.division.gender === "MENS" ? "Men's" : "Women's"} ${team.name}`;
}
