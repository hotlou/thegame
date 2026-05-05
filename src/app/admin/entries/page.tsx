import { Card } from "@/components/ui";
import { getCurrentEvent } from "@/lib/events";
import { getPrisma } from "@/lib/prisma";

export default async function EntriesPage() {
  const event = await getCurrentEvent();
  if (!event) return <Card>No event found.</Card>;
  const entries = await getPrisma().entry.findMany({
    where: { eventId: event.id },
    include: {
      user: true,
      score: true,
      picks: { include: { team: true }, orderBy: { slot: "asc" } },
    },
    orderBy: { submittedAt: "desc" },
  });

  return (
    <Card>
      <h1 className="text-2xl font-bold">Entries</h1>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-left">
              <th className="py-2 pr-2">Name</th>
              <th className="py-2 pr-2">Email</th>
              <th className="py-2 pr-2">Submitted</th>
              <th className="py-2 pr-2">Score</th>
              <th className="py-2 pr-2">Picks</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-[var(--line)] align-top">
                <td className="py-3 pr-2">{entry.displayName}</td>
                <td className="py-3 pr-2">{entry.user.email}</td>
                <td className="py-3 pr-2">{entry.submittedAt.toLocaleString()}</td>
                <td className="py-3 pr-2">{entry.score?.totalPoints ?? 0}</td>
                <td className="py-3 pr-2 text-[var(--muted)]">
                  {entry.picks.map((pick) => `${pick.slot}: ${pick.team.name}`).join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
