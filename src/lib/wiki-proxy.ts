const SPECIAL_NAMESPACES = [
  "File:",
  "Fil:",
  "Wikipedia:",
  "Kategori:",
  "Hjelp:",
  "Spesial:",
  "Bruker:",
  "Brukerdiskusjon:",
  "Mal:",
  "Portal:",
  "Modul:",
  "MediaWiki:",
];

export const WIKI_HEADERS = {
  "User-Agent": "NorskWikiRace/1.0 (https://norsk-wiki-race.vercel.app; wiki-race game)",
  "Accept": "application/json",
};

/**
 * Fetch raw article HTML from Wikipedia API and do basic cleanup.
 * Shared by both player and host routes.
 */
export async function fetchArticleHtml(
  slug: string
): Promise<{ html: string; title: string }> {
  const url = `https://no.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(slug)}&prop=text|displaytitle&format=json&disableeditsection=1`;

  const res = await fetch(url, { headers: WIKI_HEADERS });
  if (!res.ok) {
    throw new Error(`Wikipedia API error: ${res.status}`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.info || "Article not found");
  }

  let html: string = data.parse.text["*"];
  const title: string = data.parse.displaytitle;

  // Remove edit sections
  html = html.replace(/<span class="mw-editsection">[\s\S]*?<\/span>/g, "");

  // Remove unwanted elements by class
  const removeClasses = [
    "mw-empty-elt",
    "noprint",
    "sistersitebox",
    "side-box",
    "ambox",
    "navbox",
    "vertical-navbox",
    "metadata",
  ];
  for (const cls of removeClasses) {
    const regex = new RegExp(
      `<div[^>]*class="[^"]*\\b${cls}\\b[^"]*"[^>]*>[\\s\\S]*?<\\/div>`,
      "g"
    );
    html = html.replace(regex, "");
  }

  // Remove elements by id
  html = html.replace(/<[^>]*id="coordinates"[^>]*>[\s\S]*?<\/[^>]*>/g, "");

  // Make image/resource sources absolute
  html = html.replace(/src="\/\//g, 'src="https://');
  html = html.replace(/src="\/static\//g, 'src="https://no.wikipedia.org/static/');
  html = html.replace(/src="\/w\//g, 'src="https://no.wikipedia.org/w/');
  html = html.replace(/srcset="\/\//g, 'srcset="https://');

  // Remove script and style tags
  html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<style[\s\S]*?<\/style>/gi, "");

  return { html, title };
}

/**
 * Transform article HTML for player view: rewrite wiki links to data-wiki-slug
 * attributes for click interception.
 */
export function transformForPlayer(html: string): string {
  // Robust regex using lookahead: matches href="/wiki/..." where quote is followed by > or whitespace
  return html.replace(
    /href="\/wiki\/([^"#]*)(#[^"]*)?"(?=[>\s])/g,
    (_match, articleSlug: string, anchor: string | undefined) => {
      const decodedSlug = decodeURIComponent(articleSlug);
      if (SPECIAL_NAMESPACES.some((ns) => decodedSlug.startsWith(ns))) {
        return `href="https://no.wikipedia.org/wiki/${articleSlug}${anchor || ""}" target="_blank" rel="noopener"`;
      }
      return `href="#" data-wiki-slug="${articleSlug}"`;
    }
  );
}

/**
 * Build a full standalone HTML page for iframe embedding (host dashboard).
 * All interactions disabled via CSS.
 */
export function buildIframePage(html: string, title: string): string {
  // Make wiki links absolute for display only
  const pageHtml = html.replace(
    /href="\/wiki\/([^"]*)"/g,
    'href="https://no.wikipedia.org/wiki/$1"'
  );

  return `<!DOCTYPE html>
<html lang="no">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 13px;
    line-height: 1.5;
    color: #202122;
    background: #fff;
    padding: 12px;
    pointer-events: none;
    user-select: none;
    overflow-y: auto;
  }
  a { color: #7c3aed; text-decoration: none; }
  h2 { font-size: 1.1rem; border-bottom: 2px solid #e9d5ff; padding-bottom: 2px; margin: 1rem 0 0.4rem; color: #5b21b6; }
  h3 { font-size: 0.95rem; margin: 0.7rem 0 0.2rem; color: #6d28d9; }
  ul { list-style: disc; padding-left: 1.3rem; margin: 0.2rem 0; }
  ol { list-style: decimal; padding-left: 1.3rem; margin: 0.2rem 0; }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; margin: 0.4rem 0; }
  .infobox { float: right; margin: 0 0 0.8rem 0.8rem; max-width: 220px; border: 1px solid #ddd; padding: 4px; font-size: 0.8em; background: #f8f9fa; }
  .infobox td, .infobox th { padding: 2px 4px; vertical-align: top; }
  .thumb { margin: 4px; text-align: center; }
  .thumbinner { border: 1px solid #ccc; padding: 2px; background: #f8f9fa; font-size: 0.8em; }
  .toc, .reflist, .references, .mw-editsection, sup.reference { display: none; }
</style>
</head>
<body>${pageHtml}</body>
</html>`;
}
