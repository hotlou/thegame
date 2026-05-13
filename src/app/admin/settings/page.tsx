import { Card, Select, SubmitButton, TextInput } from "@/components/ui";
import { AdminEventSwitcher } from "@/components/admin-event-switcher";
import { getAdminEvent, getAllEvents } from "@/lib/events";
import { createEventAction, replaceDivisionFromSourceAction, updateEventSettingsAction } from "@/lib/admin-actions";
import { getPrisma } from "@/lib/prisma";
import { formatDateTimeInZone, formatDateTimeLocalInZone, timeZoneOptions } from "@/lib/time-zone";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const [{ event: eventSlug }, events] = await Promise.all([searchParams, getAllEvents()]);
  const event = await getAdminEvent(eventSlug);
  if (!event)
    return (
      <CreateEventCard />
    );
  const divisions = await getPrisma().division.findMany({
    where: { eventId: event.id },
    include: {
      _count: { select: { teams: true, games: true } },
      importSources: { orderBy: [{ isActive: "desc" }, { createdAt: "asc" }] },
    },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <>
      <AdminEventSwitcher events={events} currentSlug={event.slug} basePath="/admin/settings" />
      <div className="tg-eyebrow">
        <h2>Event Settings</h2>
        <span className="meta">{event.name}</span>
      </div>
      <div className="tg-grid tg-grid--2" style={{ alignItems: "start" }}>
        <Card>
          <h1 className="tg-h2">Event settings</h1>
          <form action={updateEventSettingsAction} style={{ display: "grid", gap: 16, marginTop: 20 }}>
            <input type="hidden" name="eventId" value={event.id} />
            <label className="tg-label">
              Name
              <TextInput name="name" defaultValue={event.name} required style={{ marginTop: 6 }} />
            </label>
            <label className="tg-label">
              Slug
              <TextInput name="slug" defaultValue={event.slug} required style={{ marginTop: 6 }} />
            </label>
            <label className="tg-label">
              Time zone
              <Select name="timeZone" defaultValue={event.timeZone} style={{ marginTop: 6 }}>
                {timeZoneOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.value})
                  </option>
                ))}
              </Select>
            </label>
            <label className="tg-label">
              Entry lock
              <TextInput
                name="entryLockAt"
                type="datetime-local"
                defaultValue={formatDateTimeLocalInZone(event.entryLockAt, event.timeZone)}
                style={{ marginTop: 6 }}
              />
              <span className="tg-body-sm tg-muted" style={{ display: "block", marginTop: 4 }}>
                Interpreted in {event.timeZone}
              </span>
            </label>
            <label className="tg-label">
              Picks visible at
              <TextInput
                name="picksVisibleAt"
                type="datetime-local"
                defaultValue={formatDateTimeLocalInZone(event.picksVisibleAt, event.timeZone)}
                style={{ marginTop: 6 }}
              />
              <span className="tg-body-sm tg-muted" style={{ display: "block", marginTop: 4 }}>
                Interpreted in {event.timeZone}
              </span>
            </label>
            <label className="tg-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" name="isLocked" value="true" defaultChecked={event.isLocked} />
              Lock entries now
            </label>
            <div>
              <SubmitButton>Save settings</SubmitButton>
            </div>
          </form>
        </Card>
        <CreateEventCard />
      </div>
      <Card style={{ marginTop: 20 }}>
        <h1 className="tg-h2">Divisions and import sources</h1>
        <p className="tg-body-sm tg-muted" style={{ marginTop: 8 }}>
          These are the USAU URLs currently tied to this event. Result imports should use these division targets.
        </p>
        <div style={{ marginTop: 16, overflowX: "auto" }}>
          <table className="tg-table" style={{ minWidth: 860 }}>
            <thead>
              <tr>
                <th>Division</th>
                <th>Category</th>
                <th>Teams</th>
                <th>Games</th>
                <th>Sources</th>
                <th>Last import</th>
                <th>Replace</th>
              </tr>
            </thead>
            <tbody>
              {divisions.map((division) => {
                const sources = division.importSources.length
                  ? division.importSources
                  : division.usauUrl
                    ? [
                        {
                          id: `legacy-${division.id}`,
                          sourceUrl: division.usauUrl,
                          sourceTitle: division.name,
                          provider: "USAU",
                          isActive: true,
                          lastImportedAt: null,
                        },
                      ]
                    : [];
                return (
                  <tr key={division.id}>
                    <td>
                      <strong>{division.name}</strong>
                      <div className="tg-body-sm tg-muted">{division.slug}</div>
                    </td>
                    <td>{division.gender}</td>
                    <td>{division._count.teams}</td>
                    <td>{division._count.games}</td>
                    <td>
                      {sources.length === 0 ? (
                        <span className="tg-muted">No source URL</span>
                      ) : (
                        <div style={{ display: "grid", gap: 6 }}>
                          {sources.map((source) => (
                            <a
                              key={source.id}
                              className="tg-inline-link"
                              href={source.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontFamily: "var(--font-mono)", overflowWrap: "anywhere" }}
                            >
                              {source.sourceUrl}
                            </a>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      {sources
                        .map((source) => source.lastImportedAt)
                        .filter(Boolean)
                        .map((date) => formatDateTimeInZone(date, event.timeZone))
                        .join(", ") || "Never"}
                    </td>
                    <td>
                      {sources.length === 0 ? (
                        <span className="tg-muted">No source</span>
                      ) : (
                        <form action={replaceDivisionFromSourceAction} style={{ display: "grid", gap: 8 }}>
                          <input type="hidden" name="eventId" value={event.id} />
                          <input type="hidden" name="divisionId" value={division.id} />
                          <label
                            className="tg-body-sm tg-muted"
                            style={{ display: "flex", alignItems: "center", gap: 6 }}
                          >
                            <input type="checkbox" name="clearAffectedEntries" value="true" />
                            Clear affected entries
                          </label>
                          <button type="submit" className="tg-btn tg-btn--sm tg-btn--alt">
                            Replace
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
              {divisions.length === 0 && (
                <tr>
                  <td colSpan={7} className="tg-muted">
                    No divisions have been imported for this event yet.
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

function CreateEventCard() {
  return (
    <Card>
      <h1 className="tg-h2">Create event</h1>
      <p className="tg-body-sm tg-muted" style={{ marginTop: 8 }}>
        Entry lock defaults to the start time when left blank.
      </p>
      <form action={createEventAction} style={{ display: "grid", gap: 16, marginTop: 20 }}>
        <label className="tg-label">
          Name
          <TextInput name="name" required style={{ marginTop: 6 }} />
        </label>
        <label className="tg-label">
          Slug
          <TextInput name="slug" required pattern="[a-z0-9-]+" style={{ marginTop: 6 }} />
        </label>
        <label className="tg-label">
          Time zone
          <Select name="timeZone" defaultValue="America/Chicago" style={{ marginTop: 6 }}>
            {timeZoneOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.value})
              </option>
            ))}
          </Select>
        </label>
        <label className="tg-label">
          Starts at
          <TextInput name="startsAt" type="datetime-local" style={{ marginTop: 6 }} />
        </label>
        <label className="tg-label">
          Entry lock
          <TextInput name="entryLockAt" type="datetime-local" style={{ marginTop: 6 }} />
        </label>
        <label className="tg-label">
          Picks visible at
          <TextInput name="picksVisibleAt" type="datetime-local" style={{ marginTop: 6 }} />
        </label>
        <div>
          <SubmitButton>Create event</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
