import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/session";
import CustomerLoginForm from "@/components/CustomerLoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCustomer()) redirect("/account");
  return (
    <section className="wrap section" style={{ maxWidth: 420 }}>
      <div className="section-head">
        <span className="eyebrow">My library</span>
        <h1>Sign in</h1>
      </div>
      <CustomerLoginForm />
      <p className="soft" style={{ marginTop: 14 }}>
        No account? Guest checkout works fine — your downloads arrive by email.
        Bought something and want it again?{" "}
        <Link href="/order">Look up your order</Link>.
      </p>
    </section>
  );
}
