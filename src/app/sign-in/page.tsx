import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signIn, auth } from "@/auth";
import { Card, PageShell, SubmitButton, TextInput } from "@/components/ui";
import { SiteNav } from "@/components/site-nav";
import { getMissingAuthConfig } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to TheGame with a magic link to make and edit your picks.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/sign-in" },
};

async function signInAction(formData: FormData) {
  "use server";
  const missing = getMissingAuthConfig();
  if (missing.length) {
    redirect(`/sign-in?error=missing-config&missing=${encodeURIComponent(missing.join(","))}`);
  }
  const email = String(formData.get("email") ?? "");
  await signIn("resend", { email, redirectTo: "/" });
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; missing?: string }>;
}) {
  const [session, query] = await Promise.all([safeAuth(), searchParams]);
  if (session?.user) redirect("/");
  const missing = query.missing?.split(",").filter(Boolean) ?? [];

  return (
    <PageShell>
      <SiteNav />
      <Card className="mx-auto w-full max-w-md" >
        <h1 className="tg-h2">Sign in</h1>
        <p className="tg-body-sm tg-muted" style={{ marginTop: 8 }}>
          Enter your email and we will send a magic link for your entry.
        </p>
        {query.error === "missing-config" && (
          <div
            className="tg-card"
            style={{
              marginTop: 16,
              padding: 12,
              background: "var(--panel-strong)",
              borderColor: "var(--danger)",
            }}
          >
            <p className="tg-label" style={{ color: "var(--danger)" }}>
              Local auth is missing configuration.
            </p>
            <p className="tg-body-sm tg-muted" style={{ marginTop: 4 }}>
              Pull the Vercel env vars into <code className="tg-mono">.env.local</code>, then restart the dev server.
            </p>
            {missing.length > 0 && (
              <p className="tg-body-sm" style={{ marginTop: 8, fontFamily: "var(--font-mono)" }}>
                Missing: {missing.join(", ")}
              </p>
            )}
          </div>
        )}
        <form action={signInAction} style={{ marginTop: 20 }}>
          <label className="tg-label">
            Email
            <TextInput name="email" type="email" required style={{ marginTop: 6 }} />
          </label>
          <div style={{ marginTop: 16 }}>
            <SubmitButton>Email me a magic link</SubmitButton>
          </div>
        </form>
      </Card>
    </PageShell>
  );
}

async function safeAuth() {
  try {
    return await auth();
  } catch (error) {
    if (
      process.env.NODE_ENV === "development" &&
      (!process.env.DATABASE_URL || isMissingSecretError(error))
    ) {
      return null;
    }
    throw error;
  }
}

function isMissingSecretError(error: unknown) {
  return error instanceof Error && error.message.includes("Please define a `secret`");
}
