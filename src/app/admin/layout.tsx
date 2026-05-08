import Link from "next/link";
import { requireAdmin } from "@/lib/authz";
import { PageShell } from "@/components/ui";
import { AdminNavLinks } from "@/components/admin-nav-links";

const links: Array<[string, string]> = [
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
      <div className="tg-masthead-top">
        <span style={{ letterSpacing: "0.06em" }}>Admin console</span>
        <span>
          <Link href="/">View site &#8599;</Link>
        </span>
      </div>

      <Link href="/admin" className="tg-masthead">
        <div className="lockup">
          <div className="brand-mark">
            The<span className="red">Game</span>
          </div>
          <div className="presented-by">
            <span className="uw-name">Admin</span> Console
          </div>
        </div>
      </Link>

      <AdminNavLinks links={links} />
      {children}
    </PageShell>
  );
}
