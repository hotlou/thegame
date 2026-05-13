import { Card, Select, SubmitButton, TextInput } from "@/components/ui";
import { AdminEventSwitcher } from "@/components/admin-event-switcher";
import { getAdminEvent, getAllEvents } from "@/lib/events";
import { getPrisma } from "@/lib/prisma";
import { upsertTeamAction } from "@/lib/admin-actions";

export default async function TeamsPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const [{ event: eventSlug }, events] = await Promise.all([searchParams, getAllEvents()]);
  const event = await getAdminEvent(eventSlug);
  if (!event)
    return (
      <Card>
        <p className="tg-body">No event found.</p>
      </Card>
    );

  const divisions = await getPrisma().division.findMany({
    where: { eventId: event.id },
    orderBy: { sortOrder: "asc" },
  });
  const teams = await getPrisma().team.findMany({
    where: { eventId: event.id },
    include: { division: true },
    orderBy: [{ division: { sortOrder: "asc" } }, { seed: "asc" }],
  });

  return (
    <>
      <AdminEventSwitcher events={events} currentSlug={event.slug} basePath="/admin/teams" />
      <div className="tg-eyebrow">
        <h2>Teams</h2>
        <span className="meta">{teams.length} on roster</span>
      </div>

      <div
        className="tg-grid"
        style={{ gridTemplateColumns: "minmax(280px, 0.6fr) minmax(0, 1.4fr)", gap: 20 }}
      >
        <Card>
          <h1 className="tg-h2">Add team</h1>
          <form action={upsertTeamAction} style={{ display: "grid", gap: 12, marginTop: 16 }}>
            <input type="hidden" name="eventId" value={event.id} />
            <label className="tg-label">
              Division
              <Select name="divisionId" required style={{ marginTop: 6 }}>
                <option value="">Choose division</option>
                {divisions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="tg-label">
              Name
              <TextInput name="name" required style={{ marginTop: 6 }} />
            </label>
            <label className="tg-label">
              Seed
              <TextInput name="seed" type="number" min={1} max={20} required style={{ marginTop: 6 }} />
            </label>
            <label className="tg-label">
              Pool
              <TextInput name="pool" style={{ marginTop: 6 }} />
            </label>
            <label className="tg-label">
              Pool rank
              <TextInput name="poolRank" type="number" min={1} max={4} style={{ marginTop: 6 }} />
            </label>
            <div>
              <SubmitButton>Add team</SubmitButton>
            </div>
          </form>
        </Card>

        <Card>
          <h1 className="tg-h2">Roster</h1>
          <div style={{ marginTop: 16, overflowX: "auto" }}>
            <table className="tg-table" style={{ minWidth: 760 }}>
              <thead>
                <tr>
                  <th>Division</th>
                  <th>Seed</th>
                  <th>Name</th>
                  <th>Pool</th>
                  <th>Pool rank</th>
                  <th>Save</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.id}>
                    <td>{team.division.name}</td>
                    <td className="rank-cell">{team.seed}</td>
                    <td>
                      <form id={`team-${team.id}`} action={upsertTeamAction} className="contents">
                        <input type="hidden" name="eventId" value={event.id} />
                        <input type="hidden" name="teamId" value={team.id} />
                        <input type="hidden" name="divisionId" value={team.divisionId} />
                        <input type="hidden" name="seed" value={team.seed} />
                        <TextInput name="name" defaultValue={team.name} />
                      </form>
                    </td>
                    <td>
                      <TextInput form={`team-${team.id}`} name="pool" defaultValue={team.pool ?? ""} />
                    </td>
                    <td>
                      <TextInput
                        form={`team-${team.id}`}
                        name="poolRank"
                        type="number"
                        min={1}
                        max={4}
                        defaultValue={team.poolRank ?? ""}
                      />
                    </td>
                    <td>
                      <button form={`team-${team.id}`} className="tg-btn tg-btn--sm tg-btn--alt">
                        Save
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
