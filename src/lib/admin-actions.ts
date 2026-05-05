"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/authz";
import { getPrisma } from "@/lib/prisma";
import { importDraftSchema } from "@/lib/usau-import";
import { bucketForSeed } from "@/lib/rules";
import { recalculateEventScores } from "@/lib/score-service";

const eventSettingsSchema = z.object({
  eventId: z.string().min(1),
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1).regex(/^[a-z0-9-]+$/),
  entryLockAt: z.string().optional(),
  picksVisibleAt: z.string().optional(),
  isLocked: z.coerce.boolean().optional(),
});

function optionalDate(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function updateEventSettingsAction(formData: FormData) {
  await requireAdmin();
  const input = eventSettingsSchema.parse(Object.fromEntries(formData));
  await getPrisma().event.update({
    where: { id: input.eventId },
    data: {
      name: input.name,
      slug: input.slug,
      entryLockAt: optionalDate(input.entryLockAt),
      picksVisibleAt: optionalDate(input.picksVisibleAt),
      isLocked: input.isLocked ?? false,
    },
  });
  revalidatePath("/");
  revalidatePath("/admin/settings");
}

export async function saveImportDraftAction(formData: FormData) {
  await requireAdmin();
  const eventId = String(formData.get("eventId") ?? "");
  const rawDraft = String(formData.get("draft") ?? "");
  const draft = importDraftSchema.parse(JSON.parse(rawDraft));
  const prisma = getPrisma();

  const division = await prisma.division.upsert({
    where: { eventId_gender: { eventId, gender: draft.gender } },
    create: {
      eventId,
      name: draft.divisionName,
      gender: draft.gender,
      usauUrl: draft.sourceUrl,
      sortOrder: draft.gender === "MENS" ? 1 : 2,
    },
    update: {
      name: draft.divisionName,
      usauUrl: draft.sourceUrl,
    },
  });

  const teamByName = new Map<string, string>();
  for (const team of draft.teams) {
    const saved = await prisma.team.upsert({
      where: { eventId_divisionId_seed: { eventId, divisionId: division.id, seed: team.seed } },
      create: {
        eventId,
        divisionId: division.id,
        name: team.name,
        seed: team.seed,
        bucket: team.bucket,
        pool: team.pool,
      },
      update: {
        name: team.name,
        bucket: team.bucket,
        pool: team.pool,
      },
    });
    teamByName.set(team.name, saved.id);
  }

  await prisma.game.deleteMany({ where: { eventId, divisionId: division.id } });
  for (const game of draft.games) {
    await prisma.game.create({
      data: {
        eventId,
        divisionId: division.id,
        stage: game.stage,
        label: game.label,
        pool: game.pool,
        championshipPath: game.championshipPath,
        team1Id: game.team1Name ? teamByName.get(game.team1Name) : undefined,
        team2Id: game.team2Name ? teamByName.get(game.team2Name) : undefined,
        team1Score: game.team1Score,
        team2Score: game.team2Score,
        status: game.status,
        sortOrder: game.sortOrder,
      },
    });
  }

  await recalculateEventScores(eventId);
  revalidatePath("/admin/import");
  revalidatePath("/admin/teams");
  revalidatePath("/admin/games");
}

const teamSchema = z.object({
  eventId: z.string().min(1),
  divisionId: z.string().min(1),
  name: z.string().trim().min(1),
  seed: z.coerce.number().int().min(1).max(99),
  pool: z.string().trim().optional(),
  poolRank: z.coerce.number().int().min(1).max(20).optional().or(z.literal("").transform(() => undefined)),
});

export async function upsertTeamAction(formData: FormData) {
  await requireAdmin();
  const teamId = String(formData.get("teamId") ?? "");
  const input = teamSchema.parse(Object.fromEntries(formData));
  const data = {
    eventId: input.eventId,
    divisionId: input.divisionId,
    name: input.name,
    seed: input.seed,
    bucket: bucketForSeed(input.seed),
    pool: input.pool || null,
    poolRank: input.poolRank ?? null,
  };
  const prisma = getPrisma();
  if (teamId) {
    await prisma.team.update({ where: { id: teamId }, data });
  } else {
    await prisma.team.create({ data });
  }
  await recalculateEventScores(input.eventId);
  revalidatePath("/admin/teams");
}

export async function saveGameResultAction(formData: FormData) {
  await requireAdmin();
  const gameId = String(formData.get("gameId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const team1ScoreRaw = String(formData.get("team1Score") ?? "");
  const team2ScoreRaw = String(formData.get("team2Score") ?? "");
  const hasScore = team1ScoreRaw !== "" && team2ScoreRaw !== "";

  await getPrisma().game.update({
    where: { id: gameId },
    data: {
      team1Score: hasScore ? Number(team1ScoreRaw) : null,
      team2Score: hasScore ? Number(team2ScoreRaw) : null,
      status: hasScore ? "FINAL" : "SCHEDULED",
    },
  });

  await recalculateEventScores(eventId);
  revalidatePath("/admin/games");
  revalidatePath("/admin");
  revalidatePath("/");
}

const gameSchema = z.object({
  eventId: z.string().min(1),
  divisionId: z.string().min(1),
  stage: z.enum(["POOL", "PREQUARTER", "QUARTER", "SEMI", "FINAL", "OTHER"]),
  label: z.string().trim().optional(),
  pool: z.string().trim().optional(),
  team1Id: z.string().optional(),
  team2Id: z.string().optional(),
  championshipPath: z.coerce.boolean().optional(),
});

export async function createGameAction(formData: FormData) {
  await requireAdmin();
  const input = gameSchema.parse(Object.fromEntries(formData));
  const maxSort = await getPrisma().game.aggregate({
    where: { eventId: input.eventId, divisionId: input.divisionId },
    _max: { sortOrder: true },
  });

  await getPrisma().game.create({
    data: {
      eventId: input.eventId,
      divisionId: input.divisionId,
      stage: input.stage,
      label: input.label || null,
      pool: input.pool || null,
      team1Id: input.team1Id || null,
      team2Id: input.team2Id || null,
      championshipPath: input.championshipPath ?? false,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
  });

  revalidatePath("/admin/games");
}

export async function createBonusQuestionAction(formData: FormData) {
  await requireAdmin();
  const eventId = String(formData.get("eventId") ?? "");
  const prompt = String(formData.get("prompt") ?? "").trim();
  const points = Number(formData.get("points") ?? 0);
  const options = String(formData.get("options") ?? "")
    .split("\n")
    .map((option) => option.trim())
    .filter(Boolean);

  if (!prompt || !points || options.length < 2) {
    throw new Error("Bonus questions need a prompt, point value, and at least two options.");
  }

  await getPrisma().bonusQuestion.create({
    data: {
      eventId,
      prompt,
      points,
      sortOrder: 0,
      options: {
        create: options.map((label, index) => ({ label, sortOrder: index })),
      },
    },
  });
  revalidatePath("/admin/bonus");
}

export async function setCorrectBonusOptionAction(formData: FormData) {
  await requireAdmin();
  const eventId = String(formData.get("eventId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  const optionId = String(formData.get("optionId") ?? "");
  const prisma = getPrisma();

  await prisma.bonusOption.updateMany({
    where: { questionId },
    data: { isCorrect: false },
  });
  await prisma.bonusOption.update({
    where: { id: optionId },
    data: { isCorrect: true },
  });

  await recalculateEventScores(eventId);
  revalidatePath("/admin/bonus");
  revalidatePath("/");
}
