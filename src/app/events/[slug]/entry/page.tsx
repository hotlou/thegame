import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { Card, PageShell, Select, SubmitButton, TextInput } from "@/components/ui";
import { SiteNav } from "@/components/site-nav";
import { TeamPicker } from "@/components/team-picker";
import { AdRail } from "@/components/ad-slot";
import { getPrisma } from "@/lib/prisma";
import { entryIsLocked } from "@/lib/events";
import { saveEntryAction } from "@/lib/entry-actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPrisma().event.findUnique({
    where: { slug },
    select: { name: true },
  });
  if (!event) return { title: "Entry" };
  return {
    title: `My entry — ${event.name}`,
    description: `Make and edit your picks for ${event.name} on TheGame.`,
    robots: { index: false, follow: false },
    alternates: { canonical: `/events/${slug}/entry` },
  };
}

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
        <SiteNav eventSlug={slug} />
        <Card>
          <h1 className="tg-h2">Sign in to make your picks</h1>
          <p className="tg-body-sm tg-muted" style={{ marginTop: 8 }}>
            Entries are tied to one email address so you can edit until lock.
          </p>
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

  return (
    <PageShell>
      <SiteNav eventSlug={slug} />

      <div className="tg-eyebrow">
        <h2>Your Card</h2>
        <span className="meta">{event.name}</span>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h1 className="tg-h1">My entry</h1>
        <p className="tg-body tg-muted" style={{ marginTop: 8 }}>
          {locked ? "Entries are locked." : "You can edit these picks until the event locks."}
        </p>
        {query.saved && (
          <p className="tg-body-sm" style={{ marginTop: 8, color: "var(--accent-ink)", fontWeight: 600 }}>
            Entry saved.
          </p>
        )}
      </div>

      <form action={action} className="tg-grid tg-grid--entry">
        <Card>
          <div style={{ display: "grid", gap: 16 }}>
            <label className="tg-label">
              Display name
              <TextInput
                name="displayName"
                defaultValue={entry?.displayName ?? session.user.name ?? ""}
                required
                disabled={locked}
                style={{ marginTop: 6 }}
              />
            </label>

            <TeamPicker
              disabled={locked}
              teams={event.teams}
              slots={[
                {
                  name: "B1",
                  label: "Bucket 1 regular pick",
                  helper: "Seeds 1–5. Pick one team.",
                  bucket: 1,
                  value: pickBySlot.get("B1"),
                },
                {
                  name: "B2A",
                  label: "Bucket 2 regular pick",
                  helper: "Seeds 6–12. Pick the first of two teams.",
                  bucket: 2,
                  value: pickBySlot.get("B2A"),
                },
                {
                  name: "B2B",
                  label: "Bucket 2 regular pick",
                  helper: "Seeds 6–12. Pick the second of two teams.",
                  bucket: 2,
                  value: pickBySlot.get("B2B"),
                },
                {
                  name: "B3",
                  label: "Bucket 3 regular pick",
                  helper: "Seeds 13–20. Pick one team.",
                  bucket: 3,
                  value: pickBySlot.get("B3"),
                },
                {
                  name: "BONUS",
                  label: "Designated bonus team",
                  helper: "Any bucket, no duplicate teams.",
                  bucket: "ANY",
                  value: pickBySlot.get("BONUS"),
                },
              ]}
            />
          </div>
        </Card>

        <Card>
          <h2 className="tg-h4">Bonus questions</h2>
          <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
            {event.bonusQuestions.length === 0 && (
              <p className="tg-body-sm tg-muted">No bonus props are open yet.</p>
            )}
            {event.bonusQuestions.map((question) => (
              <label key={question.id} className="tg-label">
                {question.prompt}
                <span className="tg-muted" style={{ marginLeft: 8, fontSize: 12, fontWeight: 400 }}>
                  {question.points} pts
                </span>
                <Select
                  name={`bonus_${question.id}`}
                  defaultValue={answerByQuestion.get(question.id) ?? ""}
                  disabled={locked}
                  style={{ marginTop: 6 }}
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
          </div>
        </Card>
      </form>

      <AdRail />
    </PageShell>
  );
}
