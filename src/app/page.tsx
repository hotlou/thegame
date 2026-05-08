import { redirect } from "next/navigation";
import { Card, PageShell } from "@/components/ui";
import { SiteNav } from "@/components/site-nav";
import { getCurrentEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const event = await getCurrentEvent();
  if (event) redirect(`/events/${event.slug}`);

  return (
    <PageShell>
      <SiteNav />
      <Card>
        <h1 className="tg-h1">TheGame is ready for setup.</h1>
        <p className="tg-body tg-muted" style={{ marginTop: 12 }}>
          Run the seed script or create an event in the database to begin configuring College D-I 2026.
        </p>
      </Card>
    </PageShell>
  );
}
