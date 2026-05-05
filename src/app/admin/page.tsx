import { Card } from "@/components/ui";
import { getCurrentEvent } from "@/lib/events";
import { getPrisma } from "@/lib/prisma";

export default async function AdminPage() {
  const event = await getCurrentEvent();
  if (!event) {
    return <Card>No event exists yet. Run `npm run db:seed` to create the starter event.</Card>;
  }

  const [teams, games, entries, scoredGames] = await Promise.all([
    getPrisma().team.count({ where: { eventId: event.id } }),
    getPrisma().game.count({ where: { eventId: event.id } }),
    getPrisma().entry.count({ where: { eventId: event.id } }),
    getPrisma().game.count({ where: { eventId: event.id, status: "FINAL" } }),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-bold">{event.name}</h1>
      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <Stat label="Teams" value={teams} />
        <Stat label="Games" value={games} />
        <Stat label="Final games" value={scoredGames} />
        <Stat label="Entries" value={entries} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </Card>
  );
}
