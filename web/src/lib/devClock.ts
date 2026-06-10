/**
 * Dev-only clock override. When the app is built in dev mode and the URL has a
 * `?now=<ISO>` param, the app's `now` is seeded from it so trip-live UI states
 * (NOW bar, collapsed past events, auto-opened now-map) can be QA'd before the
 * trip actually starts. Inert in production builds.
 */
export function getDevNowOverride(search: string, isDev: boolean): Date | null {
  if (!isDev) return null;
  const raw = new URLSearchParams(search).get("now");
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(+d) ? null : d;
}
