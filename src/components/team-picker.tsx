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
    <div style={{ display: "grid", gap: 12 }}>
      {slots.map((slot) => {
        const selectedTeam = selected[slot.name] ? teamById.get(selected[slot.name]) : null;
        const slotTeams = teams.filter((team) => slot.bucket === "ANY" || team.bucket === slot.bucket);
        const isOpen = openSlot === slot.name;

        return (
          <section
            key={slot.name}
            style={{
              border: "1px solid var(--line)",
              borderRadius: 4,
              background: "var(--panel-strong)",
            }}
          >
            <input type="hidden" name={slot.name} value={selected[slot.name] ?? ""} required />
            <button
              type="button"
              disabled={disabled}
              onClick={() => setOpenSlot(isOpen ? "" : slot.name)}
              className="focus-ring"
              style={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                background: "transparent",
                border: 0,
                padding: "12px 16px",
                textAlign: "left",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.7 : 1,
              }}
            >
              <span>
                <span className="tg-h4" style={{ display: "block" }}>
                  {slot.label}
                </span>
                <span className="tg-body-sm tg-muted" style={{ display: "block", marginTop: 2, textTransform: "none", letterSpacing: 0 }}>
                  {selectedTeam
                    ? `${selectedTeam.seed}. ${selectedTeam.name} (${selectedTeam.division.gender === "MENS" ? "M" : "W"}, B${selectedTeam.bucket})`
                    : slot.helper}
                </span>
              </span>
              <span className="tg-pill">{isOpen ? "Close" : "Choose"}</span>
            </button>

            {isOpen && !disabled && (
              <div
                style={{
                  display: "grid",
                  gap: 16,
                  borderTop: "1px solid var(--line)",
                  padding: 16,
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                }}
              >
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
      <h3
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--secondary)",
          marginBottom: 8,
        }}
      >
        {title}
      </h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {teams.map((team) => {
          const selected = selectedTeamId === team.id;
          return (
            <button
              key={team.id}
              type="button"
              onClick={() => onChoose(team.id)}
              className="focus-ring"
              style={{
                borderRadius: 3,
                padding: "6px 10px",
                fontSize: 13,
                cursor: "pointer",
                background: selected ? "var(--accent)" : "var(--panel-strong)",
                color: selected ? "#fff" : "var(--foreground)",
                border: `1px solid ${selected ? "var(--accent)" : "var(--line)"}`,
                fontWeight: 600,
              }}
            >
              <span style={{ fontFamily: "var(--font-mono)", marginRight: 6, opacity: 0.8 }}>
                {team.seed}.
              </span>
              {team.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
