import { PrismaClient } from "@prisma/client";
import { recalculateEventScores } from "../src/lib/score-service";

const prisma = new PrismaClient();

const displayNames = [
  "Pool A Romantic",
  "Upset Cartographer",
  "Bracket Whisperer",
  "Seed Skeptic",
  "Layout Call Hero",
  "Wind Disciple",
  "Zone Enjoyer",
  "Universe Point",
  "Deep Space Auditor",
  "Sideline Oracle",
  "Soft Cap Scholar",
  "The Hammer Index",
  "Bid Math Believer",
  "Sunday Morning Legs",
  "Double Game Point",
];

async function main() {
  const event = await prisma.event.findFirst({
    orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
    include: {
      teams: { include: { division: true }, orderBy: [{ division: { sortOrder: "asc" } }, { seed: "asc" }] },
      bonusQuestions: { include: { options: { orderBy: { sortOrder: "asc" } } } },
    },
  });

  if (!event) throw new Error("No event found. Run npm run db:seed first.");

  const buckets = {
    MENS: {
      1: event.teams.filter((team) => team.division.gender === "MENS" && team.bucket === 1),
      2: event.teams.filter((team) => team.division.gender === "MENS" && team.bucket === 2),
      3: event.teams.filter((team) => team.division.gender === "MENS" && team.bucket === 3),
    },
    WOMENS: {
      1: event.teams.filter((team) => team.division.gender === "WOMENS" && team.bucket === 1),
      2: event.teams.filter((team) => team.division.gender === "WOMENS" && team.bucket === 2),
      3: event.teams.filter((team) => team.division.gender === "WOMENS" && team.bucket === 3),
    },
  };

  for (const gender of ["MENS", "WOMENS"] as const) {
    for (const bucket of [1, 2, 3] as const) {
      if (!buckets[gender][bucket].length) {
        throw new Error(`Need at least one ${gender} bucket ${bucket} team before creating demo entries.`);
      }
    }
  }

  for (const [index, displayName] of displayNames.entries()) {
    const email = `demo-entry-${String(index + 1).padStart(2, "0")}@thegame.test`;
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

    const entry = await prisma.entry.upsert({
      where: { eventId_userId: { eventId: event.id, userId: user.id } },
      create: { eventId: event.id, userId: user.id, displayName },
      update: { displayName, submittedAt: new Date() },
    });

    await prisma.entryPick.deleteMany({ where: { entryId: entry.id } });
    await prisma.bonusAnswer.deleteMany({ where: { entryId: entry.id } });

    await prisma.entryPick.createMany({
      data: [
        { entryId: entry.id, teamId: regularPicks[0].id, kind: "REGULAR", slot: "B1" },
        { entryId: entry.id, teamId: regularPicks[1].id, kind: "REGULAR", slot: "B2A" },
        { entryId: entry.id, teamId: regularPicks[2].id, kind: "REGULAR", slot: "B2B" },
        { entryId: entry.id, teamId: regularPicks[3].id, kind: "REGULAR", slot: "B3" },
        { entryId: entry.id, teamId: bonus.id, kind: "BONUS", slot: "BONUS" },
      ],
    });

    const answers = event.bonusQuestions
      .map((question, questionIndex) => {
        const option = question.options[(index + questionIndex) % question.options.length];
        return option ? { entryId: entry.id, questionId: question.id, optionId: option.id } : null;
      })
      .filter(Boolean) as Array<{ entryId: string; questionId: string; optionId: string }>;

    if (answers.length) {
      await prisma.bonusAnswer.createMany({ data: answers });
    }
  }

  await recalculateEventScores(event.id);
  console.log(`Created or refreshed ${displayNames.length} demo entries for ${event.name}.`);
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
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
