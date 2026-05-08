import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, ButtonLink, PageShell, Pill } from "@/components/ui";
import { SiteNav } from "@/components/site-nav";
import { AdRail, TextAd } from "@/components/ad-slot";
import { getPrisma } from "@/lib/prisma";
import { entryIsLocked, picksAreVisible } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPrisma().event.findUnique({
    where: { slug },
    select: { name: true, isLocked: true, entryLockAt: true },
  });
  if (!event) return { title: "Event not found" };
  const locked = event.isLocked || (event.entryLockAt ? new Date(event.entryLockAt) <= new Date() : false);
  const description = locked
    ? `${event.name} entries are locked. Track the leaderboard on TheGame, Ultiworld's free pick'em.`
    : `Pick four regular teams plus one bonus team for ${event.name}. Free pick'em from Ultiworld.`;
  const url = `/events/${slug}`;
  return {
    title: event.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${event.name} · TheGame`,
      description,
      url,
      type: "article",
    },
    twitter: {
      title: `${event.name} · TheGame`,
      description,
    },
  };
}

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
  const dateMeta = event.startsAt ? formatDate(event.startsAt) : null;

  return (
    <PageShell>
      <SiteNav />

      <div className="tg-eyebrow">
        <h2>The Headline Event</h2>
        {dateMeta && <span className="meta">{dateMeta}</span>}
      </div>

      <div className="tg-grid tg-grid--hero">
        <section>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Pill tone={locked ? "red" : "accent"}>{locked ? "Entries locked" : "Entries open"}</Pill>
            <Pill>{visible ? "Picks visible" : "Picks hidden until lock"}</Pill>
          </div>
          <h1 className="tg-h-hero" style={{ marginTop: 14 }}>
            {event.name}
          </h1>
          <p className="tg-byline">
            By <strong>Ultiworld Staff</strong>
            {event.updatedAt ? <> · Updated {formatDate(event.updatedAt)}</> : null}
          </p>
          <p className="tg-body" style={{ marginTop: 14, maxWidth: 580 }}>
            Pick four regular teams by seed bucket, then designate one extra bonus team. Your five teams must
            include at least two men&apos;s teams and two women&apos;s teams.
          </p>
          <div style={{ marginTop: 22, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <ButtonLink href={`/events/${event.slug}/entry`}>
              {locked ? "View my entry" : "Make my picks"}
            </ButtonLink>
            <ButtonLink href={`/events/${event.slug}/leaderboard`} variant="alt">
              Leaderboard
            </ButtonLink>
          </div>
        </section>

        <Card>
          <h2 className="tg-h4">Scoring</h2>
          <dl className="tg-dl">
            <dt>Pool win</dt>
            <dd>10</dd>
            <dt>Pool winner</dt>
            <dd>10</dd>
            <dt>Prequarter</dt>
            <dd>10</dd>
            <dt>Quarter</dt>
            <dd>15</dd>
            <dt>Semi</dt>
            <dd>20</dd>
            <dt>Final</dt>
            <dd>25</dd>
          </dl>
        </Card>
      </div>

      <TextAd partner="combat" />

      <div className="tg-eyebrow">
        <h2>The Buckets</h2>
        <span className="meta">Pick rules</span>
      </div>
      <section className="tg-grid tg-grid--3">
        <Card>
          <h2 className="tg-h4">Bucket 1</h2>
          <p className="tg-body-sm tg-muted" style={{ marginTop: 6 }}>
            Seeds 1–5. Pick one regular team.
          </p>
        </Card>
        <Card>
          <h2 className="tg-h4">Bucket 2</h2>
          <p className="tg-body-sm tg-muted" style={{ marginTop: 6 }}>
            Seeds 6–12. Pick two regular teams.
          </p>
        </Card>
        <Card>
          <h2 className="tg-h4">Bucket 3</h2>
          <p className="tg-body-sm tg-muted" style={{ marginTop: 6 }}>
            Seeds 13–20. Pick one regular team.
          </p>
        </Card>
      </section>

      <TextAd partner="unbench" />

      <div className="tg-eyebrow">
        <h2>Field of Play</h2>
        <span className="meta">{event.teams.length} teams</span>
      </div>
      <div className="tg-grid tg-grid--2">
        {(["MENS", "WOMENS"] as const).map((gender) => {
          const teams = event.teams.filter((team) => team.division.gender === gender);
          return (
            <div key={gender}>
              <h3 className="tg-h4" style={{ marginBottom: 8, color: "var(--secondary)" }}>
                {gender === "MENS" ? "College D-I Men's" : "College D-I Women's"}
              </h3>
              <ol className="tg-team-list">
                {teams.map((team) => (
                  <li key={team.id}>
                    <span className="rank">{team.seed}</span>
                    <span className="name">{team.name}</span>
                    <span className="bucket">B{team.bucket}</span>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>

      {event.bonusQuestions.length > 0 && (
        <p className="tg-body-sm tg-muted" style={{ marginTop: 16 }}>
          Bonus props are included on the{" "}
          <Link className="tg-inline-link" href={`/events/${event.slug}/entry`}>
            entry form
          </Link>
          .
        </p>
      )}

      <AdRail />
    </PageShell>
  );
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

