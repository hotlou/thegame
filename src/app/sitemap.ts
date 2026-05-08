import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";
import { getPrisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  let events: Array<{ slug: string; updatedAt: Date }> = [];
  try {
    if (process.env.DATABASE_URL) {
      events = await getPrisma().event.findMany({
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      });
    }
  } catch {
    events = [];
  }

  const eventEntries: MetadataRoute.Sitemap = events.flatMap((event) => [
    {
      url: `${siteUrl}/events/${event.slug}`,
      lastModified: event.updatedAt,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/events/${event.slug}/leaderboard`,
      lastModified: event.updatedAt,
      changeFrequency: "hourly",
      priority: 0.8,
    },
  ]);

  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    ...eventEntries,
  ];
}
