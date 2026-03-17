import { NextRequest, NextResponse } from "next/server";
import { WIKI_HEADERS } from "@/lib/wiki-proxy";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q) {
    return NextResponse.json([]);
  }

  // Step 1: Get search suggestions
  const res = await fetch(
    `https://no.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=8&namespace=0&format=json`,
    { headers: WIKI_HEADERS }
  );

  if (!res.ok) {
    return NextResponse.json([]);
  }

  const data = await res.json();
  const titles = data[1] as string[];
  const descriptions = data[2] as string[];

  if (titles.length === 0) {
    return NextResponse.json([]);
  }

  // Step 2: Resolve redirects by querying the Wikipedia API with redirects flag
  const redirectRes = await fetch(
    `https://no.wikipedia.org/w/api.php?action=query&titles=${titles.map(t => encodeURIComponent(t)).join("|")}&redirects=1&format=json`,
    { headers: WIKI_HEADERS }
  );

  // Build a map from original title -> canonical title
  const canonicalMap = new Map<string, string>();

  if (redirectRes.ok) {
    const redirectData = await redirectRes.json();
    // normalized: [{from, to}] - handles spaces/casing
    const normalized = (redirectData.query?.normalized || []) as Array<{ from: string; to: string }>;
    // redirects: [{from, to}] - handles actual redirect pages
    const redirects = (redirectData.query?.redirects || []) as Array<{ from: string; to: string }>;

    // Build chain: original -> normalized -> redirected
    const normalizedMap = new Map<string, string>();
    for (const n of normalized) {
      normalizedMap.set(n.from, n.to);
    }
    const redirectMap = new Map<string, string>();
    for (const r of redirects) {
      redirectMap.set(r.from, r.to);
    }

    for (const title of titles) {
      let resolved = title;
      // Follow normalization
      if (normalizedMap.has(resolved)) {
        resolved = normalizedMap.get(resolved)!;
      }
      // Follow redirect
      if (redirectMap.has(resolved)) {
        resolved = redirectMap.get(resolved)!;
      }
      canonicalMap.set(title, resolved);
    }
  }

  const results = titles.map((title: string, i: number) => {
    const canonicalTitle = canonicalMap.get(title) || title;
    return {
      title: canonicalTitle,
      slug: canonicalTitle.replace(/ /g, "_"),
      description: descriptions[i] || "",
    };
  });

  // Deduplicate results (multiple search terms may resolve to the same canonical page)
  const seen = new Set<string>();
  const deduped = results.filter((r) => {
    if (seen.has(r.slug)) return false;
    seen.add(r.slug);
    return true;
  });

  return NextResponse.json(deduped);
}
