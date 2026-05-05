import { Card, SubmitButton, TextInput } from "@/components/ui";
import { getCurrentEvent } from "@/lib/events";
import { updateEventSettingsAction } from "@/lib/admin-actions";

export default async function SettingsPage() {
  const event = await getCurrentEvent();
  if (!event) return <Card>No event found.</Card>;

  return (
    <Card className="max-w-2xl">
      <h1 className="text-2xl font-bold">Event settings</h1>
      <form action={updateEventSettingsAction} className="mt-5 space-y-4">
        <input type="hidden" name="eventId" value={event.id} />
        <label className="block text-sm font-semibold">
          Name
          <TextInput name="name" defaultValue={event.name} required />
        </label>
        <label className="block text-sm font-semibold">
          Slug
          <TextInput name="slug" defaultValue={event.slug} required />
        </label>
        <label className="block text-sm font-semibold">
          Entry lock
          <TextInput name="entryLockAt" type="datetime-local" defaultValue={toDateTimeLocal(event.entryLockAt)} />
        </label>
        <label className="block text-sm font-semibold">
          Picks visible at
          <TextInput name="picksVisibleAt" type="datetime-local" defaultValue={toDateTimeLocal(event.picksVisibleAt)} />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="isLocked" value="true" defaultChecked={event.isLocked} />
          Lock entries now
        </label>
        <SubmitButton>Save settings</SubmitButton>
      </form>
    </Card>
  );
}

function toDateTimeLocal(date: Date | null) {
  if (!date) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
