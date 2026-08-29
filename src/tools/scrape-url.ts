import { Website } from "@spider-rs/spider-rs";

export function scrapeUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const website = new Website(url)
      .withBudget({
        '*': 1, // limit max request 20 pages for the website
      })
      .build()
    website.crawl((_err, page) => {
      if (_err) {
        reject(_err);
      } else {
        resolve(page.content);
      }
    });
  });
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function resolveUrl(base: string, relative: string): string {
  return new URL(decodeHtmlEntities(relative), base).href;
}

function extractBaseUrl(html: string): string | undefined {
  const baseRegex = /<base[^>]*\shref=["']([^"']+)["']/i;
  const match = baseRegex.exec(html);
  return match ? match[1] : undefined;
}

function extractStyleTags(html: string): string[] {
  const styles: string[] = [];
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match: RegExpExecArray | null;
  while ((match = styleRegex.exec(html)) !== null) {
    styles.push(match[1]??"");
  }
  return styles;
}

function extractInlineStyles(html: string): string[] {
  const styles: string[] = [];
  const styleAttrRegex = /style=["']([^"']*)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = styleAttrRegex.exec(html)) !== null) {
    styles.push(match[1]??"");
  }
  return styles;
}

function extractStylesheetLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const seen = new Set<string>();

  const linkRegex = /<link[^>]*(?:rel=["']stylesheet["'][^>]*href=["']([^"']+)["']|href=["']([^"']+)["'][^>]*rel=["']stylesheet["'])[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1] ?? match[2];
    if (href && !seen.has(href)) {
      seen.add(href);
      links.push(resolveUrl(baseUrl, href));
    }
  }

  return links;
}

function extractCssVariables(cssText: string): Map<string, string> {
  const variables = new Map<string, string>();
  // Match CSS custom property declarations: --name: value;
  // The value stops at the next ; or }, so minified CSS like :root{--a:1;--b:2}
  // is parsed correctly. { is also excluded to avoid matching selectors that
  // contain -- (e.g. .cdx-button--action-destructive:hover{...}).
  const varRegex = /(--[a-zA-Z0-9-_]+)\s*:\s*([^;{}\n]+)(?:;|})/g;
  let match: RegExpExecArray | null;
  while ((match = varRegex.exec(cssText)) !== null) {
    const name = match[1]??"";
    const value = match[2] ? match[2].trim() : "";
    variables.set(name, value);
  }
  return variables;
}

function extractImports(cssText: string, baseUrl: string): string[] {
  const imports: string[] = [];
  const importRegex = /@import\s+(?:url\()?["']([^"']+)["']\)?[^;]*;/gi;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(cssText)) !== null) {
    imports.push(resolveUrl(baseUrl, match[1]??""));
  }
  return imports;
}

async function fetchCss(
  url: string,
  mergeVariables: (css: string) => void,
  seen: Set<string>,
  depth = 0,
): Promise<void> {
  if (seen.has(url) || depth > 3) {
    return;
  }
  seen.add(url);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return;
    }
    const css = await response.text();
    mergeVariables(css);

    // Follow @import rules to capture variables from imported stylesheets.
    for (const importedUrl of extractImports(css, url)) {
      await fetchCss(importedUrl, mergeVariables, seen, depth + 1);
    }
  } catch {
    // Ignore stylesheets that cannot be fetched or parsed.
  }
}

/**
 * Extracts all CSS custom properties (--*) found in a website's HTML and
 * linked stylesheets, then returns them as a single :root block suitable for
 * a Marp theme (https://marpit.marp.app/theme-css).
 *
 * Later declarations overwrite earlier ones, matching CSS cascade behavior
 * for equally-specific selectors.
 */
export async function ExtractCss(
  html: string,
  baseUrl?: string,
): Promise<string> {
  const effectiveBaseUrl = extractBaseUrl(html) ?? baseUrl;
  const allVariables = new Map<string, string>();

  const mergeVariables = (css: string) => {
    for (const [name, value] of extractCssVariables(css)) {
      allVariables.set(name, value);
    }
  };

  // Inline <style> blocks
  for (const style of extractStyleTags(html)) {
    mergeVariables(style);
  }

  // Inline style="..." attributes
  for (const inline of extractInlineStyles(html)) {
    mergeVariables(inline);
  }

  const seenStylesheets = new Set<string>();

  // External stylesheets referenced by <link rel="stylesheet">
  if (effectiveBaseUrl) {
    const links = extractStylesheetLinks(html, effectiveBaseUrl);
    for (const link of links) {
      await fetchCss(link, mergeVariables, seenStylesheets);
    }
  }

  if (allVariables.size === 0) {
    return ":root {\n}";
  }

  const lines = Array.from(allVariables.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `  ${name}: ${value};`);

  return `:root {\n${lines.join("\n")}\n}`;
}


function extractImageUrls(html: string, baseUrl?: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  const addUrl = (raw: string) => {
    const url = raw.trim();
    if (!url || url.startsWith("data:")) {
      return;
    }
    const resolved = baseUrl ? resolveUrl(baseUrl, url) : url;
    if (!seen.has(resolved)) {
      seen.add(resolved);
      urls.push(resolved);
    }
  };

  // <img src="...">
  const imgRegex = /<img[^>]*\ssrc=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(html)) !== null) {
    addUrl(match[1]??"");
  }

  // <source srcset="url1 1x, url2 2x, ...">
  const srcsetRegex = /<(?:source|img)[^>]*\ssrcset=["']([^"']+)["']/gi;
  while ((match = srcsetRegex.exec(html)) !== null) {
    const candidates = match[1] ? match[1].split(",") : [];
    for (const candidate of candidates) {
      const imageUrl = candidate.trim().split(/\s+/)[0];
      if (imageUrl) {
        addUrl(imageUrl);
      }
    }
  }

  // CSS background-image: url(...) in <style> blocks and inline styles
  const cssImageRegex = /url\(["']?([^"')]+)["']?\)/gi;
  for (const css of [...extractStyleTags(html), ...extractInlineStyles(html)]) {
    while ((match = cssImageRegex.exec(css)) !== null) {
      addUrl(match[1]??"");
    }
  }

  // <link rel="icon|shortcut icon|apple-touch-icon" href="...">
  const iconRegex = /<link[^>]*\srel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*\shref=["']([^"']+)["']/gi;
  while ((match = iconRegex.exec(html)) !== null) {
    addUrl(match[1]??"");
  }

  return urls;
}

/**
 * Extracts all image URLs found in the provided HTML and downloads them.
 * Relative URLs are resolved against the optional baseUrl. Data URIs are
 * skipped. Returns an array of unique image payloads as Uint8Array bytes.
 * Images that fail to download are silently omitted.
 */
export async function downloadImagesFromHtml(
  html: string,
  baseUrl?: string,
): Promise<Uint8Array[]> {
  const urls = extractImageUrls(html, baseUrl);
  const images: Uint8Array[] = [];

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        continue;
      }
      const buffer = await response.arrayBuffer();
      images.push(new Uint8Array(buffer));
    } catch {
      // Ignore images that cannot be fetched or parsed.
    }
  }

  return images;
}
