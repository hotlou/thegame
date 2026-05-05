export function stripWrappingQuotes(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function getResendApiKey() {
  return process.env.RESEND_API_KEY ?? process.env.AUTH_RESEND_KEY;
}

export function getEmailFrom() {
  return stripWrappingQuotes(
    process.env.AUTH_EMAIL_FROM ??
      process.env.RESEND_EMAIL_FROM ??
      '"The Game via Unbenchable" <ob@unbenchable.com>',
  );
}

export function getMissingAuthConfig() {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!process.env.AUTH_SECRET) missing.push("AUTH_SECRET");
  if (!getResendApiKey()) missing.push("RESEND_API_KEY");
  return missing;
}
