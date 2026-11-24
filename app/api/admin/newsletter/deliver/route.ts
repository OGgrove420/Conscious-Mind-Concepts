import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/session";
import { newsletterPendingDeliver } from "@/lib/newsletter";

export async function POST() {
  if (!(await getAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const made = await newsletterPendingDeliver();
  return NextResponse.json({ ok: true, made });
}
