import { useEffect, useState } from "react";

interface Preview {
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

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

interface Props {
  url: string;
  fallbackLabel: string;
  kind: "map" | "site";
}

export default function LinkPreview({ url, fallbackLabel, kind }: Props) {
  const [preview, setPreview] = useState<Preview | null>(() => readCache(url));
  const [loading, setLoading] = useState(!preview);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (preview) return;
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
  }, [url, preview]);

  if (errored) {
    return (
      <a className="link-preview link-preview-fallback" href={url} target="_blank" rel="noopener noreferrer">
        <div className="link-preview-kind">{kind === "map" ? "MAP" : "SITE"}</div>
        <div className="link-preview-meta">
          <div className="link-preview-domain">{hostname(url)}</div>
          <div className="link-preview-title">{fallbackLabel}</div>
        </div>
        <div className="link-preview-arrow">↗</div>
      </a>
    );
  }

  if (loading || !preview) {
    return (
      <div className="link-preview link-preview-loading" aria-busy="true">
        <div className="link-preview-skeleton" />
        <div className="link-preview-meta">
          <div className="link-preview-domain">{hostname(url)}</div>
          <div className="link-preview-title">Loading preview…</div>
        </div>
      </div>
    );
  }

  const domain = preview.publisher || hostname(preview.url);
  const title = preview.title?.trim() || fallbackLabel;

  return (
    <a className="link-preview" href={url} target="_blank" rel="noopener noreferrer">
      {preview.image ? (
        <div
          className="link-preview-image"
          style={{ backgroundImage: `url(${preview.image})` }}
          role="img"
          aria-label=""
        />
      ) : (
        <div className="link-preview-kind">{kind === "map" ? "MAP" : "SITE"}</div>
      )}
      <div className="link-preview-meta">
        <div className="link-preview-domain">{domain}</div>
        <div className="link-preview-title">{title}</div>
        {preview.description && (
          <div className="link-preview-desc">{preview.description}</div>
        )}
      </div>
      <div className="link-preview-arrow">↗</div>
    </a>
  );
}
