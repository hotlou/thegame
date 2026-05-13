import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { getAdminEvent } from "@/lib/events";
import { getPrisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";

export async function GET(request: Request) {
  await requireAdmin();
  const event = await getAdminEvent(new URL(request.url).searchParams.get("event") ?? undefined);
  if (!event) return new NextResponse("No event", { status: 404 });

  const entries = await getPrisma().entry.findMany({
    where: { eventId: event.id },
    include: {
      score: true,
      picks: { include: { team: { include: { division: true } } } },
    },
  });

  const rows = entries
    .sort((a, b) => (b.score?.totalPoints ?? 0) - (a.score?.totalPoints ?? 0))
    .map((entry, index) => ({
      rank: index + 1,
      displayName: entry.displayName,
      totalPoints: entry.score?.totalPoints ?? 0,
      teamPoints: entry.score?.teamPoints ?? 0,
      bonusQuestionPoints: entry.score?.bonusQuestionPoints ?? 0,
      picks: entry.picks.map((pick) => `${pick.slot}:${formatPickTeam(pick.team)}`).join("; "),
    }));

  return new NextResponse(toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${event.slug}-leaderboard.csv"`,
    },
  });
}

function formatPickTeam(team: { name: string; division: { gender: string } }) {
  return `${team.division.gender === "MENS" ? "Men's" : "Women's"} ${team.name}`;
}
