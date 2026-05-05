import { Card, ButtonLink } from "@/components/ui";

export default function ExportsPage() {
  return (
    <Card>
      <h1 className="text-2xl font-bold">Exports</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Download current entry and leaderboard data as CSV.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <ButtonLink href="/api/admin/export/entries">Entries CSV</ButtonLink>
        <ButtonLink href="/api/admin/export/leaderboard">Leaderboard CSV</ButtonLink>
      </div>
    </Card>
  );
}
