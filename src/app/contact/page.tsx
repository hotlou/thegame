import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Resend } from "resend";
import { z } from "zod";
import { Card, PageShell, SubmitButton, TextInput, Textarea } from "@/components/ui";
import { SiteNav } from "@/components/site-nav";
import { getEmailFrom, getResendApiKey } from "@/lib/env";

export const dynamic = "force-dynamic";

const CONTACT_TO = process.env.CONTACT_EMAIL ?? "ob@unbenchable.com";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact TheGame with questions, scoring notes, and support requests.",
  alternates: { canonical: "/contact" },
};

const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  subject: z.string().trim().min(1).max(160),
  message: z.string().trim().min(10).max(4000),
  company: z.string().trim().max(0).optional(),
});

async function contactAction(formData: FormData) {
  "use server";
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/contact?error=invalid");

  const apiKey = getResendApiKey();
  if (!apiKey) redirect("/contact?error=config");

  const resend = new Resend(apiKey);
  const input = parsed.data;
  const subject = `TheGame contact: ${input.subject}`;
  const text = [
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    "",
    input.message,
  ].join("\n");

  await resend.emails.send({
    from: getEmailFrom(),
    to: CONTACT_TO,
    replyTo: input.email,
    subject,
    text,
  });

  redirect("/contact?sent=1");
}

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const query = await searchParams;

  return (
    <PageShell>
      <SiteNav />

      <div className="tg-eyebrow">
        <h2>Contact</h2>
        <span className="meta">TheGame</span>
      </div>

      <Card style={{ maxWidth: 760 }}>
        <h1 className="tg-h1">Contact TheGame</h1>
        <p className="tg-body tg-muted" style={{ marginTop: 10 }}>
          Send questions, scoring notes, account issues, or sponsor inquiries. We will route it to the right person.
        </p>

        {query.sent && (
          <p className="tg-body-sm" style={{ marginTop: 16, color: "var(--accent-ink)", fontWeight: 700 }}>
            Message sent. Thanks for reaching out.
          </p>
        )}
        {query.error && (
          <p className="tg-body-sm" style={{ marginTop: 16, color: "var(--danger)", fontWeight: 700 }}>
            {query.error === "config"
              ? "Contact email is not configured yet."
              : "Please check the form and try again."}
          </p>
        )}

        <form action={contactAction} style={{ display: "grid", gap: 16, marginTop: 22 }}>
          <input type="text" name="company" tabIndex={-1} autoComplete="off" style={{ display: "none" }} />
          <label className="tg-label">
            Name
            <TextInput name="name" required maxLength={100} style={{ marginTop: 6 }} />
          </label>
          <label className="tg-label">
            Email
            <TextInput name="email" type="email" required maxLength={200} style={{ marginTop: 6 }} />
          </label>
          <label className="tg-label">
            Subject
            <TextInput name="subject" required maxLength={160} style={{ marginTop: 6 }} />
          </label>
          <label className="tg-label">
            Message
            <Textarea name="message" required maxLength={4000} style={{ marginTop: 6, minHeight: 180 }} />
          </label>
          <div>
            <SubmitButton>Send message</SubmitButton>
          </div>
        </form>
      </Card>
    </PageShell>
  );
}
