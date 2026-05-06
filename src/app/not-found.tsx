import { ButtonLink, Card, PageShell } from "@/components/ui";
import { SiteNav } from "@/components/site-nav";

export default function NotFound() {
  return (
    <PageShell>
      <SiteNav />
      <div className="grid flex-1 place-items-center py-16">
        <Card className="w-full max-w-xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">404</p>
          <h1 className="mt-3 text-3xl font-bold">That page is out of bounds.</h1>
          <p className="mx-auto mt-3 max-w-md text-[var(--muted)]">
            TheGame could not find that route. Head back to the current event and keep the picks moving.
          </p>
          <div className="mt-6 flex justify-center">
            <ButtonLink href="/">Go to TheGame</ButtonLink>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
