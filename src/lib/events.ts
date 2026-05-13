import { getPrisma } from "@/lib/prisma";

export async function getCurrentEvent() {
  const prisma = getPrisma();
  try {
    const event = await prisma.event.findFirst({
      orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
    });
    return event;
  } catch (error) {
    if (process.env.NODE_ENV === "development" && !process.env.DATABASE_URL) {
      console.warn("DATABASE_URL is not set; showing setup state.");
      return null;
    }
    if (isMissingEventTableError(error)) {
      console.warn("Database is connected but not migrated yet; showing setup state.");
      return null;
    }
    throw error;
  }
}

export async function getAllEvents() {
  return getPrisma().event.findMany({
    orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
  });
}

export async function getAdminEvent(eventSlug?: string) {
  if (eventSlug) {
    const event = await getPrisma().event.findUnique({ where: { slug: eventSlug } });
    if (event) return event;
  }
  return getCurrentEvent();
}

function isMissingEventTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: string; message?: string };
  return maybeError.code === "P2021" && (maybeError.message ?? "").includes("public.Event");
}

export async function getEventBySlug(slug: string) {
  return getPrisma().event.findUnique({
    where: { slug },
  });
}

export function picksAreVisible(event: { isLocked: boolean; picksVisibleAt: Date | null }) {
  return event.isLocked || (!!event.picksVisibleAt && event.picksVisibleAt <= new Date());
}

export function entryIsLocked(event: { isLocked: boolean; entryLockAt: Date | null }) {
  return event.isLocked || (!!event.entryLockAt && event.entryLockAt <= new Date());
}
