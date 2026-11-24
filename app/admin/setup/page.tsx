import { redirect } from "next/navigation";
import { sb } from "@/lib/db";
import { getAdmin } from "@/lib/session";
import SetupAdminForm from "@/components/SetupAdminForm";

export const dynamic = "force-dynamic";

/**
 * first-run admin setup — replaces the PHP "create setup-admin.php, visit
 * once, delete it" dance. Works ONLY while no admin exists yet; the moment
 * one admin is created this page locks itself (409). No token file to delete.
 */
export default async function AdminSetupPage() {
  if (await getAdmin()) redirect("/admin");
  const { count } = await sb().from("admin_users").select("id", { count: "exact", head: true });
  const locked = (count ?? 0) > 0;

  return (
    <section className="wrap section" style={{ maxWidth: 460 }}>
      <div className="section-head">
        <span className="eyebrow">First run</span>
        <h1>Create the store admin</h1>
      </div>
      {locked ? (
        <p className="form-error">
          An admin already exists — setup is locked. Sign in at /admin/login.
        </p>
      ) : (
        <>
          <p className="soft">
            One-time page: creates the first admin account, then locks itself
            permanently.
          </p>
          <SetupAdminForm />
        </>
      )}
    </section>
  );
}
