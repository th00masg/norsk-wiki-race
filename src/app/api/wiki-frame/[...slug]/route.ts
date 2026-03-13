import { NextRequest, NextResponse } from "next/server";
import { fetchArticleHtml, buildIframePage } from "@/lib/wiki-proxy";

const cache = new Map<string, { page: string; time: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const articleSlug = slug.join("/");
  const decodedSlug = decodeURIComponent(articleSlug);

  const cached = cache.get(decodedSlug);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return new NextResponse(cached.page, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  try {
    const { html, title } = await fetchArticleHtml(decodedSlug);
    const page = buildIframePage(html, title);

    cache.set(decodedSlug, { page, time: Date.now() });
    if (cache.size > 200) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }

    return new NextResponse(page, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch {
    return new NextResponse("<html><body><p>Artikkel ikke funnet</p></body></html>", {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}
