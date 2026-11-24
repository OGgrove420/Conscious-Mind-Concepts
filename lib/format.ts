/** Formatting helpers — parity with the PHP helpers (zar_cents etc.). */

/** R99.00 style. Money is always integer cents internally, never rounded here. */
export function zarCents(cents: number): string {
  return "R" + (cents / 100).toFixed(2);
}

/** Effective price: sale price when set, otherwise list price. */
export function effectivePrice(p: { price_cents: number; sale_price_cents?: number | null }): number {
  return p.sale_price_cents !== null && p.sale_price_cents !== undefined
    ? p.sale_price_cents
    : p.price_cents;
}

export function fmtDateTime(v: string | Date | null | undefined): string {
  if (!v) return "";
  const d = typeof v === "string" ? new Date(v + (v.endsWith("Z") ? "" : "Z")) : v;
  if (isNaN(d.getTime())) return String(v);
  return d.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
