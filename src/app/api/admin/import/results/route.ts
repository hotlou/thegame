import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/authz";
import { getPrisma } from "@/lib/prisma";
import { buildResultsImportPreview } from "@/lib/result-import";
import { parseUsauScheduleHtml } from "@/lib/usau-import";

const requestSchema = z.object({
  eventId: z.string().min(1),
  divisionId: z.string().min(1),
  url: z.string().url(),
});

export async function POST(request: Request) {
  await requireAdmin();
  const input = requestSchema.parse(await request.json());

  const response = await fetch(input.url, { next: { revalidate: 30 } });
  if (!response.ok) {
    return NextResponse.json({ error: `USAU returned ${response.status}.` }, { status: 400 });
  }

  const draft = parseUsauScheduleHtml(await response.text(), input.url);
  const [teams, existingGames] = await Promise.all([
    getPrisma().team.findMany({ where: { eventId: input.eventId, divisionId: input.divisionId } }),
    getPrisma().game.findMany({
      where: { eventId: input.eventId, divisionId: input.divisionId },
      include: { team1: true, team2: true },
    }),
  ]);

  const preview = buildResultsImportPreview({ draft, teams, existingGames });
  return NextResponse.json({ draft, preview });
}
