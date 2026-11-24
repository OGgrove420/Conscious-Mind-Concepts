import Link from "next/link";
import { getCustomer } from "@/lib/session";
import { mainUrl } from "@/lib/env";

const NAV_LINKS: Array<[string, string, boolean]> = [
  ["Home", mainUrl("/index.html"), false],
  ["About", mainUrl("/about.html"), false],
  ["Services", mainUrl("/services.html"), false],
  ["Store", "/", true],
  ["Contact", mainUrl("/contact.html"), false],
];

export default async function SiteHeader() {
  const cust = await getCustomer();
  return (
    <header className="site">
      <div className="nav-inner">
        <Link className="brand" href={mainUrl("/index.html")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mainUrl("/images/logo.png")} alt="Conscious Mind Concepts logo" />
          Conscious Mind Concepts
        </Link>
        <nav className="links">
          {NAV_LINKS.map(([label, href, isStore]) => (
            <Link key={label} href={href} className={isStore ? "active" : ""}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="nav-cta">
          <Link className="btn btn-ghost" style={{ position: "relative" }} href="/cart">
            Cart
          </Link>
          {cust ? (
            <Link className="btn btn-primary" href="/account">
              My Library
            </Link>
          ) : (
            <Link className="btn btn-primary" href="/login">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
