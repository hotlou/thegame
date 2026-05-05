import Link from "next/link";
import { requireAdmin } from "@/lib/authz";
import { PageShell } from "@/components/ui";

const links = [
  ["/admin", "Dashboard"],
  ["/admin/settings", "Settings"],
  ["/admin/import", "Import"],
  ["/admin/teams", "Teams"],
  ["/admin/games", "Results"],
  ["/admin/bonus", "Bonus"],
  ["/admin/entries", "Entries"],
  ["/admin/exports", "Exports"],
];

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <PageShell>
      <nav className="mb-6 flex flex-wrap items-center gap-3 border-b border-[var(--line)] pb-4 text-sm">
        <Link href="/" className="mr-3 text-xl font-bold">
          TheGame Admin
        </Link>
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-md bg-white px-3 py-2">
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </PageShell>
  );
}
