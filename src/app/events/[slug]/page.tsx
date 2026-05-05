import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, ButtonLink, PageShell, Pill } from "@/components/ui";
import { SiteNav } from "@/components/site-nav";
import { getPrisma } from "@/lib/prisma";
import { entryIsLocked, picksAreVisible } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPrisma().event.findUnique({
    where: { slug },
    include: {
      teams: { include: { division: true }, orderBy: [{ division: { sortOrder: "asc" } }, { seed: "asc" }] },
      bonusQuestions: { include: { options: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!event) notFound();

  const locked = entryIsLocked(event);
  const visible = picksAreVisible(event);

  return (
    <PageShell>
      <SiteNav />
      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
        <section>
          <div className="flex flex-wrap gap-2">
            <Pill>{locked ? "Entries locked" : "Entries open"}</Pill>
            <Pill>{visible ? "Picks visible" : "Picks hidden until lock"}</Pill>
          </div>
          <h1 className="mt-4 text-4xl font-bold">{event.name}</h1>
          <p className="mt-3 max-w-2xl text-[var(--muted)]">
            Pick four regular teams by seed bucket, then designate one extra bonus team. Your five teams must include at
            least two men&apos;s teams and two women&apos;s teams.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href={`/events/${event.slug}/entry`}>{locked ? "View my entry" : "Make my picks"}</ButtonLink>
            <ButtonLink href={`/events/${event.slug}/leaderboard`}>Leaderboard</ButtonLink>
          </div>
        </section>

        <Card>
          <h2 className="text-lg font-bold">Scoring</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <dt className="text-[var(--muted)]">Pool win</dt>
            <dd className="font-semibold">10</dd>
            <dt className="text-[var(--muted)]">Pool winner</dt>
            <dd className="font-semibold">10</dd>
            <dt className="text-[var(--muted)]">Prequarter</dt>
            <dd className="font-semibold">10</dd>
            <dt className="text-[var(--muted)]">Quarter</dt>
            <dd className="font-semibold">15</dd>
            <dt className="text-[var(--muted)]">Semi</dt>
            <dd className="font-semibold">20</dd>
            <dt className="text-[var(--muted)]">Final</dt>
            <dd className="font-semibold">25</dd>
          </dl>
        </Card>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <Card>
          <h2 className="font-bold">Bucket 1</h2>
          <p className="text-sm text-[var(--muted)]">Seeds 1-5. Pick one regular team.</p>
        </Card>
        <Card>
          <h2 className="font-bold">Bucket 2</h2>
          <p className="text-sm text-[var(--muted)]">Seeds 6-12. Pick two regular teams.</p>
        </Card>
        <Card>
          <h2 className="font-bold">Bucket 3</h2>
          <p className="text-sm text-[var(--muted)]">Seeds 13-20. Pick one regular team.</p>
        </Card>
      </section>

      <Card className="mt-8">
        <h2 className="text-xl font-bold">Teams</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          {["MENS", "WOMENS"].map((gender) => (
            <div key={gender}>
              <h3 className="mb-2 font-semibold">{gender === "MENS" ? "Men's" : "Women's"}</h3>
              <ol className="space-y-1 text-sm">
                {event.teams
                  .filter((team) => team.division.gender === gender)
                  .map((team) => (
                    <li key={team.id} className="flex justify-between border-b border-[var(--line)] py-1">
                      <span>
                        {team.seed}. {team.name}
                      </span>
                      <span className="text-[var(--muted)]">Bucket {team.bucket}</span>
                    </li>
                  ))}
              </ol>
            </div>
          ))}
        </div>
        {event.bonusQuestions.length > 0 && (
          <p className="mt-4 text-sm text-[var(--muted)]">
            Bonus props are included on the <Link href={`/events/${event.slug}/entry`}>entry form</Link>.
          </p>
        )}
      </Card>
    </PageShell>
  );
}
