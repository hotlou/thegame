import { makeSourceGameKey, type ImportDraft } from "@/lib/usau-import";

type TeamRef = {
  id: string;
  name: string;
};

type ExistingGame = {
  id: string;
  stage: string;
  label: string | null;
  pool: string | null;
  championshipPath: boolean;
  team1Id: string | null;
  team2Id: string | null;
  team1Score: number | null;
  team2Score: number | null;
  status: string;
  manualOverride: boolean;
  sourceGameKey: string | null;
  team1: TeamRef | null;
  team2: TeamRef | null;
};

export type ResultsImportAction =
  | "NEW_GAME"
  | "UPDATE_RESULT"
  | "UNCHANGED"
  | "MANUAL_CONFLICT"
  | "UNMATCHED_TEAM"
  | "SCHEDULED_ONLY";

export type ResultsImportPreviewItem = {
  action: ResultsImportAction;
  sourceGameKey: string;
  stage: string;
  label: string;
  imported: {
    team1Name?: string;
    team2Name?: string;
    team1Score?: number;
    team2Score?: number;
    status: string;
  };
  existing?: {
    gameId: string;
    team1Name?: string;
    team2Name?: string;
    team1Score?: number | null;
    team2Score?: number | null;
    status: string;
    manualOverride: boolean;
  };
};

export function buildResultsImportPreview({
  draft,
  teams,
  existingGames,
}: {
  draft: ImportDraft;
  teams: TeamRef[];
  existingGames: ExistingGame[];
}) {
  const teamByName = mapTeamsByName(teams);
  const existingByKey = indexExistingGames(existingGames);

  const items: ResultsImportPreviewItem[] = draft.games.map((game) => {
    const sourceGameKey =
      game.sourceGameKey ||
      makeSourceGameKey({
        stage: game.stage,
        pool: game.pool,
        team1Name: game.team1Name,
        team2Name: game.team2Name,
        sortOrder: game.sortOrder,
      });
    const fallbackSourceGameKey = makeSourceGameKey({
      stage: game.stage,
      pool: game.pool,
      team1Name: game.team1Name,
      team2Name: game.team2Name,
      sortOrder: game.sortOrder,
    });
    const label = game.label ?? game.pool ?? readableStage(game.stage);
    const team1 = game.team1Name ? teamByName.get(normalizeName(game.team1Name)) : null;
    const team2 = game.team2Name ? teamByName.get(normalizeName(game.team2Name)) : null;
    const existing = existingByKey.get(sourceGameKey) ?? existingByKey.get(fallbackSourceGameKey);

    if (!team1 || !team2) {
      return {
        action: "UNMATCHED_TEAM",
        sourceGameKey,
        stage: game.stage,
        label,
        imported: importedSummary(game),
        existing: existing ? existingSummary(existing) : undefined,
      };
    }

    if (!existing) {
      return {
        action: game.status === "FINAL" ? "NEW_GAME" : "SCHEDULED_ONLY",
        sourceGameKey,
        stage: game.stage,
        label,
        imported: importedSummary(game),
      };
    }

    if (game.status !== "FINAL") {
      return {
        action: "SCHEDULED_ONLY",
        sourceGameKey,
        stage: game.stage,
        label,
        imported: importedSummary(game),
        existing: existingSummary(existing),
      };
    }

    if (scoresMatch(existing, game) && existing.status === game.status) {
      return {
        action: "UNCHANGED",
        sourceGameKey,
        stage: game.stage,
        label,
        imported: importedSummary(game),
        existing: existingSummary(existing),
      };
    }

    if (existing.manualOverride && game.status === "FINAL") {
      return {
        action: "MANUAL_CONFLICT",
        sourceGameKey,
        stage: game.stage,
        label,
        imported: importedSummary(game),
        existing: existingSummary(existing),
      };
    }

    return {
      action: game.status === "FINAL" ? "UPDATE_RESULT" : "SCHEDULED_ONLY",
      sourceGameKey,
      stage: game.stage,
      label,
      imported: importedSummary(game),
      existing: existingSummary(existing),
    };
  });

  return {
    items,
    counts: items.reduce(
      (counts, item) => {
        counts[item.action] += 1;
        return counts;
      },
      {
        NEW_GAME: 0,
        UPDATE_RESULT: 0,
        UNCHANGED: 0,
        MANUAL_CONFLICT: 0,
        UNMATCHED_TEAM: 0,
        SCHEDULED_ONLY: 0,
      } satisfies Record<ResultsImportAction, number>,
    ),
  };
}

export function mapTeamsByName(teams: TeamRef[]) {
  return new Map(teams.map((team) => [normalizeName(team.name), team]));
}

export function normalizeName(name: string) {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

function existingGameKey(game: ExistingGame) {
  return makeSourceGameKey({
    stage: game.stage,
    pool: game.pool ?? undefined,
    team1Name: game.team1?.name,
    team2Name: game.team2?.name,
  });
}

function indexExistingGames(games: ExistingGame[]) {
  const buckets = new Map<string, ExistingGame[]>();
  for (const game of games) {
    for (const key of new Set([game.sourceGameKey, existingGameKey(game)].filter(Boolean) as string[])) {
      buckets.set(key, [...(buckets.get(key) ?? []), game]);
    }
  }

  const index = new Map<string, ExistingGame>();
  for (const [key, matches] of buckets) {
    if (matches.length === 1) index.set(key, matches[0]);
  }
  return index;
}

function scoresMatch(existing: ExistingGame, imported: ImportDraft["games"][number]) {
  return existing.team1Score === (imported.team1Score ?? null) && existing.team2Score === (imported.team2Score ?? null);
}

function importedSummary(game: ImportDraft["games"][number]) {
  return {
    team1Name: game.team1Name,
    team2Name: game.team2Name,
    team1Score: game.team1Score,
    team2Score: game.team2Score,
    status: game.status,
  };
}

function existingSummary(game: ExistingGame) {
  return {
    gameId: game.id,
    team1Name: game.team1?.name,
    team2Name: game.team2?.name,
    team1Score: game.team1Score,
    team2Score: game.team2Score,
    status: game.status,
    manualOverride: game.manualOverride,
  };
}

function readableStage(stage: string) {
  return stage
    .toLowerCase()
    .split("_")
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(" ");
}
