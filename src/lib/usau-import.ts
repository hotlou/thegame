import * as cheerio from "cheerio";
import { z } from "zod";
import { bucketForSeed } from "@/lib/rules";

export const importDraftSchema = z.object({
  divisionName: z.string().min(1),
  gender: z.enum(["MENS", "WOMENS"]),
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

function inferGender(text: string): "MENS" | "WOMENS" {
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
      team1Name: presentTeams[0],
      team2Name: presentTeams[1],
      team1Score: scoreMatch ? Number(scoreMatch[1]) : undefined,
      team2Score: scoreMatch ? Number(scoreMatch[2]) : undefined,
      status: scoreMatch ? "FINAL" : "SCHEDULED",
      sortOrder: games.length,
    });
  }

  return importDraftSchema.parse({
    divisionName: titleText,
    gender,
    sourceUrl,
    teams: [...teams.values()].sort((a, b) => a.seed - b.seed),
    games,
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
