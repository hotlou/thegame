"use server";

import { getPrisma } from "@/lib/prisma";
import { calculateEntryTeamPoints, calculateTeamScores, type TeamScoreSummary } from "@/lib/scoring";

export async function recalculateEventScores(eventId: string) {
  const prisma = getPrisma();
  const [teams, games] = await Promise.all([
    prisma.team.findMany({
      where: { eventId },
      include: { division: true },
    }),
    prisma.game.findMany({ where: { eventId } }),
  ]);

  const teamScores = calculateTeamScores(
    teams.map((team) => ({
      id: team.id,
      name: team.name,
      bucket: team.bucket,
      divisionId: team.divisionId,
      pool: team.pool,
      poolRank: team.poolRank,
    })),
    games.map((game) => ({
      id: game.id,
      stage: game.stage,
      divisionId: game.divisionId,
      pool: game.pool,
      championshipPath: game.championshipPath,
      team1Id: game.team1Id,
      team2Id: game.team2Id,
      team1Score: game.team1Score,
      team2Score: game.team2Score,
      status: game.status,
    })),
  );

  await Promise.all(
    teamScores.map((score) =>
      prisma.teamScore.upsert({
        where: { eventId_teamId: { eventId, teamId: score.teamId } },
        create: { eventId, ...score },
        update: score,
      }),
    ),
  );

  const teamScoreMap = new Map<string, TeamScoreSummary>(teamScores.map((score) => [score.teamId, score]));
  const entries = await prisma.entry.findMany({
    where: { eventId },
    include: {
      picks: { include: { team: true } },
      bonusAnswers: { include: { option: true, question: true } },
    },
  });

  await Promise.all(
    entries.map(async (entry) => {
      const teamPoints = calculateEntryTeamPoints(
        entry.picks.map((pick) => ({
          teamId: pick.teamId,
          kind: pick.kind,
          teamBucket: pick.team.bucket,
        })),
        teamScoreMap,
      ).total;

      const bonusQuestionPoints = entry.bonusAnswers.reduce((sum, answer) => {
        return sum + (answer.option.isCorrect ? answer.question.points : 0);
      }, 0);

      await prisma.entryScore.upsert({
        where: { entryId: entry.id },
        create: {
          entryId: entry.id,
          teamPoints,
          bonusQuestionPoints,
          totalPoints: teamPoints + bonusQuestionPoints,
        },
        update: {
          teamPoints,
          bonusQuestionPoints,
          totalPoints: teamPoints + bonusQuestionPoints,
        },
      });
    }),
  );
}
