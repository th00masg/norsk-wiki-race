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

export async function fetchAndTransformArticle(
  slug: string
): Promise<{ html: string; title: string }> {
  const url = `https://no.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(slug)}&prop=text|displaytitle&format=json&disableeditsection=1`;

  const res = await fetch(url);
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

  // Rewrite internal wiki links
  html = html.replace(
    /href="\/wiki\/([^"#]*)(#[^"]*)?" /g,
    (match, articleSlug, anchor) => {
      const decodedSlug = decodeURIComponent(articleSlug);
      // Skip special namespace links
      if (SPECIAL_NAMESPACES.some((ns) => decodedSlug.startsWith(ns))) {
        return `href="https://no.wikipedia.org/wiki/${articleSlug}${anchor || ""}" target="_blank" rel="noopener" `;
      }
      return `href="#" data-wiki-slug="${articleSlug}" `;
    }
  );

  // Also handle links without trailing space
  html = html.replace(
    /href="\/wiki\/([^"#]*)(#[^"]*)?">/g,
    (match, articleSlug, anchor) => {
      const decodedSlug = decodeURIComponent(articleSlug);
      if (SPECIAL_NAMESPACES.some((ns) => decodedSlug.startsWith(ns))) {
        return `href="https://no.wikipedia.org/wiki/${articleSlug}${anchor || ""}" target="_blank" rel="noopener">`;
      }
      return `href="#" data-wiki-slug="${articleSlug}">`;
    }
  );

  // Make image sources absolute
  html = html.replace(/src="\/\//g, 'src="https://');
  html = html.replace(
    /src="\/static\//g,
    'src="https://no.wikipedia.org/static/'
  );
  html = html.replace(
    /src="\/w\//g,
    'src="https://no.wikipedia.org/w/'
  );

  // Make srcset absolute
  html = html.replace(/srcset="\/\//g, 'srcset="https://');

  // Remove script tags
  html = html.replace(/<script[\s\S]*?<\/script>/gi, "");

  // Remove style tags from Wikipedia
  html = html.replace(/<style[\s\S]*?<\/style>/gi, "");

  return { html, title };
}
