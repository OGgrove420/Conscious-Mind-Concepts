import Link from "next/link";
import { STORE_EMAIL_FROM, STORE_SUPPORT_PHONE, STORE_WHATSAPP, mainUrl, storeUrl } from "@/lib/env";

export default function SiteFooter() {
  return (
    <footer className="site">
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <div className="foot-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mainUrl("/images/logo.png")} alt="Conscious Mind Concepts logo" />
              Conscious Mind Concepts
            </div>
            <p style={{ color: "rgba(255,255,255,.6)", fontSize: "14.5px", maxWidth: 280 }}>
              Digital education and personal development tools. Master your mindset, master your life.
            </p>
            <div className="social-row" style={{ marginTop: 20 }}>
              <a href="https://www.instagram.com/conscious_mind_concepts" target="_blank" rel="noopener" aria-label="Instagram">IG</a>
              <a href="https://www.linkedin.com/company/conscious-mind-concepts-pty-ltd/" target="_blank" rel="noopener" aria-label="LinkedIn">in</a>
              <a href="https://youtube.com/@consciousm?si=SN3wi_2GHNEPtuTx" target="_blank" rel="noopener" aria-label="YouTube">YT</a>
              <a href="https://facebook.com/natheer17" target="_blank" rel="noopener" aria-label="Facebook">FB</a>
            </div>
          </div>
          <div>
            <h4>Store</h4>
            <ul>
              <li><Link href="/">All Products</Link></li>
              <li><Link href="/cart">Cart</Link></li>
              <li><Link href="/order">Order Lookup</Link></li>
              <li><Link href="/account">My Library</Link></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li><a href={`mailto:${STORE_EMAIL_FROM}`}>{STORE_EMAIL_FROM}</a></li>
              <li><a href={`tel:${STORE_SUPPORT_PHONE.replace(/\s/g, "")}`}>{STORE_SUPPORT_PHONE}</a></li>
              <li><a href={`https://wa.me/${STORE_WHATSAPP}`} target="_blank" rel="noopener">WhatsApp us</a></li>
              <li>Mon–Fri 08:00–17:00</li>
            </ul>
          </div>
          <div>
            <h4>Legal</h4>
            <ul>
              <li><a href={mainUrl("/privacy.html")}>Privacy Policy</a></li>
              <li><a href={mainUrl("/terms.html")}>Terms &amp; Conditions</a></li>
              <li><a href={mainUrl("/faq.html")}>FAQ</a></li>
            </ul>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© {new Date().getFullYear()} Conscious Mind Concepts (Pty) Ltd. All rights reserved.</span>
          <span>Payments by Ozow · secure instant EFT</span>
        </div>
      </div>
    </footer>
  );
}
export { storeUrl };
