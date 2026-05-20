import { useEffect, useState } from "react";

export interface Preview {
  title?: string;
  description?: string;
  image?: string;
  url: string;
  publisher?: string;
  fetched: number;
}

const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_PREFIX = "stags.linkpreview.";

function readCache(url: string): Preview | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + url);
    if (!raw) return null;
    const p = JSON.parse(raw) as Preview;
    if (Date.now() - p.fetched > TTL_MS) return null;
    return p;
  } catch {
    return null;
  }
}

function writeCache(url: string, p: Preview): void {
  try {
    localStorage.setItem(CACHE_PREFIX + url, JSON.stringify(p));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

export interface UseLinkPreviewResult {
  preview: Preview | null;
  loading: boolean;
  errored: boolean;
}

export function useLinkPreview(url: string | undefined | null): UseLinkPreviewResult {
  const [preview, setPreview] = useState<Preview | null>(() =>
    url ? readCache(url) : null
  );
  const [loading, setLoading] = useState<boolean>(() => !!url && !readCache(url));
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!url) {
      setPreview(null);
      setLoading(false);
      setErrored(false);
      return;
    }
    const cached = readCache(url);
    if (cached) {
      setPreview(cached);
      setLoading(false);
      setErrored(false);
      return;
    }
    setLoading(true);
    setErrored(false);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error(`microlink ${res.status}`);
        const json = await res.json();
        if (json.status !== "success" || !json.data) throw new Error("microlink fail");
        const data = json.data;
        const p: Preview = {
          title:       typeof data.title === "string" ? data.title : undefined,
          description: typeof data.description === "string" ? data.description : undefined,
          image:       data.image?.url ?? data.logo?.url,
          url:         typeof data.url === "string" ? data.url : url,
          publisher:   typeof data.publisher === "string" ? data.publisher : undefined,
          fetched:     Date.now(),
        };
        if (cancelled) return;
        writeCache(url, p);
        setPreview(p);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setErrored(true);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  return { preview, loading, errored };
}

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
