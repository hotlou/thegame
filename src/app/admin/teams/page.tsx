import { Card, Select, SubmitButton, TextInput } from "@/components/ui";
import { getCurrentEvent } from "@/lib/events";
import { getPrisma } from "@/lib/prisma";
import { upsertTeamAction } from "@/lib/admin-actions";

export default async function TeamsPage() {
  const event = await getCurrentEvent();
  if (!event) return <Card>No event found.</Card>;

  const divisions = await getPrisma().division.findMany({ where: { eventId: event.id }, orderBy: { sortOrder: "asc" } });
  const teams = await getPrisma().team.findMany({
    where: { eventId: event.id },
    include: { division: true },
    orderBy: [{ division: { sortOrder: "asc" } }, { seed: "asc" }],
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[0.6fr_1.4fr]">
      <Card>
        <h1 className="text-2xl font-bold">Add team</h1>
        <form action={upsertTeamAction} className="mt-4 space-y-3">
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
            Name
            <TextInput name="name" required />
          </label>
          <label className="block text-sm font-semibold">
            Seed
            <TextInput name="seed" type="number" min={1} max={20} required />
          </label>
          <label className="block text-sm font-semibold">
            Pool
            <TextInput name="pool" />
          </label>
          <label className="block text-sm font-semibold">
            Pool rank
            <TextInput name="poolRank" type="number" min={1} max={4} />
          </label>
          <SubmitButton>Add team</SubmitButton>
        </form>
      </Card>

      <Card>
        <h1 className="text-2xl font-bold">Teams</h1>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left">
                <th className="py-2 pr-2">Division</th>
                <th className="py-2 pr-2">Seed</th>
                <th className="py-2 pr-2">Name</th>
                <th className="py-2 pr-2">Pool</th>
                <th className="py-2 pr-2">Pool rank</th>
                <th className="py-2 pr-2">Save</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.id} className="border-b border-[var(--line)]">
                  <td className="py-2 pr-2">{team.division.name}</td>
                  <td className="py-2 pr-2">{team.seed}</td>
                  <td className="py-2 pr-2">
                    <form id={`team-${team.id}`} action={upsertTeamAction} className="contents">
                      <input type="hidden" name="eventId" value={event.id} />
                      <input type="hidden" name="teamId" value={team.id} />
                      <input type="hidden" name="divisionId" value={team.divisionId} />
                      <input type="hidden" name="seed" value={team.seed} />
                      <TextInput name="name" defaultValue={team.name} />
                    </form>
                  </td>
                  <td className="py-2 pr-2">
                    <TextInput form={`team-${team.id}`} name="pool" defaultValue={team.pool ?? ""} />
                  </td>
                  <td className="py-2 pr-2">
                    <TextInput form={`team-${team.id}`} name="poolRank" type="number" min={1} max={4} defaultValue={team.poolRank ?? ""} />
                  </td>
                  <td className="py-2 pr-2">
                    <button form={`team-${team.id}`} className="rounded-md bg-[var(--accent)] px-3 py-2 text-white">
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
