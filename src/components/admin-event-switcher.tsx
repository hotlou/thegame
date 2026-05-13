import Link from "next/link";
import { Pill } from "@/components/ui";

type EventOption = {
  slug: string;
  name: string;
  startsAt: Date | null;
};

export function AdminEventSwitcher({
  events,
  currentSlug,
  basePath,
}: {
  events: EventOption[];
  currentSlug: string;
  basePath: string;
}) {
  if (events.length <= 1) return null;

  return (
    <section style={{ marginBottom: 20, display: "grid", gap: 8 }}>
      <p className="tg-label">Active admin event</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {events.map((event) => {
          const active = event.slug === currentSlug;
          return (
            <Link
              key={event.slug}
              href={`${basePath}?event=${event.slug}`}
              className="focus-ring"
              style={{ textDecoration: "none" }}
            >
              <Pill tone={active ? "accent" : "default"}>
                {event.name}
                {event.startsAt ? ` · ${formatDate(event.startsAt)}` : ""}
              </Pill>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function formatDate(value: Date) {
  return value.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
