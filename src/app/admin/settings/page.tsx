import { Card, SubmitButton, TextInput } from "@/components/ui";
import { AdminEventSwitcher } from "@/components/admin-event-switcher";
import { getAdminEvent, getAllEvents } from "@/lib/events";
import { createEventAction, updateEventSettingsAction } from "@/lib/admin-actions";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const [{ event: eventSlug }, events] = await Promise.all([searchParams, getAllEvents()]);
  const event = await getAdminEvent(eventSlug);
  if (!event)
    return (
      <CreateEventCard />
    );

  return (
    <>
      <AdminEventSwitcher events={events} currentSlug={event.slug} basePath="/admin/settings" />
      <div className="tg-eyebrow">
        <h2>Event Settings</h2>
        <span className="meta">{event.slug}</span>
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
              Entry lock
              <TextInput
                name="entryLockAt"
                type="datetime-local"
                defaultValue={toDateTimeLocal(event.entryLockAt)}
                style={{ marginTop: 6 }}
              />
            </label>
            <label className="tg-label">
              Picks visible at
              <TextInput
                name="picksVisibleAt"
                type="datetime-local"
                defaultValue={toDateTimeLocal(event.picksVisibleAt)}
                style={{ marginTop: 6 }}
              />
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

function toDateTimeLocal(date: Date | null) {
  if (!date) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
