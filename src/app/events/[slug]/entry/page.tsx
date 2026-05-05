import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { Card, PageShell, Select, SubmitButton, TextInput } from "@/components/ui";
import { SiteNav } from "@/components/site-nav";
import { getPrisma } from "@/lib/prisma";
import { entryIsLocked } from "@/lib/events";
import { saveEntryAction } from "@/lib/entry-actions";

export const dynamic = "force-dynamic";

export default async function EntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ slug }, query, session] = await Promise.all([params, searchParams, auth()]);
  const event = await getPrisma().event.findUnique({
    where: { slug },
    include: {
      teams: { include: { division: true }, orderBy: [{ division: { sortOrder: "asc" } }, { seed: "asc" }] },
      bonusQuestions: { include: { options: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!event) notFound();

  if (!session?.user) {
    return (
      <PageShell>
        <SiteNav />
        <Card>
          <h1 className="text-2xl font-bold">Sign in to make your picks</h1>
          <p className="mt-2 text-[var(--muted)]">Entries are tied to one email address so you can edit until lock.</p>
        </Card>
      </PageShell>
    );
  }

  const locked = entryIsLocked(event);
  const entry = await getPrisma().entry.findUnique({
    where: { eventId_userId: { eventId: event.id, userId: session.user.id } },
    include: { picks: true, bonusAnswers: true },
  });
  const pickBySlot = new Map(entry?.picks.map((pick) => [pick.slot, pick.teamId]) ?? []);
  const answerByQuestion = new Map(entry?.bonusAnswers.map((answer) => [answer.questionId, answer.optionId]) ?? []);
  const action = saveEntryAction.bind(null, slug);

  const teamsForBucket = (bucket: number | "ANY") =>
    event.teams.filter((team) => bucket === "ANY" || team.bucket === bucket);

  return (
    <PageShell>
      <SiteNav />
      <div className="mb-5">
        <h1 className="text-3xl font-bold">My entry</h1>
        <p className="mt-2 text-[var(--muted)]">
          {locked ? "Entries are locked." : "You can edit these picks until the event locks."}
        </p>
        {query.saved && <p className="mt-2 text-sm font-semibold text-[var(--accent)]">Entry saved.</p>}
      </div>

      <form action={action} className="grid gap-5 lg:grid-cols-[1fr_0.7fr]">
        <Card className="space-y-4">
          <label className="block text-sm font-semibold">
            Display name
            <TextInput name="displayName" defaultValue={entry?.displayName ?? session.user.name ?? ""} required disabled={locked} />
          </label>

          <PickSelect label="Bucket 1 regular pick" name="B1" teams={teamsForBucket(1)} value={pickBySlot.get("B1")} disabled={locked} />
          <PickSelect label="Bucket 2 regular pick" name="B2A" teams={teamsForBucket(2)} value={pickBySlot.get("B2A")} disabled={locked} />
          <PickSelect label="Bucket 2 regular pick" name="B2B" teams={teamsForBucket(2)} value={pickBySlot.get("B2B")} disabled={locked} />
          <PickSelect label="Bucket 3 regular pick" name="B3" teams={teamsForBucket(3)} value={pickBySlot.get("B3")} disabled={locked} />
          <PickSelect label="Designated bonus team" name="BONUS" teams={teamsForBucket("ANY")} value={pickBySlot.get("BONUS")} disabled={locked} />
        </Card>

        <Card className="space-y-4">
          <h2 className="text-lg font-bold">Bonus questions</h2>
          {event.bonusQuestions.length === 0 && <p className="text-sm text-[var(--muted)]">No bonus props are open yet.</p>}
          {event.bonusQuestions.map((question) => (
            <label key={question.id} className="block text-sm font-semibold">
              {question.prompt}
              <span className="ml-2 text-xs font-normal text-[var(--muted)]">{question.points} pts</span>
              <Select
                name={`bonus_${question.id}`}
                defaultValue={answerByQuestion.get(question.id) ?? ""}
                disabled={locked}
                className="mt-1"
              >
                <option value="">Choose an answer</option>
                {question.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>
          ))}
          {!locked && <SubmitButton>Save entry</SubmitButton>}
        </Card>
      </form>
    </PageShell>
  );
}

function PickSelect({
  label,
  name,
  teams,
  value,
  disabled,
}: {
  label: string;
  name: string;
  teams: Array<{ id: string; name: string; seed: number; bucket: number; division: { gender: string } }>;
  value?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <Select name={name} defaultValue={value ?? ""} required disabled={disabled} className="mt-1">
        <option value="">Choose a team</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.seed}. {team.name} ({team.division.gender === "MENS" ? "M" : "W"}, B{team.bucket})
          </option>
        ))}
      </Select>
    </label>
  );
}
