import { Card } from "@/components/ui";
import { ImportTool } from "@/components/import-tool";
import { getCurrentEvent } from "@/lib/events";

export default async function ImportPage() {
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
        <h2>USAU Import</h2>
        <span className="meta">{event.slug}</span>
      </div>
      <Card>
        <h1 className="tg-h2">USAU assisted import</h1>
        <p className="tg-body-sm tg-muted" style={{ marginTop: 8 }}>
          Paste a USAU schedule page, review the parsed teams and championship-path games, edit the JSON if needed, then
          save.
        </p>
        <div style={{ marginTop: 20 }}>
          <ImportTool eventId={event.id} />
        </div>
      </Card>
    </>
  );
}
