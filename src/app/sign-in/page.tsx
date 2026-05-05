import { redirect } from "next/navigation";
import { signIn, auth } from "@/auth";
import { Card, PageShell, SubmitButton, TextInput } from "@/components/ui";
import { SiteNav } from "@/components/site-nav";
import { getMissingAuthConfig } from "@/lib/env";

export const dynamic = "force-dynamic";

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
      <Card className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Enter your email and we will send a magic link for your entry.
        </p>
        {query.error === "missing-config" && (
          <div className="mt-4 rounded-md border border-[var(--danger)] bg-white p-3 text-sm">
            <p className="font-semibold text-[var(--danger)]">Local auth is missing configuration.</p>
            <p className="mt-1 text-[var(--muted)]">
              Pull the Vercel env vars into `.env.local`, then restart the dev server.
            </p>
            {missing.length > 0 && <p className="mt-2 font-mono text-xs">Missing: {missing.join(", ")}</p>}
          </div>
        )}
        <form action={signInAction} className="mt-5 space-y-4">
          <label className="block text-sm font-semibold">
            Email
            <TextInput className="mt-1" name="email" type="email" required />
          </label>
          <SubmitButton>Email me a magic link</SubmitButton>
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
