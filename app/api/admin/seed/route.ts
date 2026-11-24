import { NextResponse } from "next/server";
import { sb } from "@/lib/db";
import { getAdmin } from "@/lib/session";
import { saveSetting } from "@/lib/settings";
import { slugify } from "@/lib/format";

export async function POST(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { do?: string };

  if (body.do === "seed_products") {
    const flagships = [
      ["CMC-001", "The Mindset Reset Workbook", "30 Days to Rebuild Your Focus, Discipline and Direction.",
       "A practical 30-day personal development journey designed to help individuals reflect, refocus, improve their awareness, develop better habits and take intentional action.",
       14900, 9900, "blue"],
      ["CMC-002", "Emotional Intelligence Toolkit", "Understand, regulate and apply emotional intelligence at work and at home.",
       "A complete PDF toolkit covering understanding emotions, emotional awareness, emotional regulation, communication skills, self-management, empathy, workplace emotional intelligence and practical reflection exercises.",
       17900, null, "navy"],
      ["CMC-003", "Sales Mastery Blueprint", "Master the sales process from first contact to long-term retention.",
       "A PDF workbook with practical templates covering the sales process, building customer relationships, identifying customer needs, effective questioning, objection handling, closing techniques, customer retention and sales performance tracking.",
       24900, null, "gold"],
      ["CMC-004", "Small Business Financial Planner", "Track income, control expenses and plan cash flow with confidence.",
       "A PDF planner with editable templates covering monthly income tracking, expense management, cash flow planning, budgeting, profit and loss tracking, business financial goals, financial review templates and business sustainability planning.",
       19900, null, "coral"],
      ["CMC-005", "AI for Small Business", "Practical AI tools, prompts and applications for small business owners.",
       "A PDF guide with prompt library covering an introduction to artificial intelligence, understanding AI tools, AI for marketing, AI for customer service, AI for business administration, prompt engineering basics, business productivity and practical AI applications.",
       14900, null, "blue"],
    ] as const;

    let made = 0;
    for (let i = 0; i < flagships.length; i++) {
      const [sku, title, sub, desc, price, sale, color] = flagships[i];
      const { count } = await sb().from("products").select("id", { count: "exact", head: true }).eq("sku", sku);
      if ((count ?? 0) === 0) {
        await sb().from("products").insert({
          sku,
          slug: slugify(title),
          title,
          subtitle: sub,
          description: desc,
          price_cents: price,
          sale_price_cents: sale,
          status: "coming_soon",
          cover_color: color,
          featured: i === 0,
          is_new: true,
          sort_order: i + 1,
        });
        made++;
      }
    }
    return NextResponse.json({
      message: `${made} flagship product(s) seeded as Coming Soon. Upload each PDF on its product page before publishing — publishing stays blocked without a file.`,
    });
  }

  if (body.do === "seed_free") {
    const freebies = [
      ["CMC-F01", "Goal-Setting Starter Sheet", "A one-page framework to set goals you will actually keep.",
       "Free with newsletter signup. A one-page PDF framework covering goal clarity, the why behind each goal, breaking goals into weekly actions, identifying obstacles in advance and a simple weekly review ritual.", "gold"],
      ["CMC-F02", "Daily Mindset Checklist", "Five questions to ask yourself every morning.",
       "Free instant download. A one-page PDF with five morning questions covering focus, attitude, priorities, gratitude and one deliberate act of progress — printable and reusable.", "navy"],
    ] as const;

    let made = 0;
    for (const [sku, title, sub, desc, color] of freebies) {
      const { count } = await sb().from("products").select("id", { count: "exact", head: true }).eq("sku", sku);
      if ((count ?? 0) === 0) {
        await sb().from("products").insert({
          sku,
          slug: slugify(title),
          title,
          subtitle: sub,
          description: desc,
          price_cents: 0,
          status: "published",
          cover_color: color,
          sort_order: 90,
        });
        made++;
      }
    }
    return NextResponse.json({
      message: `${made} free product(s) seeded and published at R0. Upload each PDF on its product page — until then buyers see "file not available yet" if they check out. Home page free-resources section links to them.`,
    });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

/** settings save (do=save) arrives on a different route to keep actions separate */
export async function PUT(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  return NextResponse.json({ error: "use POST /api/admin/settings with form fields" }, { status: 400 });
}

export { saveSetting };
