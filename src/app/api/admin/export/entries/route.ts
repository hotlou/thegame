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
      user: true,
      score: true,
      picks: { include: { team: { include: { division: true } } } },
      bonusAnswers: { include: { question: true, option: true } },
    },
    orderBy: { submittedAt: "asc" },
  });

  const rows = entries.map((entry) => ({
    displayName: entry.displayName,
    email: entry.user.email,
    submittedAt: entry.submittedAt.toISOString(),
    totalPoints: entry.score?.totalPoints ?? 0,
    teamPoints: entry.score?.teamPoints ?? 0,
    bonusQuestionPoints: entry.score?.bonusQuestionPoints ?? 0,
    picks: entry.picks.map((pick) => `${pick.slot}:${formatPickTeam(pick.team)}`).join("; "),
    bonusAnswers: entry.bonusAnswers.map((answer) => `${answer.question.prompt}:${answer.option.label}`).join("; "),
  }));

  return csvResponse(toCsv(rows), `${event.slug}-entries.csv`);
}

function formatPickTeam(team: { name: string; division: { gender: string } }) {
  return `${team.division.gender === "MENS" ? "Men's" : "Women's"} ${team.name}`;
}

function csvResponse(csv: string, filename: string) {
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
