"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/authz";
import { getPrisma } from "@/lib/prisma";
import { entryIsLocked } from "@/lib/events";
import { allPickSlots, regularSlots, validateEntrySelection, type PickSlot } from "@/lib/rules";
import { recalculateEventScores } from "@/lib/score-service";

export async function saveEntryAction(slug: string, formData: FormData) {
  const session = await requireUser();
  const prisma = getPrisma();
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      teams: { include: { division: true } },
      bonusQuestions: { include: { options: true } },
    },
  });

  if (!event) throw new Error("Event not found.");
  if (entryIsLocked(event)) throw new Error("Entries are locked.");

  const picks = Object.fromEntries(
    allPickSlots.map((slot) => [slot, String(formData.get(slot) ?? "")]),
  ) as Record<PickSlot, string>;

  const bonusAnswers: Record<string, string> = {};
  for (const question of event.bonusQuestions) {
    const value = String(formData.get(`bonus_${question.id}`) ?? "");
    if (value) bonusAnswers[question.id] = value;
  }

  const errors = validateEntrySelection(
    {
      displayName: String(formData.get("displayName") ?? ""),
      picks,
      bonusAnswers,
    },
    event.teams.map((team) => ({
      id: team.id,
      name: team.name,
      seed: team.seed,
      bucket: team.bucket,
      divisionGender: team.division.gender,
    })),
  );
  if (errors.length) {
    throw new Error(errors.join(" "));
  }

  const entry = await prisma.entry.upsert({
    where: { eventId_userId: { eventId: event.id, userId: session.user.id } },
    create: {
      eventId: event.id,
      userId: session.user.id,
      displayName: String(formData.get("displayName") ?? ""),
    },
    update: {
      displayName: String(formData.get("displayName") ?? ""),
      submittedAt: new Date(),
    },
  });

  await prisma.entryPick.deleteMany({ where: { entryId: entry.id } });
  await prisma.bonusAnswer.deleteMany({ where: { entryId: entry.id } });

  await prisma.entryPick.createMany({
    data: [
      ...regularSlots.map((slot) => ({
        entryId: entry.id,
        teamId: picks[slot],
        slot,
        kind: "REGULAR" as const,
      })),
      {
        entryId: entry.id,
        teamId: picks.BONUS,
        slot: "BONUS",
        kind: "BONUS" as const,
      },
    ],
  });

  const answers = Object.entries(bonusAnswers).map(([questionId, optionId]) => ({
    entryId: entry.id,
    questionId,
    optionId,
  }));
  if (answers.length) {
    await prisma.bonusAnswer.createMany({ data: answers });
  }

  await recalculateEventScores(event.id);
  revalidatePath(`/events/${slug}`);
  revalidatePath(`/events/${slug}/entry`);
  redirect(`/events/${slug}/entry?saved=1`);
}
