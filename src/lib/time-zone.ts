export const defaultTimeZone = "America/Chicago";

export const timeZoneOptions = [
  { value: "America/New_York", label: "Eastern Time" },
  { value: "America/Chicago", label: "Central Time" },
  { value: "America/Denver", label: "Mountain Time" },
  { value: "America/Los_Angeles", label: "Pacific Time" },
  { value: "America/Phoenix", label: "Arizona Time" },
  { value: "America/Anchorage", label: "Alaska Time" },
  { value: "Pacific/Honolulu", label: "Hawaii Time" },
] as const;

export function normalizeTimeZone(value: string | undefined | null) {
  if (!value) return defaultTimeZone;
  return isSupportedTimeZone(value) ? value : defaultTimeZone;
}

export function formatDateTimeLocalInZone(date: Date | null, timeZone: string) {
  if (!date) return "";
  const parts = datePartsInZone(date, normalizeTimeZone(timeZone));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function formatDateInZone(date: Date | null, timeZone: string) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: normalizeTimeZone(timeZone),
  }).format(date);
}

export function formatDateTimeInZone(date: Date | null, timeZone: string) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: normalizeTimeZone(timeZone),
  }).format(date);
}

export function dateFromLocalDateTime(value: string | undefined, timeZone: string) {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const localUtcMs = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );
  const zone = normalizeTimeZone(timeZone);
  let utcMs = localUtcMs - offsetMsForZone(new Date(localUtcMs), zone);
  utcMs = localUtcMs - offsetMsForZone(new Date(utcMs), zone);

  const date = new Date(utcMs);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isSupportedTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function offsetMsForZone(date: Date, timeZone: string) {
  const parts = datePartsInZone(date, timeZone);
  const zoneAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return zoneAsUtc - date.getTime();
}

function datePartsInZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZone,
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}
