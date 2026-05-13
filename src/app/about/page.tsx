import type { Metadata } from "next";
import { Card, PageShell } from "@/components/ui";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "About",
  description: "About TheGame, Ultiworld's free college ultimate pick'em game.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <PageShell>
      <SiteNav />

      <div className="tg-eyebrow">
        <h2>About</h2>
        <span className="meta">TheGame</span>
      </div>

      <div className="tg-grid tg-grid--2" style={{ alignItems: "start" }}>
        <Card>
          <h1 className="tg-h1">About TheGame</h1>
          <p className="tg-body" style={{ marginTop: 12 }}>
            TheGame is Ultiworld&apos;s free pick&apos;em contest for college ultimate championship weekends.
            Pick teams from each seed bucket, choose a bonus team, follow the results, and climb the leaderboard
            as the tournament unfolds.
          </p>
          <p className="tg-body tg-muted" style={{ marginTop: 12 }}>
            It is meant to be simple, fast, and fun: a lightweight way to make every pool game, bracket upset,
            and final point matter a little more.
          </p>
        </Card>

        <Card>
          <h2 className="tg-h2">Thanks To Our Sponsors</h2>
          <p className="tg-body tg-muted" style={{ marginTop: 12 }}>
            TheGame is made possible with support from Combat Candy, Unbenchable, and UFA Almanac. Thanks to
            each of them for helping support ultimate coverage, community projects, and a better championship
            weekend experience.
          </p>
        </Card>
      </div>
    </PageShell>
  );
}
