import { NextRequest, NextResponse } from "next/server";
import { fetchAndTransformArticle } from "@/lib/wiki-proxy";

const cache = new Map<string, { html: string; title: string; time: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const articleSlug = slug.join("/");
  const decodedSlug = decodeURIComponent(articleSlug);

  // Check cache
  const cached = cache.get(decodedSlug);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return NextResponse.json({
      html: cached.html,
      title: cached.title,
      slug: decodedSlug,
    });
  }

  try {
    const { html, title } = await fetchAndTransformArticle(decodedSlug);

    // Store in cache
    cache.set(decodedSlug, { html, title, time: Date.now() });

    // Limit cache size
    if (cache.size > 200) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }

    return NextResponse.json({ html, title, slug: decodedSlug });
  } catch {
    return NextResponse.json(
      { error: "Artikkelen ble ikke funnet" },
      { status: 404 }
    );
  }
}
