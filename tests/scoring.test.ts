import { describe, expect, it } from "vitest";
import { calculateEntryTeamPoints, calculateTeamScores } from "@/lib/scoring";

const teams = [
  { id: "a", name: "A", bucket: 1, divisionId: "men", pool: "A", poolRank: 1 },
  { id: "b", name: "B", bucket: 2, divisionId: "men", pool: "A", poolRank: 2 },
  { id: "c", name: "C", bucket: 3, divisionId: "women", pool: "B", poolRank: null },
  { id: "d", name: "D", bucket: 2, divisionId: "women", pool: "B", poolRank: null },
];

describe("scoring", () => {
  it("scores championship path games and pool winners", () => {
    const scores = calculateTeamScores(teams, [
      {
        id: "g1",
        stage: "POOL",
        divisionId: "men",
        pool: "A",
        championshipPath: true,
        team1Id: "a",
        team2Id: "b",
        team1Score: 15,
        team2Score: 10,
        status: "FINAL",
      },
      {
        id: "g2",
        stage: "QUARTER",
        divisionId: "men",
        championshipPath: true,
        team1Id: "a",
        team2Id: "b",
        team1Score: 13,
        team2Score: 15,
        status: "FINAL",
      },
      {
        id: "g3",
        stage: "SEMI",
        divisionId: "men",
        championshipPath: false,
        team1Id: "a",
        team2Id: "b",
        team1Score: 15,
        team2Score: 1,
        status: "FINAL",
      },
    ]);

    const a = scores.find((score) => score.teamId === "a")!;
    const b = scores.find((score) => score.teamId === "b")!;
    expect(a.basePoints).toBe(20);
    expect(a.poolWinner).toBe(true);
    expect(b.basePoints).toBe(15);
  });

  it("applies the bonus multiplier to the designated team's full score", () => {
    const scoreMap = new Map([
      ["a", { teamId: "a", poolWins: 0, poolWinner: false, prequarterWins: 0, quarterWins: 0, semiWins: 0, finalWins: 0, basePoints: 50 }],
      ["b", { teamId: "b", poolWins: 0, poolWinner: false, prequarterWins: 0, quarterWins: 0, semiWins: 0, finalWins: 0, basePoints: 30 }],
    ]);

    const result = calculateEntryTeamPoints(
      [
        { teamId: "a", kind: "REGULAR", teamBucket: 1 },
        { teamId: "b", kind: "BONUS", teamBucket: 2 },
      ],
      scoreMap,
    );

    expect(result.total).toBe(89);
  });
});
