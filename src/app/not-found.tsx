import { ButtonLink, Card, PageShell } from "@/components/ui";
import { SiteNav } from "@/components/site-nav";

export default function NotFound() {
  return (
    <PageShell>
      <SiteNav />
      <div style={{ display: "grid", placeItems: "center", flex: 1, padding: "64px 0" }}>
        <Card style={{ width: "100%", maxWidth: 560, textAlign: "center" }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--secondary)",
            }}
          >
            404
          </p>
          <h1 className="tg-h1" style={{ marginTop: 12 }}>
            That page is out of bounds.
          </h1>
          <p className="tg-body tg-muted" style={{ marginTop: 12, maxWidth: 420, marginInline: "auto" }}>
            TheGame could not find that route. Head back to the current event and keep the picks moving.
          </p>
          <div style={{ marginTop: 22, display: "flex", justifyContent: "center" }}>
            <ButtonLink href="/">Go to TheGame</ButtonLink>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
