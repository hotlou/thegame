import { describe, expect, it } from "vitest";
import { buildResultsImportPreview } from "@/lib/result-import";
import type { ImportDraft } from "@/lib/usau-import";

const teams = [
  { id: "team-1", name: "Pleiades" },
  { id: "team-2", name: "Fugue" },
];

describe("results import preview", () => {
  it("matches old synthetic game keys when a USAU id import is unambiguous", () => {
    const draft = {
      divisionName: "College - Women",
      gender: "WOMENS",
      teams: [],
      games: [
        {
          stage: "POOL",
          label: "Pool A",
          pool: "A",
          championshipPath: true,
          sourceGameKey: "usau:1001",
          team1Name: "Pleiades",
          team2Name: "Fugue",
          team1Score: 15,
          team2Score: 9,
          status: "FINAL",
          sortOrder: 0,
        },
      ],
    } satisfies ImportDraft;

    const preview = buildResultsImportPreview({
      draft,
      teams,
      existingGames: [
        {
          id: "game-1",
          stage: "POOL",
          label: "Pool A",
          pool: "A",
          championshipPath: true,
          team1Id: "team-1",
          team2Id: "team-2",
          team1Score: null,
          team2Score: null,
          status: "SCHEDULED",
          manualOverride: false,
          sourceGameKey: "pool:a:fugue-v-pleiades",
          team1: teams[0],
          team2: teams[1],
        },
      ],
    });

    expect(preview.items[0].action).toBe("UPDATE_RESULT");
    expect(preview.items[0].existing?.gameId).toBe("game-1");
  });

  it("labels matching scheduled games as schedule-only instead of unchanged", () => {
    const draft = {
      divisionName: "College - Women",
      gender: "WOMENS",
      teams: [],
      games: [
        {
          stage: "POOL",
          label: "Pool A",
          pool: "A",
          championshipPath: true,
          sourceGameKey: "usau:1001",
          team1Name: "Pleiades",
          team2Name: "Fugue",
          status: "SCHEDULED",
          sortOrder: 0,
        },
      ],
    } satisfies ImportDraft;

    const preview = buildResultsImportPreview({
      draft,
      teams,
      existingGames: [
        {
          id: "game-1",
          stage: "POOL",
          label: "Pool A",
          pool: "A",
          championshipPath: true,
          team1Id: "team-1",
          team2Id: "team-2",
          team1Score: null,
          team2Score: null,
          status: "SCHEDULED",
          manualOverride: false,
          sourceGameKey: "usau:1001",
          team1: teams[0],
          team2: teams[1],
        },
      ],
    });

    expect(preview.items[0].action).toBe("SCHEDULED_ONLY");
    expect(preview.counts.SCHEDULED_ONLY).toBe(1);
    expect(preview.counts.UNCHANGED).toBe(0);
  });
});
