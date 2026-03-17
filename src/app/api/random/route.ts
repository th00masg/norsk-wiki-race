import { NextResponse } from "next/server";
import { WIKI_HEADERS } from "@/lib/wiki-proxy";

export async function GET() {
  const res = await fetch(
    "https://no.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=1&format=json",
    { headers: WIKI_HEADERS }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Kunne ikke hente tilfeldig artikkel" }, { status: 500 });
  }

  const data = await res.json();
  const article = data.query.random[0];
  const title = article.title as string;

  // Resolve redirects to get the canonical title
  const redirectRes = await fetch(
    `https://no.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&redirects=1&format=json`,
    { headers: WIKI_HEADERS }
  );

  let canonicalTitle = title;
  if (redirectRes.ok) {
    const redirectData = await redirectRes.json();
    const redirects = (redirectData.query?.redirects || []) as Array<{ from: string; to: string }>;
    if (redirects.length > 0) {
      canonicalTitle = redirects[redirects.length - 1].to;
    }
  }

  const slug = canonicalTitle.replace(/ /g, "_");
  return NextResponse.json({ title: canonicalTitle, slug });
}
