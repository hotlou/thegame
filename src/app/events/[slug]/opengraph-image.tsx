import { notFound } from "next/navigation";
import { renderTheGameOg } from "@/app/opengraph-image";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const alt = "TheGame event — make your picks";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function EventOpengraphImage({ params }: { params: { slug: string } }) {
  const event = await getPrisma().event.findUnique({
    where: { slug: params.slug },
    select: { name: true, isLocked: true, entryLockAt: true },
  });
  if (!event) notFound();

  const locked = event.isLocked || (event.entryLockAt ? new Date(event.entryLockAt) <= new Date() : false);

  return renderTheGameOg({
    eyebrow: "Presented by Ultiworld",
    headline: event.name,
    subhead: locked
      ? "Entries are locked. Climb the leaderboard."
      : "Pick four regular teams plus one bonus. Entries open now.",
  });
}
