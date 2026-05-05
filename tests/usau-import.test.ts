import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseUsauScheduleHtml } from "@/lib/usau-import";

describe("USAU import parser", () => {
  it("extracts teams and a draft from a USAU-shaped page", () => {
    const html = readFileSync(join(process.cwd(), "tests/fixtures/usau-schedule.html"), "utf8");
    const draft = parseUsauScheduleHtml(html, "https://play.usaultimate.org/events/example/schedule/Women/College-Women/");

    expect(draft.gender).toBe("WOMENS");
    expect(draft.teams).toHaveLength(2);
    expect(draft.teams[0]).toMatchObject({ name: "Pleiades", seed: 1, bucket: 1, pool: "A" });
    expect(draft.games.length).toBeGreaterThanOrEqual(1);
  });
});
