import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, PageShell, Pill } from "@/components/ui";
import { SiteNav } from "@/components/site-nav";
import { AdRail } from "@/components/ad-slot";
import { getPrisma } from "@/lib/prisma";
import { picksAreVisible } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPrisma().event.findUnique({
    where: { slug },
    select: { name: true },
  });
  if (!event) return { title: "Leaderboard" };
  const url = `/events/${slug}/leaderboard`;
  const description = `Live leaderboard for ${event.name} on TheGame, Ultiworld's free pick'em.`;
  return {
    title: `${event.name} leaderboard`,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${event.name} leaderboard · TheGame`, description, url, type: "article" },
    twitter: { title: `${event.name} leaderboard · TheGame`, description },
  };
}

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

      <div className="tg-eyebrow">
        <h2>The Standings</h2>
        <span className="meta">{event.name}</span>
      </div>

      <div
        style={{
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 className="tg-h1">Leaderboard</h1>
          <p className="tg-body tg-muted" style={{ marginTop: 8 }}>
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </p>
        </div>
        <Pill tone={visible ? "accent" : "default"}>
          {visible ? "Picks visible" : "Picks hidden until lock"}
        </Pill>
      </div>

      <Card>
        <div style={{ overflowX: "auto" }}>
          <table className="tg-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Entry</th>
                <th>Team pts</th>
                <th>Bonus pts</th>
                <th>Total</th>
                <th>Picks</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={entry.id}>
                  <td className="rank-cell">{index + 1}</td>
                  <td>{entry.displayName}</td>
                  <td>{formatScore(entry.score?.teamPoints ?? 0)}</td>
                  <td>{formatScore(entry.score?.bonusQuestionPoints ?? 0)}</td>
                  <td className="tg-strong">{formatScore(entry.score?.totalPoints ?? 0)}</td>
                  <td className="tg-muted">
                    {visible
                      ? entry.picks
                          .map((pick) => `${pick.slot === "BONUS" ? "Bonus: " : ""}${pick.team.name}`)
                          .join(", ")
                      : "Hidden until lock"}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={6} className="tg-muted" style={{ textAlign: "center", padding: 24 }}>
                    No entries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AdRail />
    </PageShell>
  );
}

function formatScore(score: number) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}
