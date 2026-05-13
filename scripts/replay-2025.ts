import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { parseUsauScheduleHtml, type ImportDraft } from "../src/lib/usau-import";
import { bucketForSeed } from "../src/lib/rules";
import { recalculateEventScores } from "../src/lib/score-service";
import { slugify } from "../src/lib/slug";

type Gender = "MENS" | "WOMENS";
type Checkpoint = "pre" | "pool" | "prequarter" | "quarter" | "semi" | "final";

type ReplayOptions = {
  slug: string;
  entries: number;
  checkpoint?: Checkpoint;
  mensUrl?: string;
  womensUrl?: string;
  mensFile?: string;
  womensFile?: string;
  allowRemoteDb: boolean;
};

type ReplayGame = {
  id: string;
  draftGame: ImportDraft["games"][number];
};

const prisma = new PrismaClient();

const checkpoints: Checkpoint[] = ["pre", "pool", "prequarter", "quarter", "semi", "final"];
const checkpointRank: Record<Checkpoint, number> = {
  pre: 0,
  pool: 1,
  prequarter: 2,
  quarter: 3,
  semi: 4,
  final: 5,
};

const stageRank: Record<string, number> = {
  POOL: 1,
  PREQUARTER: 2,
  QUARTER: 3,
  SEMI: 4,
  FINAL: 5,
  OTHER: 99,
};

const defaultMensUrl =
  "https://play.usaultimate.org/events/2025-USA-Ultimate-College-Championships/schedule/Men/CollegeMen/";
const defaultWomensUrl =
  "https://play.usaultimate.org/events/2025-USA-Ultimate-College-Championships/schedule/Women/CollegeWomen/";

async function main() {
  const options = parseArgs(process.argv.slice(2));
  assertSafeDatabase(options);

  const [mensDraft, womensDraft] = await Promise.all([
    loadDraft({
      gender: "MENS",
      url: options.mensUrl ?? process.env.THEGAME_2025_MENS_URL ?? defaultMensUrl,
      file: options.mensFile,
    }),
    loadDraft({
      gender: "WOMENS",
      url: options.womensUrl ?? process.env.THEGAME_2025_WOMENS_URL ?? defaultWomensUrl,
      file: options.womensFile,
    }),
  ]);

  validateDraft("men", mensDraft);
  validateDraft("women", womensDraft);

  const { eventId, replayGames, bonusQuestionId } = await resetReplayEvent({
    slug: options.slug,
    drafts: [mensDraft, womensDraft],
  });
  await seedReplayEntries(eventId, options.entries, bonusQuestionId);

  const requestedCheckpoints = options.checkpoint
    ? checkpoints.filter((checkpoint) => checkpointRank[checkpoint] <= checkpointRank[options.checkpoint!])
    : checkpoints;

  const previousScores = new Map<string, number>();
  console.log(`\nReplay event: ${options.slug}`);
  console.log(`Entries: ${options.entries}`);
  console.log(`Men source: ${mensDraft.sourceUrl ?? options.mensFile}`);
  console.log(`Women source: ${womensDraft.sourceUrl ?? options.womensFile}`);

  for (const checkpoint of requestedCheckpoints) {
    await applyCheckpoint({ eventId, replayGames, checkpoint, bonusQuestionId });
    await assertCheckpoint({ eventId, checkpoint, previousScores });
    await printCheckpointSummary(eventId, checkpoint);
  }

  console.log("\n2025 replay completed.");
}

function parseArgs(args: string[]): ReplayOptions {
  const options: ReplayOptions = {
    slug: "college-d1-2025-replay",
    entries: 40,
    allowRemoteDb: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const [name, inlineValue] = arg.split("=", 2);
    const value = inlineValue ?? args[index + 1];
    const consumedNext = inlineValue == null;

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
    if (name === "--slug") {
      options.slug = requireValue(name, value);
      if (consumedNext) index += 1;
      continue;
    }
    if (name === "--entries") {
      options.entries = Number(requireValue(name, value));
      if (consumedNext) index += 1;
      continue;
    }
    if (name === "--checkpoint") {
      options.checkpoint = parseCheckpoint(requireValue(name, value));
      if (consumedNext) index += 1;
      continue;
    }
    if (name === "--mens-url") {
      options.mensUrl = requireValue(name, value);
      if (consumedNext) index += 1;
      continue;
    }
    if (name === "--womens-url") {
      options.womensUrl = requireValue(name, value);
      if (consumedNext) index += 1;
      continue;
    }
    if (name === "--mens-file") {
      options.mensFile = requireValue(name, value);
      if (consumedNext) index += 1;
      continue;
    }
    if (name === "--womens-file") {
      options.womensFile = requireValue(name, value);
      if (consumedNext) index += 1;
      continue;
    }
    if (arg === "--allow-remote-db") {
      options.allowRemoteDb = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!Number.isInteger(options.entries) || options.entries < 1) {
    throw new Error("--entries must be a positive integer.");
  }

  return options;
}

function requireValue(name: string, value: string | undefined) {
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
}

function parseCheckpoint(value: string): Checkpoint {
  if ((checkpoints as string[]).includes(value)) return value as Checkpoint;
  throw new Error(`--checkpoint must be one of: ${checkpoints.join(", ")}.`);
}

function printHelp() {
  console.log(`
Usage:
  npm run replay:2025 -- [options]

Options:
  --checkpoint pre|pool|prequarter|quarter|semi|final
      Stop after a checkpoint. Defaults to running the full replay.
  --entries 40
      Number of deterministic demo entries to create.
  --slug college-d1-2025-replay
      Replay event slug. The event with this slug is deleted and recreated.
  --mens-url URL / --womens-url URL
      Override the default 2025 D-I USAU schedule URLs.
  --mens-file PATH / --womens-file PATH
      Parse local HTML files instead of fetching USAU.
  --allow-remote-db
      Permit writes when DATABASE_URL does not look local or replay-scoped.
`);
}

function assertSafeDatabase(options: ReplayOptions) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  if (!options.slug.includes("replay")) {
    throw new Error("Replay slug must include 'replay' so it cannot be confused with the live event.");
  }
  if (options.allowRemoteDb) return;

  const lower = databaseUrl.toLowerCase();
  const safe =
    lower.includes("localhost") ||
    lower.includes("127.0.0.1") ||
    lower.includes("schema=thegame_replay") ||
    lower.includes("schema=thegame_test");

  if (!safe) {
    throw new Error(
      "DATABASE_URL does not look local or replay-scoped. Use a local DB, add schema=thegame_replay, or pass --allow-remote-db intentionally.",
    );
  }
}

async function loadDraft({ gender, url, file }: { gender: Gender; url: string; file?: string }) {
  const html = file ? await readFile(file, "utf8") : await fetchHtml(url);
  const draft = parseUsauScheduleHtml(html, file ? undefined : url);
  if (draft.gender !== gender) {
    throw new Error(`Expected ${gender} draft but parsed ${draft.gender} from ${file ?? url}.`);
  }
  return draft;
}

async function fetchHtml(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fetch failed for ${url}: ${response.status} ${response.statusText}`);
  return response.text();
}

function validateDraft(label: string, draft: ImportDraft) {
  if (draft.teams.length !== 20) {
    throw new Error(`Expected 20 ${label} teams, parsed ${draft.teams.length}.`);
  }
  if (!draft.games.some((game) => game.status === "FINAL" && game.stage === "FINAL")) {
    throw new Error(`Expected at least one completed ${label} final.`);
  }
}

async function resetReplayEvent({ slug, drafts }: { slug: string; drafts: ImportDraft[] }) {
  await prisma.event.deleteMany({ where: { slug } });
  const event = await prisma.event.create({
    data: {
      slug,
      name: "College D-I 2025 Replay",
      startsAt: new Date("2025-05-23T15:30:00.000Z"),
      entryLockAt: new Date("2025-05-23T15:00:00.000Z"),
      picksVisibleAt: new Date("2025-05-23T15:00:00.000Z"),
      isLocked: true,
      scoringComplete: false,
    },
  });

  const replayGames: ReplayGame[] = [];
  for (const draft of drafts) {
    const division = await prisma.division.create({
      data: {
        eventId: event.id,
        name: draft.divisionName,
        slug: slugify(draft.divisionName),
        gender: draft.gender,
        sortOrder: draft.gender === "MENS" ? 1 : 2,
        usauUrl: draft.sourceUrl,
      },
    });
    if (draft.sourceUrl) {
      await prisma.importSource.create({
        data: {
          eventId: event.id,
          divisionId: division.id,
          sourceUrl: draft.sourceUrl,
          sourceTitle: draft.divisionName,
          lastImportedAt: new Date(),
        },
      });
    }

    const teamByName = new Map<string, string>();
    for (const team of draft.teams) {
      const saved = await prisma.team.create({
        data: {
          eventId: event.id,
          divisionId: division.id,
          name: team.name,
          seed: team.seed,
          bucket: team.bucket || bucketForSeed(team.seed),
          pool: team.pool,
        },
      });
      teamByName.set(team.name, saved.id);
    }

    for (const game of draft.games) {
      const saved = await prisma.game.create({
        data: {
          eventId: event.id,
          divisionId: division.id,
          stage: game.stage,
          label: game.label,
          pool: game.pool,
          championshipPath: game.championshipPath,
          sourceUrl: draft.sourceUrl,
          sourceGameKey: game.sourceGameKey,
          team1Id: game.team1Name ? teamByName.get(game.team1Name) : undefined,
          team2Id: game.team2Name ? teamByName.get(game.team2Name) : undefined,
          status: "SCHEDULED",
          sortOrder: game.sortOrder,
        },
      });
      replayGames.push({ id: saved.id, draftGame: game });
    }
  }

  const bonus = await prisma.bonusQuestion.create({
    data: {
      eventId: event.id,
      prompt: "Replay sanity bonus",
      points: 5,
      sortOrder: 0,
      options: {
        create: ["Pool checkpoint", "Bracket checkpoint", "Final checkpoint"].map((label, sortOrder) => ({
          label,
          sortOrder,
        })),
      },
    },
    include: { options: true },
  });

  return { eventId: event.id, replayGames, bonusQuestionId: bonus.id };
}

async function seedReplayEntries(eventId: string, count: number, bonusQuestionId: string) {
  const event = await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    include: {
      teams: { include: { division: true }, orderBy: [{ division: { sortOrder: "asc" } }, { seed: "asc" }] },
      bonusQuestions: { include: { options: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  const bonusQuestion = event.bonusQuestions.find((question) => question.id === bonusQuestionId);
  if (!bonusQuestion) throw new Error("Replay bonus question was not created.");

  const buckets = {
    MENS: bucketsFor(event.teams, "MENS"),
    WOMENS: bucketsFor(event.teams, "WOMENS"),
  };

  for (const gender of ["MENS", "WOMENS"] as const) {
    for (const bucket of [1, 2, 3] as const) {
      if (!buckets[gender][bucket].length) {
        throw new Error(`Need at least one ${gender} bucket ${bucket} team before creating replay entries.`);
      }
    }
  }

  for (let index = 0; index < count; index += 1) {
    const displayName = `Replay Entry ${String(index + 1).padStart(2, "0")}`;
    const email = `replay-2025-${String(index + 1).padStart(3, "0")}@thegame.test`;
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, name: displayName, emailVerified: new Date() },
      update: { name: displayName },
    });

    const startsMenHeavy = index % 2 === 0;
    const regularPicks = startsMenHeavy
      ? [
          pick(buckets.MENS[1], index),
          pick(buckets.WOMENS[2], index),
          pick(buckets.MENS[2], index + 2),
          pick(buckets.WOMENS[3], index),
        ]
      : [
          pick(buckets.WOMENS[1], index),
          pick(buckets.MENS[2], index),
          pick(buckets.WOMENS[2], index + 2),
          pick(buckets.MENS[3], index),
        ];
    const bonus = nextUnique(
      [
        ...buckets.MENS[((index % 3) + 1) as 1 | 2 | 3],
        ...buckets.WOMENS[(((index + 1) % 3) + 1) as 1 | 2 | 3],
        ...event.teams,
      ],
      regularPicks,
      index,
    );

    const entry = await prisma.entry.create({
      data: { eventId: event.id, userId: user.id, displayName },
    });

    await prisma.entryPick.createMany({
      data: [
        { entryId: entry.id, teamId: regularPicks[0].id, kind: "REGULAR", slot: "B1" },
        { entryId: entry.id, teamId: regularPicks[1].id, kind: "REGULAR", slot: "B2A" },
        { entryId: entry.id, teamId: regularPicks[2].id, kind: "REGULAR", slot: "B2B" },
        { entryId: entry.id, teamId: regularPicks[3].id, kind: "REGULAR", slot: "B3" },
        { entryId: entry.id, teamId: bonus.id, kind: "BONUS", slot: "BONUS" },
      ],
    });

    const option = bonusQuestion.options[index % bonusQuestion.options.length];
    await prisma.bonusAnswer.create({
      data: { entryId: entry.id, questionId: bonusQuestion.id, optionId: option.id },
    });
  }
}

function bucketsFor<T extends { bucket: number; division: { gender: string } }>(teams: T[], gender: Gender) {
  return {
    1: teams.filter((team) => team.division.gender === gender && team.bucket === 1),
    2: teams.filter((team) => team.division.gender === gender && team.bucket === 2),
    3: teams.filter((team) => team.division.gender === gender && team.bucket === 3),
  };
}

async function applyCheckpoint({
  eventId,
  replayGames,
  checkpoint,
  bonusQuestionId,
}: {
  eventId: string;
  replayGames: ReplayGame[];
  checkpoint: Checkpoint;
  bonusQuestionId: string;
}) {
  const maxRank = checkpointRank[checkpoint];
  for (const replayGame of replayGames) {
    const includeFinal =
      replayGame.draftGame.status === "FINAL" && (stageRank[replayGame.draftGame.stage] ?? 99) <= maxRank;

    await prisma.game.update({
      where: { id: replayGame.id },
      data: {
        status: includeFinal ? "FINAL" : "SCHEDULED",
        team1Score: includeFinal ? replayGame.draftGame.team1Score : null,
        team2Score: includeFinal ? replayGame.draftGame.team2Score : null,
        lastImportedAt: includeFinal ? new Date() : null,
      },
    });
  }

  await prisma.bonusOption.updateMany({
    where: { questionId: bonusQuestionId },
    data: { isCorrect: false },
  });
  if (checkpoint === "final") {
    const finalOption = await prisma.bonusOption.findFirstOrThrow({
      where: { questionId: bonusQuestionId, label: "Final checkpoint" },
    });
    await prisma.bonusOption.update({
      where: { id: finalOption.id },
      data: { isCorrect: true },
    });
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { scoringComplete: checkpoint === "final" },
  });
  await recalculateEventScores(eventId);
}

async function assertCheckpoint({
  eventId,
  checkpoint,
  previousScores,
}: {
  eventId: string;
  checkpoint: Checkpoint;
  previousScores: Map<string, number>;
}) {
  const event = await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    include: {
      divisions: true,
      teams: true,
      games: true,
      entries: { include: { picks: true, score: true } },
    },
  });

  assert(event.divisions.length === 2, `Expected 2 divisions, found ${event.divisions.length}.`);
  assert(event.teams.length === 40, `Expected 40 teams, found ${event.teams.length}.`);
  assert(event.entries.length > 0, "Expected replay entries.");

  for (const entry of event.entries) {
    assert(entry.picks.length === 5, `${entry.displayName} has ${entry.picks.length} picks.`);
    assert(new Set(entry.picks.map((pick) => pick.teamId)).size === 5, `${entry.displayName} has duplicate picks.`);
    const total = entry.score?.totalPoints ?? 0;
    const previous = previousScores.get(entry.id) ?? 0;
    assert(total >= previous, `${entry.displayName} score moved backward at ${checkpoint}.`);
    previousScores.set(entry.id, total);
  }

  const finalGames = event.games.filter((game) => game.status === "FINAL");
  if (checkpoint === "pre") {
    assert(finalGames.length === 0, "Pre-event checkpoint should not have final games.");
    assert(event.entries.every((entry) => (entry.score?.totalPoints ?? 0) === 0), "Pre-event scores should be zero.");
  }
  if (checkpoint === "final") {
    assert(finalGames.length > 0, "Final checkpoint should have final games.");
    assert(
      event.entries.some((entry) => (entry.score?.totalPoints ?? 0) > 0),
      "Final checkpoint should produce positive scores.",
    );
  }
}

async function printCheckpointSummary(eventId: string, checkpoint: Checkpoint) {
  const [games, entries] = await Promise.all([
    prisma.game.groupBy({
      by: ["stage", "status"],
      where: { eventId },
      _count: true,
    }),
    prisma.entry.findMany({
      where: { eventId },
      include: { score: true },
    }),
  ]);

  const finalCount = games
    .filter((row) => row.status === "FINAL")
    .reduce((sum, row) => sum + row._count, 0);
  const topEntries = entries
    .sort((a, b) => (b.score?.totalPoints ?? 0) - (a.score?.totalPoints ?? 0) || a.displayName.localeCompare(b.displayName))
    .slice(0, 5);

  console.log(`\n[${checkpoint}] final games: ${finalCount}`);
  for (const entry of topEntries) {
    const score = entry.score?.totalPoints ?? 0;
    const teamPoints = entry.score?.teamPoints ?? 0;
    const bonusPoints = entry.score?.bonusQuestionPoints ?? 0;
    console.log(`  ${entry.displayName.padEnd(18)} ${score.toFixed(1)} pts (${teamPoints.toFixed(1)} teams, ${bonusPoints} bonus)`);
  }
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function pick<T>(items: T[], index: number) {
  return items[index % items.length];
}

function nextUnique<T extends { id: string }>(candidates: T[], existing: T[], offset: number) {
  const existingIds = new Set(existing.map((item) => item.id));
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[(offset + index) % candidates.length];
    if (!existingIds.has(candidate.id)) return candidate;
  }
  throw new Error("Could not find a unique bonus pick.");
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Replay failed: ${message}`);
    if (process.env.DEBUG) console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
