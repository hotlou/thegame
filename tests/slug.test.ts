import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "@/lib/slug";

describe("slug helpers", () => {
  it("normalizes event and division names into stable url-safe keys", () => {
    expect(slugify("Masters Nationals: Grand Masters Women")).toBe("masters-nationals-grand-masters-women");
  });

  it("keeps same-category divisions distinct inside one event", () => {
    expect(uniqueSlug("College Women", ["college-women", "college-women-2"])).toBe("college-women-3");
  });
});
