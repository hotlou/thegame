import { Card, Select, SubmitButton, TextInput } from "@/components/ui";
import { ResultsImportTool } from "@/components/results-import-tool";
import { getCurrentEvent } from "@/lib/events";
import { getPrisma } from "@/lib/prisma";
import { clearGameResultAction, createGameAction, saveGameResultAction } from "@/lib/admin-actions";

export default async function GamesPage() {
  const event = await getCurrentEvent();
  if (!event)
    return (
      <Card>
        <p className="tg-body">No event found.</p>
      </Card>
    );

  const games = await getPrisma().game.findMany({
    where: { eventId: event.id, championshipPath: true },
    include: { division: true, team1: true, team2: true },
    orderBy: [{ division: { sortOrder: "asc" } }, { stage: "asc" }, { sortOrder: "asc" }],
  });
  const divisions = await getPrisma().division.findMany({
    where: { eventId: event.id },
    orderBy: { sortOrder: "asc" },
  });
  const teams = await getPrisma().team.findMany({
    where: { eventId: event.id },
    include: { division: true },
    orderBy: [{ division: { sortOrder: "asc" } }, { seed: "asc" }],
  });

  return (
    <>
      <div className="tg-eyebrow">
        <h2>Results</h2>
        <span className="meta">{games.length} games · {games.filter((g) => g.status === "FINAL").length} final</span>
      </div>

      <div style={{ display: "grid", gap: 20 }}>
        <Card>
          <h1 className="tg-h2">Import results</h1>
          <p className="tg-body-sm tg-muted" style={{ marginTop: 6 }}>
            Pull proposed results from USAU, review the diff, then confirm. Manual edits are preserved unless you choose to
            overwrite them.
          </p>
          <div style={{ marginTop: 16 }}>
            <ResultsImportTool eventId={event.id} divisions={divisions} />
          </div>
        </Card>

        <Card>
          <h1 className="tg-h2">Add game</h1>
          <form
            action={createGameAction}
            style={{
              display: "grid",
              gap: 12,
              marginTop: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            <input type="hidden" name="eventId" value={event.id} />
            <label className="tg-label">
              Division
              <Select name="divisionId" required style={{ marginTop: 6 }}>
                <option value="">Choose division</option>
                {divisions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="tg-label">
              Stage
              <Select name="stage" required defaultValue="POOL" style={{ marginTop: 6 }}>
                {["POOL", "PREQUARTER", "QUARTER", "SEMI", "FINAL", "OTHER"].map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </Select>
            </label>
            <label className="tg-label">
              Label
              <TextInput name="label" style={{ marginTop: 6 }} />
            </label>
            <label className="tg-label">
              Pool
              <TextInput name="pool" style={{ marginTop: 6 }} />
            </label>
            <label className="tg-label">
              Team 1
              <TeamSelect name="team1Id" teams={teams} />
            </label>
            <label className="tg-label">
              Team 2
              <TeamSelect name="team2Id" teams={teams} />
            </label>
            <label className="tg-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" name="championshipPath" value="true" defaultChecked />
              Counts for scoring
            </label>
            <div style={{ gridColumn: "1 / -1" }}>
              <SubmitButton>Add game</SubmitButton>
            </div>
          </form>
        </Card>

        <Card>
          <h1 className="tg-h2">Game results</h1>
          <div style={{ marginTop: 16, overflowX: "auto" }}>
            <table className="tg-table" style={{ minWidth: 980 }}>
              <thead>
                <tr>
                  <th>Division</th>
                  <th>Stage</th>
                  <th>Team 1</th>
                  <th>Score</th>
                  <th>Team 2</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => (
                  <tr key={game.id}>
                    <td>{game.division.name}</td>
                    <td className="rank-cell">{game.stage}</td>
                    <td>{game.team1?.name ?? "TBD"}</td>
                    <td>
                      <form id={`game-${game.id}`} action={saveGameResultAction} className="contents">
                        <input type="hidden" name="eventId" value={event.id} />
                        <input type="hidden" name="gameId" value={game.id} />
                        <TextInput name="team1Score" type="number" min={0} defaultValue={game.team1Score ?? ""} />
                      </form>
                    </td>
                    <td>{game.team2?.name ?? "TBD"}</td>
                    <td>
                      <TextInput
                        form={`game-${game.id}`}
                        name="team2Score"
                        type="number"
                        min={0}
                        defaultValue={game.team2Score ?? ""}
                      />
                    </td>
                    <td>{game.status}</td>
                    <td className="tg-muted" style={{ fontSize: 12 }}>
                      {game.manualOverride ? "Manual" : game.lastImportedAt ? "Imported" : game.resultSource}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        <button form={`game-${game.id}`} className="tg-btn tg-btn--sm tg-btn--alt">
                          Save
                        </button>
                        <form action={clearGameResultAction}>
                          <input type="hidden" name="eventId" value={event.id} />
                          <input type="hidden" name="gameId" value={game.id} />
                          <button
                            type="submit"
                            className="tg-btn tg-btn--sm"
                            style={{
                              background: "var(--panel-strong)",
                              color: "var(--foreground)",
                              border: "1px solid var(--line)",
                            }}
                          >
                            Clear
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}

function TeamSelect({
  name,
  teams,
}: {
  name: string;
  teams: Array<{ id: string; name: string; seed: number; division: { name: string } }>;
}) {
  return (
    <Select name={name} style={{ marginTop: 6 }}>
      <option value="">TBD</option>
      {teams.map((team) => (
        <option key={team.id} value={team.id}>
          {team.division.name}: {team.seed}. {team.name}
        </option>
      ))}
    </Select>
  );
}
