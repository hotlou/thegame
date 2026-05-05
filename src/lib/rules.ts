import { z } from "zod";

export const regularSlots = ["B1", "B2A", "B2B", "B3"] as const;
export const allPickSlots = [...regularSlots, "BONUS"] as const;

export type PickSlot = (typeof allPickSlots)[number];
export type DivisionGender = "MENS" | "WOMENS";

export type EntryTeam = {
  id: string;
  name: string;
  seed: number;
  bucket: number;
  divisionGender: DivisionGender;
};

export type EntrySelection = {
  displayName: string;
  picks: Record<PickSlot, string>;
  bonusAnswers?: Record<string, string>;
};

export const entrySelectionSchema = z.object({
  displayName: z.string().trim().min(2, "Display name is required").max(80),
  picks: z.object({
    B1: z.string().min(1),
    B2A: z.string().min(1),
    B2B: z.string().min(1),
    B3: z.string().min(1),
    BONUS: z.string().min(1),
  }),
  bonusAnswers: z.record(z.string(), z.string()).optional(),
});

export function bucketForSeed(seed: number) {
  if (seed >= 1 && seed <= 5) return 1;
  if (seed >= 6 && seed <= 12) return 2;
  if (seed >= 13 && seed <= 20) return 3;
  throw new Error(`Seed ${seed} is outside the supported College D-I field.`);
}

export function bonusMultiplierForBucket(bucket: number) {
  if (bucket === 1) return 1;
  if (bucket === 2) return 1.3;
  if (bucket === 3) return 2;
  return 1;
}

export function validateEntrySelection(selection: EntrySelection, teams: EntryTeam[]) {
  const parsed = entrySelectionSchema.safeParse(selection);
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => issue.message);
  }

  const errors: string[] = [];
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const pickedIds = allPickSlots.map((slot) => selection.picks[slot]);
  const pickedTeams = pickedIds.map((id) => teamById.get(id));

  if (new Set(pickedIds).size !== pickedIds.length) {
    errors.push("Each selected team must be unique.");
  }

  if (pickedTeams.some((team) => !team)) {
    errors.push("Every pick must reference a valid team.");
  }

  const regularPicks = regularSlots.map((slot) => teamById.get(selection.picks[slot]));
  if (regularPicks[0]?.bucket !== 1) {
    errors.push("The bucket 1 slot must be a seed from 1-5.");
  }
  if (regularPicks[1]?.bucket !== 2 || regularPicks[2]?.bucket !== 2) {
    errors.push("Both bucket 2 slots must be seeds from 6-12.");
  }
  if (regularPicks[3]?.bucket !== 3) {
    errors.push("The bucket 3 slot must be a seed from 13-20.");
  }

  const mens = pickedTeams.filter((team) => team?.divisionGender === "MENS").length;
  const womens = pickedTeams.filter((team) => team?.divisionGender === "WOMENS").length;
  if (mens < 2 || womens < 2) {
    errors.push("Entries must include at least two men's teams and two women's teams.");
  }

  return errors;
}
