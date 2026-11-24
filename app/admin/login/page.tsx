import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/session";
import AdminLoginForm from "@/components/AdminLoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await getAdmin()) redirect("/admin");
  return (
    <section className="wrap section" style={{ maxWidth: 420 }}>
      <div className="section-head">
        <span className="eyebrow">Admin</span>
        <h1>Store admin sign in</h1>
      </div>
      <AdminLoginForm />
    </section>
  );
}
