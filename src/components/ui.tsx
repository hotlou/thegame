import Link from "next/link";
import { clsx } from "clsx";

export function PageShell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-12">{children}</main>;
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={clsx("tg-card", className)}>{children}</section>;
}

type ButtonVariant = "primary" | "alt";

const buttonClass = (variant: ButtonVariant = "primary") =>
  clsx("tg-btn", variant === "alt" && "tg-btn--alt");

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
}) {
  return (
    <Link href={href} className={buttonClass(variant)}>
      {children}
    </Link>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: ButtonVariant;
}) {
  return (
    <button type="submit" className={buttonClass(variant)}>
      {children}
    </button>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx("tg-input", props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx("tg-input tg-select", props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={clsx("tg-input min-h-28", props.className)}
      style={{ paddingTop: 8, paddingBottom: 8, ...props.style }}
    />
  );
}

type PillTone = "default" | "accent" | "red";

export function Pill({ children, tone = "default" }: { children: React.ReactNode; tone?: PillTone }) {
  return (
    <span
      className={clsx(
        "tg-pill",
        tone === "accent" && "tg-pill--accent",
        tone === "red" && "tg-pill--red",
      )}
    >
      {children}
    </span>
  );
}
