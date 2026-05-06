"use client";

import { useMemo, useState } from "react";

type Team = {
  id: string;
  name: string;
  seed: number;
  bucket: number;
  division: { gender: string };
};

type Slot = {
  name: string;
  label: string;
  helper: string;
  bucket: number | "ANY";
  value?: string;
};

export function TeamPicker({
  slots,
  teams,
  disabled,
}: {
  slots: Slot[];
  teams: Team[];
  disabled?: boolean;
}) {
  const [openSlot, setOpenSlot] = useState(slots[0]?.name ?? "");
  const [selected, setSelected] = useState<Record<string, string>>(
    Object.fromEntries(slots.map((slot) => [slot.name, slot.value ?? ""])),
  );
  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);

  function choose(slotName: string, teamId: string) {
    setSelected((current) => ({
      ...current,
      [slotName]: current[slotName] === teamId ? "" : teamId,
    }));
  }

  return (
    <div className="space-y-3">
      {slots.map((slot) => {
        const selectedTeam = selected[slot.name] ? teamById.get(selected[slot.name]) : null;
        const slotTeams = teams.filter((team) => slot.bucket === "ANY" || team.bucket === slot.bucket);
        const isOpen = openSlot === slot.name;

        return (
          <section key={slot.name} className="rounded-lg border border-[var(--line)] bg-white">
            <input type="hidden" name={slot.name} value={selected[slot.name] ?? ""} required />
            <button
              type="button"
              disabled={disabled}
              onClick={() => setOpenSlot(isOpen ? "" : slot.name)}
              className="focus-ring flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span>
                <span className="block text-sm font-bold">{slot.label}</span>
                <span className="mt-1 block text-xs text-[var(--muted)]">
                  {selectedTeam
                    ? `${selectedTeam.seed}. ${selectedTeam.name} (${selectedTeam.division.gender === "MENS" ? "M" : "W"}, B${selectedTeam.bucket})`
                    : slot.helper}
                </span>
              </span>
              <span className="rounded-md border border-[var(--line)] px-2 py-1 text-xs text-[var(--muted)]">
                {isOpen ? "Close" : "Choose"}
              </span>
            </button>

            {isOpen && !disabled && (
              <div className="grid gap-4 border-t border-[var(--line)] p-4 md:grid-cols-2">
                <TeamColumn
                  title="Men"
                  teams={slotTeams.filter((team) => team.division.gender === "MENS")}
                  selectedTeamId={selected[slot.name] ?? ""}
                  onChoose={(teamId) => choose(slot.name, teamId)}
                />
                <TeamColumn
                  title="Women"
                  teams={slotTeams.filter((team) => team.division.gender === "WOMENS")}
                  selectedTeamId={selected[slot.name] ?? ""}
                  onChoose={(teamId) => choose(slot.name, teamId)}
                />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function TeamColumn({
  title,
  teams,
  selectedTeamId,
  onChoose,
}: {
  title: string;
  teams: Team[];
  selectedTeamId: string;
  onChoose: (teamId: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase text-[var(--muted)]">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {teams.map((team) => {
          const selected = selectedTeamId === team.id;
          return (
            <button
              key={team.id}
              type="button"
              onClick={() => onChoose(team.id)}
              className={`focus-ring rounded-full border px-3 py-2 text-left text-sm transition ${
                selected
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--line)] bg-[var(--panel)] hover:border-[var(--accent)]"
              }`}
            >
              <span className="font-semibold">{team.seed}.</span> {team.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
