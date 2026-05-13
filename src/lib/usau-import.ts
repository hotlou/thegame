import * as cheerio from "cheerio";
import { z } from "zod";
import { bucketForSeed } from "@/lib/rules";

export const importDraftSchema = z.object({
  divisionName: z.string().min(1),
  gender: z.enum(["MENS", "WOMENS", "MIXED", "OTHER"]),
  sourceUrl: z.string().url().optional(),
  teams: z.array(
    z.object({
      name: z.string().min(1),
      seed: z.number().int().min(1).max(99),
      bucket: z.number().int().min(1).max(3),
      pool: z.string().optional(),
    }),
  ),
  games: z.array(
    z.object({
      stage: z.enum(["POOL", "PREQUARTER", "QUARTER", "SEMI", "FINAL", "OTHER"]),
      label: z.string().optional(),
      pool: z.string().optional(),
      championshipPath: z.boolean(),
      sourceGameKey: z.string(),
      team1Name: z.string().optional(),
      team2Name: z.string().optional(),
      team1Score: z.number().int().optional(),
      team2Score: z.number().int().optional(),
      status: z.enum(["SCHEDULED", "FINAL"]),
      sortOrder: z.number().int(),
    }),
  ),
});

export type ImportDraft = z.infer<typeof importDraftSchema>;

const teamTextPattern = /^(.+?)\s+\((\d{1,2})\)$/;

function cleanText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function inferGender(text: string): "MENS" | "WOMENS" | "MIXED" | "OTHER" {
  if (/\b(mixed|mix)\b/i.test(text)) return "MIXED";
  return /\b(women|women's|womens)\b/i.test(text) ? "WOMENS" : "MENS";
}

function stageFromHeading(heading: string): ImportDraft["games"][number]["stage"] {
  const normalized = heading.toLowerCase();
  if (normalized.includes("pre-quarter") || normalized.includes("prequarter")) return "PREQUARTER";
  if (normalized.includes("quarterfinal")) return "QUARTER";
  if (normalized.includes("semifinal")) return "SEMI";
  if (normalized.includes("final")) return "FINAL";
  if (normalized.includes("pool")) return "POOL";
  return "OTHER";
}

export function parseUsauScheduleHtml(html: string, sourceUrl?: string): ImportDraft {
  const $ = cheerio.load(html);
  const titleText = cleanText($("h1").first().text() || $("title").first().text() || "Imported Division");
  const gender = inferGender(titleText + " " + sourceUrl);
  const teams = new Map<string, ImportDraft["teams"][number]>();
  const sectionLabels = new Map<string, string>();

  $(".tabs a[rel]").each((_, element) => {
    const id = $(element).attr("rel");
    if (id) sectionLabels.set(id, cleanText($(element).text()));
  });

  $("a").each((_, element) => {
    const match = cleanText($(element).text()).match(teamTextPattern);
    if (!match) return;
    const name = match[1].trim();
    const seed = Number(match[2]);
    if (!Number.isFinite(seed)) return;
    teams.set(`${name}:${seed}`, {
      name,
      seed,
      bucket: bucketForSeed(seed),
    });
  });

  const headings = $("h2,h3,h4").toArray();
  for (const headingElement of headings) {
    const heading = cleanText($(headingElement).text());
    const poolMatch = heading.match(/^Pool\s+([A-Z0-9]+)/i);
    if (!poolMatch) continue;

    let cursor = $(headingElement).next();
    while (cursor.length && !["h2", "h3", "h4"].includes(cursor[0].tagName.toLowerCase())) {
      cursor.find("a").each((_, anchor) => {
        const match = cleanText($(anchor).text()).match(teamTextPattern);
        if (!match) return;
        const key = `${match[1].trim()}:${Number(match[2])}`;
        const team = teams.get(key);
        if (team) team.pool = poolMatch[1].toUpperCase();
      });
      cursor = cursor.next();
    }
  }

  let games = parseStructuredGames($, sectionLabels);

  if (!games.length) {
    games = parseTextFallback($, teams);
  }

  return importDraftSchema.parse({
    divisionName: titleText,
    gender,
    sourceUrl,
    teams: [...teams.values()].sort((a, b) => a.seed - b.seed),
    games,
  });
}

function parseStructuredGames(
  $: cheerio.CheerioAPI,
  sectionLabels: Map<string, string>,
): ImportDraft["games"] {
  const games: ImportDraft["games"] = [];

  $("tr[data-game]").each((_, element) => {
    const row = $(element);
    const gameId = row.attr("data-game");
    const table = row.closest("table");
    const tableLabel = cleanText(table.find("thead th").first().text());
    const pool = tableLabel.match(/Pool\s+([A-Z0-9]+)/i)?.[1]?.toUpperCase();
    const team1Name = teamNameFromText(cleanText(row.find('[data-type="game-team-home"] a').first().text()));
    const team2Name = teamNameFromText(cleanText(row.find('[data-type="game-team-away"] a').first().text()));
    const team1Score = parseScore(row.find('[data-type="game-score-home"]').first().text());
    const team2Score = parseScore(row.find('[data-type="game-score-away"]').first().text());
    const statusText = cleanText(row.find('[data-type="game-status"]').first().text());

    games.push({
      stage: "POOL",
      label: pool ? `Pool ${pool}` : tableLabel || "Pool play",
      pool,
      championshipPath: true,
      sourceGameKey: gameId
        ? `usau:${gameId}`
        : makeSourceGameKey({ stage: "POOL", pool, team1Name, team2Name, sortOrder: games.length }),
      team1Name,
      team2Name,
      team1Score,
      team2Score,
      status: finalStatus(statusText, team1Score, team2Score),
      sortOrder: games.length,
    });
  });

  $(".bracket_game[id^='game']").each((_, element) => {
    const game = $(element);
    const rawId = game.attr("id")?.replace(/^game/, "");
    const round = cleanText(game.closest(".bracket_col").find(".col_title").first().text());
    const slideLabel = cleanText(game.closest(".mod_slide").find(".slide_trigger").first().text());
    const sectionId = game.parents("div[id^='section_']").first().attr("id");
    const tabLabel = sectionId ? sectionLabels.get(sectionId) : undefined;
    const stage = stageFromHeading(round || slideLabel);
    const team1Name = teamNameFromText(cleanText(game.find('[data-type="game-team-home"] a').first().text()));
    const team2Name = teamNameFromText(cleanText(game.find('[data-type="game-team-away"] a').first().text()));
    const team1Score = parseScore(game.find('[data-type="game-score-home"]').first().text());
    const team2Score = parseScore(game.find('[data-type="game-score-away"]').first().text());
    const statusText = cleanText(game.find(".game-status").first().text());
    const championshipPath = Boolean(
      tabLabel?.toLowerCase().includes("championship") || slideLabel.toLowerCase().includes("1st place"),
    );

    games.push({
      stage,
      label: championshipPath ? round || readableStage(stage) : [slideLabel, round].filter(Boolean).join(" - "),
      championshipPath,
      sourceGameKey: rawId
        ? `usau:${rawId}`
        : makeSourceGameKey({ stage, team1Name, team2Name, sortOrder: games.length }),
      team1Name,
      team2Name,
      team1Score,
      team2Score,
      status: finalStatus(statusText, team1Score, team2Score),
      sortOrder: games.length,
    });
  });

  return games;
}

function parseTextFallback($: cheerio.CheerioAPI, teams: Map<string, ImportDraft["teams"][number]>) {
  const bodyText = cleanText($("body").text());
  const teamNames = [...teams.values()].map((team) => team.name).sort((a, b) => b.length - a.length);
  const games: ImportDraft["games"] = [];

  let currentStage: ImportDraft["games"][number]["stage"] = "OTHER";
  let currentPool: string | undefined;
  const chunks = bodyText
    .replace(/(Pool [A-Z0-9]+ Schedule & Scores)/g, "|$1|")
    .replace(/(Pre-quarterfinals|Quarterfinals|Semifinals|Final)/gi, "|$1|")
    .split("|")
    .map(cleanText)
    .filter(Boolean);

  for (const chunk of chunks) {
    const headingStage = stageFromHeading(chunk);
    if (headingStage !== "OTHER" && chunk.length < 80) {
      currentStage = headingStage;
      currentPool = chunk.match(/Pool\s+([A-Z0-9]+)/i)?.[1]?.toUpperCase();
      continue;
    }

    const presentTeams = teamNames.filter((name) => new RegExp(`\\b${escapeRegExp(name)}\\b`).test(chunk));
    if (presentTeams.length < 2) continue;

    const scoreMatch = chunk.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s+Final/i);
    games.push({
      stage: currentStage,
      label: currentStage === "POOL" && currentPool ? `Pool ${currentPool}` : undefined,
      pool: currentPool,
      championshipPath: currentStage !== "OTHER",
      sourceGameKey: makeSourceGameKey({
        stage: currentStage,
        pool: currentPool,
        team1Name: presentTeams[0],
        team2Name: presentTeams[1],
        sortOrder: games.length,
      }),
      team1Name: presentTeams[0],
      team2Name: presentTeams[1],
      team1Score: scoreMatch ? Number(scoreMatch[1]) : undefined,
      team2Score: scoreMatch ? Number(scoreMatch[2]) : undefined,
      status: scoreMatch ? "FINAL" : "SCHEDULED",
      sortOrder: games.length,
    });
  }

  return games;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function teamNameFromText(value: string) {
  return value.match(teamTextPattern)?.[1]?.trim() || value || undefined;
}

function parseScore(value: string) {
  const score = Number(cleanText(value));
  return Number.isInteger(score) ? score : undefined;
}

function finalStatus(statusText: string, team1Score?: number, team2Score?: number): "SCHEDULED" | "FINAL" {
  return /final/i.test(statusText) && team1Score != null && team2Score != null ? "FINAL" : "SCHEDULED";
}

function readableStage(stage: string) {
  return stage
    .toLowerCase()
    .split("_")
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(" ");
}

export function makeSourceGameKey({
  stage,
  pool,
  team1Name,
  team2Name,
  sortOrder,
}: {
  stage: string;
  pool?: string;
  team1Name?: string;
  team2Name?: string;
  sortOrder?: number;
}) {
  const teams = [team1Name, team2Name].filter(Boolean).map((name) => normalizeKeyPart(name!)).sort();
  const matchup = teams.length === 2 ? teams.join("-v-") : `slot-${sortOrder ?? 0}`;
  return [normalizeKeyPart(stage), normalizeKeyPart(pool ?? "none"), matchup].join(":");
}

function normalizeKeyPart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "none";
}
