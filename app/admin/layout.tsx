import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/session";
import AdminNav from "@/components/AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  // login page lives at /admin/login outside this guard via route group
  if (!admin) redirect("/admin/login");
  return (
    <section className="wrap section admin">
      <AdminNav email={admin.email} />
      {children}
    </section>
  );
}

export function AdminLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href}>{children}</Link>;
}
