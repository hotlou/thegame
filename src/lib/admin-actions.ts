"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/authz";
import { getPrisma } from "@/lib/prisma";
import { importDraftSchema, makeSourceGameKey } from "@/lib/usau-import";
import { bucketForSeed } from "@/lib/rules";
import { recalculateEventScores } from "@/lib/score-service";
import { mapTeamsByName, normalizeName } from "@/lib/result-import";

const eventSettingsSchema = z.object({
  eventId: z.string().min(1),
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1).regex(/^[a-z0-9-]+$/),
  entryLockAt: z.string().optional(),
  picksVisibleAt: z.string().optional(),
  isLocked: z.coerce.boolean().optional(),
});

const createEventSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1).regex(/^[a-z0-9-]+$/),
  startsAt: z.string().optional(),
  entryLockAt: z.string().optional(),
  picksVisibleAt: z.string().optional(),
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

export async function createEventAction(formData: FormData) {
  await requireAdmin();
  const input = createEventSchema.parse(Object.fromEntries(formData));
  const startsAt = optionalDate(input.startsAt);
  const entryLockAt = optionalDate(input.entryLockAt) ?? startsAt;

  const event = await getPrisma().event.create({
    data: {
      name: input.name,
      slug: input.slug,
      startsAt,
      entryLockAt,
      picksVisibleAt: optionalDate(input.picksVisibleAt),
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
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

  const existingGames = await prisma.game.findMany({
    where: { eventId, divisionId: division.id },
    include: { team1: true, team2: true },
  });
  const existingByKey = indexExistingGames(existingGames);

  for (const game of draft.games) {
    const importedData = {
      eventId,
      divisionId: division.id,
      stage: game.stage,
      label: game.label,
      pool: game.pool,
      championshipPath: game.championshipPath,
      sourceUrl: draft.sourceUrl,
      sourceGameKey: game.sourceGameKey,
      lastImportedAt: new Date(),
      resultSource: "IMPORTED" as const,
      manualOverride: false,
      team1Id: game.team1Name ? teamByName.get(game.team1Name) : undefined,
      team2Id: game.team2Name ? teamByName.get(game.team2Name) : undefined,
      team1Score: game.team1Score,
      team2Score: game.team2Score,
      status: game.status,
    };
    const fallbackSourceGameKey = makeSourceGameKey({
      stage: game.stage,
      pool: game.pool,
      team1Name: game.team1Name,
      team2Name: game.team2Name,
      sortOrder: game.sortOrder,
    });
    const existing = existingByKey.get(game.sourceGameKey) ?? existingByKey.get(fallbackSourceGameKey);
    if (existing?.manualOverride) continue;

    if (existing) {
      await prisma.game.update({
        where: { id: existing.id },
        data: importedData,
      });
    } else {
      await prisma.game.create({
        data: {
          ...importedData,
          sortOrder: game.sortOrder,
        },
      });
    }
  }

  await recalculateEventScores(eventId);
  revalidatePath("/admin/import");
  revalidatePath("/admin/teams");
  revalidatePath("/admin/games");

  return {
    ok: true,
    divisionName: division.name,
    teamCount: draft.teams.length,
    gameCount: draft.games.length,
    sourceUrl: draft.sourceUrl ?? null,
  };
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
      resultSource: "MANUAL",
      manualOverride: true,
    },
  });

  await recalculateEventScores(eventId);
  revalidatePath("/admin/games");
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function clearGameResultAction(formData: FormData) {
  await requireAdmin();
  const gameId = String(formData.get("gameId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");

  await getPrisma().game.update({
    where: { id: gameId },
    data: {
      team1Score: null,
      team2Score: null,
      status: "SCHEDULED",
      resultSource: "MANUAL",
      manualOverride: true,
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
      resultSource: "MANUAL",
      manualOverride: true,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
  });

  revalidatePath("/admin/games");
}

export async function applyResultsImportAction(formData: FormData) {
  await requireAdmin();
  const eventId = String(formData.get("eventId") ?? "");
  const divisionId = String(formData.get("divisionId") ?? "");
  const rawDraft = String(formData.get("draft") ?? "");
  const overwriteManual = formData.get("overwriteManual") === "true";
  const draft = importDraftSchema.parse(JSON.parse(rawDraft));
  const prisma = getPrisma();

  const [teams, existingGames] = await Promise.all([
    prisma.team.findMany({ where: { eventId, divisionId } }),
    prisma.game.findMany({
      where: { eventId, divisionId },
      include: { team1: true, team2: true },
    }),
  ]);
  const teamByName = mapTeamsByName(teams);
  const existingByKey = indexExistingGames(existingGames);
  const summary = {
    created: 0,
    updated: 0,
    skippedManual: 0,
    skippedUnmatched: 0,
    scheduledOnly: 0,
  };

  for (const game of draft.games) {
    const team1 = game.team1Name ? teamByName.get(normalizeName(game.team1Name)) : null;
    const team2 = game.team2Name ? teamByName.get(normalizeName(game.team2Name)) : null;
    if (!team1 || !team2) {
      summary.skippedUnmatched += 1;
      continue;
    }
    if (game.status !== "FINAL") {
      summary.scheduledOnly += 1;
    }

    const fallbackSourceGameKey = makeSourceGameKey({
      stage: game.stage,
      pool: game.pool,
      team1Name: game.team1Name,
      team2Name: game.team2Name,
      sortOrder: game.sortOrder,
    });
    const existing = existingByKey.get(game.sourceGameKey) ?? existingByKey.get(fallbackSourceGameKey);
    const importedData = {
      stage: game.stage,
      label: game.label,
      pool: game.pool,
      championshipPath: game.championshipPath,
      team1Id: team1.id,
      team2Id: team2.id,
      team1Score: game.team1Score ?? null,
      team2Score: game.team2Score ?? null,
      status: game.status,
      sourceUrl: draft.sourceUrl,
      sourceGameKey: game.sourceGameKey,
      lastImportedAt: new Date(),
      resultSource: "IMPORTED" as const,
      manualOverride: false,
    };

    if (!existing) {
      await prisma.game.create({
        data: {
          eventId,
          divisionId,
          ...importedData,
          sortOrder: game.sortOrder,
        },
      });
      summary.created += 1;
      continue;
    }

    if (existing.manualOverride && !overwriteManual) {
      summary.skippedManual += 1;
      continue;
    }

    await prisma.game.update({
      where: { id: existing.id },
      data: importedData,
    });
    summary.updated += 1;
  }

  await recalculateEventScores(eventId);
  revalidatePath("/admin/games");
  revalidatePath("/admin");
  revalidatePath("/");

  return summary;
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

function indexExistingGames<
  T extends {
    sourceGameKey: string | null;
    stage: string;
    pool: string | null;
    team1?: { name: string } | null;
    team2?: { name: string } | null;
  },
>(games: T[]) {
  const buckets = new Map<string, T[]>();
  for (const game of games) {
    const fallbackKey = makeSourceGameKey({
      stage: game.stage,
      pool: game.pool ?? undefined,
      team1Name: game.team1?.name,
      team2Name: game.team2?.name,
    });
    for (const key of new Set([game.sourceGameKey, fallbackKey].filter(Boolean) as string[])) {
      buckets.set(key, [...(buckets.get(key) ?? []), game]);
    }
  }

  const index = new Map<string, T>();
  for (const [key, matches] of buckets) {
    if (matches.length === 1) index.set(key, matches[0]);
  }
  return index;
}
