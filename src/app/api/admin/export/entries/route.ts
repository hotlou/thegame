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
      user: true,
      score: true,
      picks: { include: { team: true } },
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
    picks: entry.picks.map((pick) => `${pick.slot}:${pick.team.name}`).join("; "),
    bonusAnswers: entry.bonusAnswers.map((answer) => `${answer.question.prompt}:${answer.option.label}`).join("; "),
  }));

  return csvResponse(toCsv(rows), "entries.csv");
}

function csvResponse(csv: string, filename: string) {
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
