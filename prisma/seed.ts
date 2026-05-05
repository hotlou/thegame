import { PrismaClient } from "@prisma/client";
import { bucketForSeed } from "../src/lib/rules";
import { recalculateEventScores } from "../src/lib/score-service";

const prisma = new PrismaClient();

const mensTeams = [
  "Brown Brownian Motion",
  "North Carolina Darkside",
  "Pittsburgh En Sabah Nur",
  "Colorado Mamabird",
  "Georgia Jojah",
  "Cal Poly SLO SLOCORE",
  "Vermont Chill",
  "Washington Sundodgers",
  "Texas TUFF",
  "Oregon Ego",
  "Massachusetts Zoodisc",
  "Minnesota Grey Duck",
  "Carleton CUT",
  "Michigan MagnUM",
  "UCLA Smaug",
  "Stanford Bloodthirsty",
  "Northeastern Huskies",
  "Utah Zion Curtain",
  "Pennsylvania Void",
  "Florida State DUF",
];

const womensTeams = [
  "North Carolina Pleiades",
  "Vermont Ruckus",
  "Colorado Quandary",
  "Stanford Superfly",
  "British Columbia Thunderbirds",
  "Tufts Ewo",
  "Carleton Syzygy",
  "Oregon Fugue",
  "Washington Element",
  "UCLA BLU",
  "Northeastern Valkyries",
  "Michigan Flywheel",
  "UC Santa Barbara Burning Skirts",
  "California Pie Queens",
  "Texas Melee",
  "Pennsylvania Venus",
  "Virginia Hydra",
  "Pittsburgh Danger",
  "Georgia Athena",
  "Florida FUEL",
];

async function main() {
  const event = await prisma.event.upsert({
    where: { slug: "college-d1-2026" },
    create: {
      slug: "college-d1-2026",
      name: "College D-I 2026 TheGame",
      startsAt: new Date("2026-05-22T14:00:00.000Z"),
      entryLockAt: new Date("2026-05-22T13:00:00.000Z"),
    },
    update: {},
  });

  const men = await prisma.division.upsert({
    where: { eventId_gender: { eventId: event.id, gender: "MENS" } },
    create: { eventId: event.id, name: "College Men", gender: "MENS", sortOrder: 1 },
    update: {},
  });
  const women = await prisma.division.upsert({
    where: { eventId_gender: { eventId: event.id, gender: "WOMENS" } },
    create: { eventId: event.id, name: "College Women", gender: "WOMENS", sortOrder: 2 },
    update: {},
  });

  await seedTeams(event.id, men.id, mensTeams);
  await seedTeams(event.id, women.id, womensTeams);

  await prisma.bonusQuestion.upsert({
    where: { id: "seed-bonus-regions" },
    create: {
      id: "seed-bonus-regions",
      eventId: event.id,
      prompt: "How many regions will produce at least one semifinalist?",
      points: 8,
      options: {
        create: ["1-2", "3", "4+"].map((label, sortOrder) => ({ label, sortOrder })),
      },
    },
    update: {},
  });

  const menOne = await prisma.team.findFirstOrThrow({ where: { eventId: event.id, divisionId: men.id, seed: 1 } });
  const menEight = await prisma.team.findFirstOrThrow({ where: { eventId: event.id, divisionId: men.id, seed: 8 } });
  const womenOne = await prisma.team.findFirstOrThrow({ where: { eventId: event.id, divisionId: women.id, seed: 1 } });
  const womenEight = await prisma.team.findFirstOrThrow({ where: { eventId: event.id, divisionId: women.id, seed: 8 } });

  await prisma.game.upsert({
    where: { id: "seed-men-pool-game" },
    create: {
      id: "seed-men-pool-game",
      eventId: event.id,
      divisionId: men.id,
      stage: "POOL",
      pool: "A",
      label: "Pool A",
      team1Id: menOne.id,
      team2Id: menEight.id,
      sortOrder: 1,
    },
    update: {},
  });
  await prisma.game.upsert({
    where: { id: "seed-women-pool-game" },
    create: {
      id: "seed-women-pool-game",
      eventId: event.id,
      divisionId: women.id,
      stage: "POOL",
      pool: "A",
      label: "Pool A",
      team1Id: womenOne.id,
      team2Id: womenEight.id,
      sortOrder: 2,
    },
    update: {},
  });

  await recalculateEventScores(event.id);
}

async function seedTeams(eventId: string, divisionId: string, names: string[]) {
  for (const [index, name] of names.entries()) {
    const seed = index + 1;
    await prisma.team.upsert({
      where: { eventId_divisionId_seed: { eventId, divisionId, seed } },
      create: {
        eventId,
        divisionId,
        name,
        seed,
        bucket: bucketForSeed(seed),
        pool: String.fromCharCode(65 + Math.floor(index / 4)),
      },
      update: {},
    });
  }
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
