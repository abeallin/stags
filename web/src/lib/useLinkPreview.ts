import { useEffect, useState } from "react";
import { pb } from "./pb";
import type { LinkPreviewRow } from "./types";

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

function rowToPreview(rec: LinkPreviewRow): Preview {
  return {
    title:       rec.title || undefined,
    description: rec.description || undefined,
    image:       rec.image || undefined,
    url:         rec.url,
    publisher:   rec.publisher || undefined,
    fetched:     +new Date(rec.updated || rec.created),
  };
}

async function fetchFromPb(url: string): Promise<Preview | null> {
  try {
    const rec = await pb.collection("link_previews").getFirstListItem<LinkPreviewRow>(
      `url="${url.replace(/"/g, '\\"')}"`,
    );
    return rowToPreview(rec);
  } catch {
    return null;
  }
}

async function writeToPb(p: Preview): Promise<void> {
  try {
    await pb.collection("link_previews").create({
      url:         p.url,
      title:       p.title       ?? "",
      description: p.description ?? "",
      image:       p.image       ?? "",
      publisher:   p.publisher   ?? "",
    });
  } catch {
    // unique constraint or network error — another tab beat us, that's fine
  }
}

// Session-level circuit breaker. microlink.io's free tier rate-limits at ~50
// requests/day/IP; with ~20 slots per page and ~10 lads sharing the URL we
// blow through that easily. Once any request returns 429 (or after a string
// of failures), suppress further outbound fetches for the rest of this tab —
// the page still renders the title-link / website-pill / static-map fallbacks
// just fine without a microlink preview.
let circuitBroken = false;
let consecutiveFailures = 0;
const FAILURE_THRESHOLD = 3;

// Serialize requests so a 429 on the first call trips the breaker BEFORE the
// other ~19 slot-previews fire. Concurrency 1, FIFO; cheap given we typically
// fetch once per URL ever (then localStorage cache).
let queueTail: Promise<void> = Promise.resolve();
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = queueTail.then(task, task);
  queueTail = next.then(() => undefined, () => undefined);
  return next;
}

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
    // Circuit broken (we've already hit rate limits or repeated failures) —
    // bail out without firing another fetch. Title-link + website-pill still
    // render via the fallback path in Slot.tsx.
    if (circuitBroken) {
      setLoading(false);
      setErrored(true);
      return;
    }
    setLoading(true);
    setErrored(false);
    let cancelled = false;

    // Tier 2: PocketBase shared cache. Don't queue — it's cheap and parallel.
    (async () => {
      const fromPb = await fetchFromPb(url);
      if (cancelled) return;
      if (fromPb) {
        writeCache(url, fromPb);
        setPreview(fromPb);
        setLoading(false);
        return;
      }
      // Tier 3: microlink. Queue + circuit breaker still apply.
      enqueue(async () => {
        if (cancelled) return;
        if (circuitBroken) {
          if (!cancelled) { setErrored(true); setLoading(false); }
          return;
        }
        // Re-check localStorage + PB in case another tab populated them while queued.
        const ls = readCache(url);
        if (ls) {
          if (!cancelled) { setPreview(ls); setLoading(false); }
          return;
        }
        const pb2 = await fetchFromPb(url);
        if (pb2) {
          writeCache(url, pb2);
          if (!cancelled) { setPreview(pb2); setLoading(false); }
          return;
        }
        try {
          const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
          if (res.status === 429) {
            circuitBroken = true;
            throw new Error("microlink 429");
          }
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
          writeCache(url, p);
          // Best-effort write to PB so the next lad doesn't pay this cost.
          // Fire-and-forget — don't block UI on it.
          void writeToPb(p);
          consecutiveFailures = 0;
          if (!cancelled) { setPreview(p); setLoading(false); }
        } catch {
          consecutiveFailures++;
          if (consecutiveFailures >= FAILURE_THRESHOLD) circuitBroken = true;
          if (!cancelled) { setErrored(true); setLoading(false); }
        }
      });
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
