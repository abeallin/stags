// Brand-styled replacements for window.confirm() and window.alert().
// Single mounted <DialogHost /> at the app root subscribes to a module-level
// pub/sub. Code anywhere can call `confirm({...})` or `toast(...)` without
// React context plumbing.

import { useEffect, useState } from "react";

export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

interface ToastMessage {
  id: number;
  message: string;
  kind: "info" | "error";
}

type ConfirmListener = (req: ConfirmRequest) => void;
type ToastListener   = (msg: ToastMessage) => void;

let confirmListener: ConfirmListener | null = null;
let toastListener:   ToastListener   | null = null;
let toastId = 0;

export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    if (confirmListener) confirmListener({ ...options, resolve });
    else resolve(window.confirm(options.body ?? options.title));
  });
}

export function toast(message: string, kind: ToastMessage["kind"] = "info"): void {
  if (toastListener) toastListener({ id: ++toastId, message, kind });
  else if (kind === "error") console.error(message);
}

// ─── DialogHost ──────────────────────────────────────────────────────

export function DialogHost() {
  const [req,    setReq]    = useState<ConfirmRequest | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    confirmListener = (r) => setReq(r);
    toastListener   = (m) => {
      setToasts(prev => [...prev, m]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== m.id)), 4000);
    };
    return () => { confirmListener = null; toastListener = null; };
  }, []);

  function answer(ok: boolean) {
    if (!req) return;
    req.resolve(ok);
    setReq(null);
  }

  return (
    <>
      {req && (
        <div className="modal-backdrop" onClick={() => answer(false)}>
          <div className="modal confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="modal-eyebrow">// CONFIRM</div>
                <h3>{req.title}</h3>
              </div>
            </div>
            {req.body && (
              <div className="modal-body">
                <p className="confirm-body">{req.body}</p>
              </div>
            )}
            <div className="modal-foot">
              <button
                type="button"
                className="secondary"
                onClick={() => answer(false)}
                autoFocus
              >
                {req.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                className={req.destructive ? "primary danger" : "primary"}
                onClick={() => answer(true)}
              >
                {req.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
      {toasts.length > 0 && (
        <div className="toast-stack">
          {toasts.map(t => (
            <div key={t.id} className={`toast${t.kind === "error" ? " error" : ""}`}>
              {t.message}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
