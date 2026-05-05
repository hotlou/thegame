import Link from "next/link";
import { clsx } from "clsx";

export function PageShell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6">{children}</main>;
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={clsx("rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm", className)}>
      {children}
    </section>
  );
}

export function ButtonLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="focus-ring inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
    >
      {children}
    </Link>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="focus-ring inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
    >
      {children}
    </button>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "focus-ring min-h-10 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm",
        props.className,
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        "focus-ring min-h-10 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm",
        props.className,
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={clsx(
        "focus-ring min-h-28 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm",
        props.className,
      )}
    />
  );
}

export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-[var(--line)] bg-white px-2.5 py-1 text-xs font-medium text-[var(--muted)]">
      {children}
    </span>
  );
}
