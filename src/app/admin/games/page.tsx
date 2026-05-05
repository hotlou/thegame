import { Card, Select, SubmitButton, TextInput } from "@/components/ui";
import { getCurrentEvent } from "@/lib/events";
import { getPrisma } from "@/lib/prisma";
import { createGameAction, saveGameResultAction } from "@/lib/admin-actions";

export default async function GamesPage() {
  const event = await getCurrentEvent();
  if (!event) return <Card>No event found.</Card>;

  const games = await getPrisma().game.findMany({
    where: { eventId: event.id, championshipPath: true },
    include: { division: true, team1: true, team2: true },
    orderBy: [{ division: { sortOrder: "asc" } }, { stage: "asc" }, { sortOrder: "asc" }],
  });
  const divisions = await getPrisma().division.findMany({ where: { eventId: event.id }, orderBy: { sortOrder: "asc" } });
  const teams = await getPrisma().team.findMany({
    where: { eventId: event.id },
    include: { division: true },
    orderBy: [{ division: { sortOrder: "asc" } }, { seed: "asc" }],
  });

  return (
    <div className="grid gap-5">
      <Card>
        <h1 className="text-2xl font-bold">Add game</h1>
        <form action={createGameAction} className="mt-4 grid gap-3 md:grid-cols-3">
          <input type="hidden" name="eventId" value={event.id} />
          <label className="block text-sm font-semibold">
            Division
            <Select name="divisionId" required>
              <option value="">Choose division</option>
              {divisions.map((division) => (
                <option key={division.id} value={division.id}>
                  {division.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm font-semibold">
            Stage
            <Select name="stage" required defaultValue="POOL">
              {["POOL", "PREQUARTER", "QUARTER", "SEMI", "FINAL", "OTHER"].map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm font-semibold">
            Label
            <TextInput name="label" />
          </label>
          <label className="block text-sm font-semibold">
            Pool
            <TextInput name="pool" />
          </label>
          <label className="block text-sm font-semibold">
            Team 1
            <TeamSelect name="team1Id" teams={teams} />
          </label>
          <label className="block text-sm font-semibold">
            Team 2
            <TeamSelect name="team2Id" teams={teams} />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="championshipPath" value="true" defaultChecked />
            Counts for scoring
          </label>
          <div className="md:col-span-3">
            <SubmitButton>Add game</SubmitButton>
          </div>
        </form>
      </Card>

      <Card>
        <h1 className="text-2xl font-bold">Game results</h1>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left">
                <th className="py-2 pr-2">Division</th>
                <th className="py-2 pr-2">Stage</th>
                <th className="py-2 pr-2">Team 1</th>
                <th className="py-2 pr-2">Score</th>
                <th className="py-2 pr-2">Team 2</th>
                <th className="py-2 pr-2">Score</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2 pr-2">Save</th>
              </tr>
            </thead>
            <tbody>
              {games.map((game) => (
                <tr key={game.id} className="border-b border-[var(--line)]">
                  <td className="py-2 pr-2">{game.division.name}</td>
                  <td className="py-2 pr-2">{game.stage}</td>
                  <td className="py-2 pr-2">{game.team1?.name ?? "TBD"}</td>
                  <td className="py-2 pr-2">
                    <form id={`game-${game.id}`} action={saveGameResultAction} className="contents">
                      <input type="hidden" name="eventId" value={event.id} />
                      <input type="hidden" name="gameId" value={game.id} />
                      <TextInput name="team1Score" type="number" min={0} defaultValue={game.team1Score ?? ""} />
                    </form>
                  </td>
                  <td className="py-2 pr-2">{game.team2?.name ?? "TBD"}</td>
                  <td className="py-2 pr-2">
                    <TextInput form={`game-${game.id}`} name="team2Score" type="number" min={0} defaultValue={game.team2Score ?? ""} />
                  </td>
                  <td className="py-2 pr-2">{game.status}</td>
                  <td className="py-2 pr-2">
                    <button form={`game-${game.id}`} className="rounded-md bg-[var(--accent)] px-3 py-2 text-white">
                      Save
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
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
    <Select name={name}>
      <option value="">TBD</option>
      {teams.map((team) => (
        <option key={team.id} value={team.id}>
          {team.division.name}: {team.seed}. {team.name}
        </option>
      ))}
    </Select>
  );
}
