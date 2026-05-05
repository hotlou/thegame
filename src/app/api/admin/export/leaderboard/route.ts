import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { getCurrentEvent } from "@/lib/events";
import { getPrisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";

export async function GET() {
  await requireAdmin();
  const event = await getCurrentEvent();
  if (!event) return new NextResponse("No event", { status: 404 });

  const entries = await getPrisma().entry.findMany({
    where: { eventId: event.id },
    include: {
      score: true,
      picks: { include: { team: true } },
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
      picks: entry.picks.map((pick) => `${pick.slot}:${pick.team.name}`).join("; "),
    }));

  return new NextResponse(toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="leaderboard.csv"',
    },
  });
}
