import { notFound } from "next/navigation";
import { Card, PageShell, Pill } from "@/components/ui";
import { SiteNav } from "@/components/site-nav";
import { getPrisma } from "@/lib/prisma";
import { picksAreVisible } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPrisma().event.findUnique({
    where: { slug },
    include: {
      entries: {
        include: {
          score: true,
          picks: { include: { team: { include: { division: true } } }, orderBy: { slot: "asc" } },
          bonusAnswers: { include: { question: true, option: true } },
        },
      },
    },
  });
  if (!event) notFound();

  const visible = picksAreVisible(event);
  const entries = [...event.entries].sort((a, b) => (b.score?.totalPoints ?? 0) - (a.score?.totalPoints ?? 0));

  return (
    <PageShell>
      <SiteNav />
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          <p className="mt-2 text-[var(--muted)]">{event.name}</p>
        </div>
        <Pill>{visible ? "Picks visible" : "Picks hidden until lock"}</Pill>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left">
                <th className="py-2 pr-3">Rank</th>
                <th className="py-2 pr-3">Entry</th>
                <th className="py-2 pr-3">Team pts</th>
                <th className="py-2 pr-3">Bonus pts</th>
                <th className="py-2 pr-3">Total</th>
                <th className="py-2 pr-3">Picks</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={entry.id} className="border-b border-[var(--line)] align-top">
                  <td className="py-3 pr-3 font-semibold">{index + 1}</td>
                  <td className="py-3 pr-3">{entry.displayName}</td>
                  <td className="py-3 pr-3">{formatScore(entry.score?.teamPoints ?? 0)}</td>
                  <td className="py-3 pr-3">{formatScore(entry.score?.bonusQuestionPoints ?? 0)}</td>
                  <td className="py-3 pr-3 font-bold">{formatScore(entry.score?.totalPoints ?? 0)}</td>
                  <td className="py-3 pr-3 text-[var(--muted)]">
                    {visible
                      ? entry.picks
                          .map((pick) => `${pick.slot === "BONUS" ? "Bonus: " : ""}${pick.team.name}`)
                          .join(", ")
                      : "Hidden"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PageShell>
  );
}

function formatScore(score: number) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}
