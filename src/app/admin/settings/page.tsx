import { Card, SubmitButton, TextInput } from "@/components/ui";
import { getCurrentEvent } from "@/lib/events";
import { updateEventSettingsAction } from "@/lib/admin-actions";

export default async function SettingsPage() {
  const event = await getCurrentEvent();
  if (!event)
    return (
      <Card>
        <p className="tg-body">No event found.</p>
      </Card>
    );

  return (
    <>
      <div className="tg-eyebrow">
        <h2>Event Settings</h2>
        <span className="meta">{event.slug}</span>
      </div>
      <Card style={{ maxWidth: 720 }}>
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
    </>
  );
}

function toDateTimeLocal(date: Date | null) {
  if (!date) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
