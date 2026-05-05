import { bonusMultiplierForBucket } from "@/lib/rules";

export type ScoringStage = "POOL" | "PREQUARTER" | "QUARTER" | "SEMI" | "FINAL" | "OTHER";

export type ScoringTeam = {
  id: string;
  name: string;
  bucket: number;
  divisionId: string;
  pool?: string | null;
  poolRank?: number | null;
};

export type ScoringGame = {
  id: string;
  stage: ScoringStage;
  divisionId: string;
  pool?: string | null;
  championshipPath: boolean;
  team1Id?: string | null;
  team2Id?: string | null;
  team1Score?: number | null;
  team2Score?: number | null;
  status: "SCHEDULED" | "FINAL";
};

export type TeamScoreSummary = {
  teamId: string;
  poolWins: number;
  poolWinner: boolean;
  prequarterWins: number;
  quarterWins: number;
  semiWins: number;
  finalWins: number;
  basePoints: number;
};

export type EntryPickScore = {
  teamId: string;
  kind: "REGULAR" | "BONUS";
  teamBucket: number;
  basePoints: number;
  scoredPoints: number;
};

export const pointsByStage: Record<Exclude<ScoringStage, "OTHER">, number> = {
  POOL: 10,
  PREQUARTER: 10,
  QUARTER: 15,
  SEMI: 20,
  FINAL: 25,
};

function winningTeamId(game: ScoringGame) {
  if (
    game.status !== "FINAL" ||
    !game.team1Id ||
    !game.team2Id ||
    game.team1Score == null ||
    game.team2Score == null ||
    game.team1Score === game.team2Score
  ) {
    return null;
  }

  return game.team1Score > game.team2Score ? game.team1Id : game.team2Id;
}

function blankTeamScore(teamId: string): TeamScoreSummary {
  return {
    teamId,
    poolWins: 0,
    poolWinner: false,
    prequarterWins: 0,
    quarterWins: 0,
    semiWins: 0,
    finalWins: 0,
    basePoints: 0,
  };
}

export function calculateTeamScores(teams: ScoringTeam[], games: ScoringGame[]) {
  const scores = new Map(teams.map((team) => [team.id, blankTeamScore(team.id)]));
  const teamById = new Map(teams.map((team) => [team.id, team]));

  for (const game of games) {
    if (!game.championshipPath) continue;
    const winnerId = winningTeamId(game);
    if (!winnerId) continue;
    const score = scores.get(winnerId);
    if (!score) continue;

    if (game.stage === "POOL") score.poolWins += 1;
    if (game.stage === "PREQUARTER") score.prequarterWins += 1;
    if (game.stage === "QUARTER") score.quarterWins += 1;
    if (game.stage === "SEMI") score.semiWins += 1;
    if (game.stage === "FINAL") score.finalWins += 1;
  }

  const explicitPoolWinners = teams.filter((team) => team.poolRank === 1);
  for (const team of explicitPoolWinners) {
    scores.get(team.id)!.poolWinner = true;
  }

  const poolKeys = new Set(
    teams
      .filter((team) => team.pool && team.poolRank == null)
      .map((team) => `${team.divisionId}:${team.pool}`),
  );

  for (const poolKey of poolKeys) {
    const [divisionId, pool] = poolKey.split(":");
    const poolTeams = teams.filter(
      (team) => team.divisionId === divisionId && team.pool === pool && team.poolRank == null,
    );
    const maxWins = Math.max(...poolTeams.map((team) => scores.get(team.id)?.poolWins ?? 0));
    const winners = poolTeams.filter((team) => (scores.get(team.id)?.poolWins ?? 0) === maxWins);
    if (winners.length === 1 && maxWins > 0) {
      scores.get(winners[0].id)!.poolWinner = true;
    }
  }

  for (const score of scores.values()) {
    score.basePoints =
      score.poolWins * pointsByStage.POOL +
      (score.poolWinner ? pointsByStage.POOL : 0) +
      score.prequarterWins * pointsByStage.PREQUARTER +
      score.quarterWins * pointsByStage.QUARTER +
      score.semiWins * pointsByStage.SEMI +
      score.finalWins * pointsByStage.FINAL;
  }

  return [...scores.values()].sort((a, b) => {
    const teamA = teamById.get(a.teamId)?.name ?? "";
    const teamB = teamById.get(b.teamId)?.name ?? "";
    return teamA.localeCompare(teamB);
  });
}

export function calculateEntryTeamPoints(
  picks: Array<{ teamId: string; kind: "REGULAR" | "BONUS"; teamBucket: number }>,
  teamScores: Map<string, TeamScoreSummary>,
) {
  const pickScores: EntryPickScore[] = picks.map((pick) => {
    const basePoints = teamScores.get(pick.teamId)?.basePoints ?? 0;
    const scoredPoints =
      pick.kind === "BONUS" ? basePoints * bonusMultiplierForBucket(pick.teamBucket) : basePoints;
    return { ...pick, basePoints, scoredPoints };
  });

  return {
    pickScores,
    total: pickScores.reduce((sum, pick) => sum + pick.scoredPoints, 0),
  };
}
