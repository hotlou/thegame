import { describe, expect, it } from "vitest";
import { bucketForSeed, validateEntrySelection, type EntryTeam } from "@/lib/rules";

const teams: EntryTeam[] = [
  { id: "m1", name: "Men 1", seed: 1, bucket: 1, divisionGender: "MENS" },
  { id: "m6", name: "Men 6", seed: 6, bucket: 2, divisionGender: "MENS" },
  { id: "m13", name: "Men 13", seed: 13, bucket: 3, divisionGender: "MENS" },
  { id: "w2", name: "Women 2", seed: 2, bucket: 1, divisionGender: "WOMENS" },
  { id: "w7", name: "Women 7", seed: 7, bucket: 2, divisionGender: "WOMENS" },
  { id: "w14", name: "Women 14", seed: 14, bucket: 3, divisionGender: "WOMENS" },
];

describe("entry rules", () => {
  it("maps seeds into the three College D-I buckets", () => {
    expect(bucketForSeed(1)).toBe(1);
    expect(bucketForSeed(5)).toBe(1);
    expect(bucketForSeed(6)).toBe(2);
    expect(bucketForSeed(12)).toBe(2);
    expect(bucketForSeed(13)).toBe(3);
    expect(bucketForSeed(20)).toBe(3);
  });

  it("accepts a valid four regular pick plus bonus team entry", () => {
    expect(
      validateEntrySelection(
        {
          displayName: "Keith",
          picks: { B1: "m1", B2A: "m6", B2B: "w7", B3: "w14", BONUS: "w2" },
        },
        teams,
      ),
    ).toEqual([]);
  });

  it("rejects duplicate teams and failed division minimums", () => {
    const errors = validateEntrySelection(
      {
        displayName: "Keith",
        picks: { B1: "m1", B2A: "m6", B2B: "m6", B3: "m13", BONUS: "w2" },
      },
      teams,
    );
    expect(errors).toContain("Each selected team must be unique.");
    expect(errors).toContain("Entries must include at least two men's teams and two women's teams.");
  });
});
