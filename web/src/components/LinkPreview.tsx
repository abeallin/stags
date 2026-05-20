import { useLinkPreview, hostname } from "../lib/useLinkPreview";

interface Props {
  url: string;
  fallbackLabel: string;
  kind: "map" | "site";
}

export default function LinkPreview({ url, fallbackLabel, kind }: Props) {
  const { preview, loading, errored } = useLinkPreview(url);

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
