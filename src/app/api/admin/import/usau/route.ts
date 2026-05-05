import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { parseUsauScheduleHtml } from "@/lib/usau-import";

export async function POST(request: Request) {
  await requireAdmin();
  const { url } = await request.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "A USAU URL is required." }, { status: 400 });
  }

  const response = await fetch(url, { next: { revalidate: 60 } });
  if (!response.ok) {
    return NextResponse.json({ error: `USAU returned ${response.status}.` }, { status: 400 });
  }

  const html = await response.text();
  const draft = parseUsauScheduleHtml(html, url);
  return NextResponse.json({ draft });
}
