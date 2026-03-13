import { NextRequest, NextResponse } from "next/server";
import { WIKI_HEADERS } from "@/lib/wiki-proxy";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q) {
    return NextResponse.json([]);
  }

  const res = await fetch(
    `https://no.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=8&namespace=0&format=json`,
    { headers: WIKI_HEADERS }
  );

  if (!res.ok) {
    return NextResponse.json([]);
  }

  const data = await res.json();
  const results = (data[1] as string[]).map((title: string, i: number) => ({
    title,
    slug: title.replace(/ /g, "_"),
    description: (data[2] as string[])[i] || "",
  }));

  return NextResponse.json(results);
}
