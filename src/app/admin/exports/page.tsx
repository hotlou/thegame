import { Card, ButtonLink } from "@/components/ui";

export default function ExportsPage() {
  return (
    <>
      <div className="tg-eyebrow">
        <h2>Exports</h2>
        <span className="meta">CSV downloads</span>
      </div>
      <Card>
        <h1 className="tg-h2">Exports</h1>
        <p className="tg-body-sm tg-muted" style={{ marginTop: 8 }}>
          Download current entry and leaderboard data as CSV.
        </p>
        <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 12 }}>
          <ButtonLink href="/api/admin/export/entries">Entries CSV</ButtonLink>
          <ButtonLink href="/api/admin/export/leaderboard" variant="alt">
            Leaderboard CSV
          </ButtonLink>
        </div>
      </Card>
    </>
  );
}
