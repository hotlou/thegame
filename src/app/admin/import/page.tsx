import { Card } from "@/components/ui";
import { ImportTool } from "@/components/import-tool";
import { getCurrentEvent } from "@/lib/events";

export default async function ImportPage() {
  const event = await getCurrentEvent();
  if (!event) return <Card>No event found.</Card>;

  return (
    <Card>
      <h1 className="text-2xl font-bold">USAU assisted import</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Paste a USAU schedule page, review the parsed teams and championship-path games, edit the JSON if needed, then save.
      </p>
      <div className="mt-5">
        <ImportTool eventId={event.id} />
      </div>
    </Card>
  );
}
