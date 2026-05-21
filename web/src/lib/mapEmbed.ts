// Convert any Google Maps URL into the keyless iframe-embed form:
//   https://maps.google.com/maps?q=...&output=embed
//
// Supports the URL shapes we actually store (canonical Maps Search URLs from
// migration 1748000008), plus legacy /place/, @lat,lng, and existing embeds.
//
// Cribbed from kifleandmilka's template-utils.toEmbedUrl with adjustments
// for our `?api=1&query=` migration output.

export function toEmbedUrl(url: string): string {
  if (!url) return "";
  // Already an embed URL
  if (url.includes("/maps/embed") || url.includes("output=embed")) return url;

  // Canonical Maps Search URL: /maps/search/?api=1&query=...
  // Also catches the legacy ?q=... form.
  try {
    const u = new URL(url);
    const q = u.searchParams.get("query") || u.searchParams.get("q");
    if (q) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
    }
  } catch {
    // fall through to regex extraction
  }

  // /place/NAME/@lat,lng — coordinates beat the name because the name can be
  // ambiguous across cities.
  const placeMatch = url.match(/\/place\/([^/@]+)/);
  const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);

  if (placeMatch && coordMatch) {
    const query = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}+@${coordMatch[1]},${coordMatch[2]}&output=embed`;
  }
  if (coordMatch) {
    return `https://maps.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}&output=embed`;
  }
  if (placeMatch) {
    const query = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
  }

  // Unknown shape — return as-is; the iframe will just open whatever this URL
  // points to (Google will redirect to a search if it doesn't recognise it).
  return url;
}
