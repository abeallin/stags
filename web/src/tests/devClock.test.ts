import { describe, it, expect } from "vitest";
import { getDevNowOverride } from "../lib/devClock";

describe("getDevNowOverride", () => {
  it("returns null in production regardless of query", () => {
    expect(getDevNowOverride("?now=2026-06-12T13:00", false)).toBeNull();
  });

  it("returns null when no now param is present", () => {
    expect(getDevNowOverride("?foo=bar", true)).toBeNull();
  });

  it("parses a valid ISO now param in dev", () => {
    const d = getDevNowOverride("?now=2026-06-12T13:00", true);
    expect(d).toBeInstanceOf(Date);
    expect(d?.getTime()).toBe(new Date("2026-06-12T13:00").getTime());
  });

  it("returns null for an unparseable now param", () => {
    expect(getDevNowOverride("?now=not-a-date", true)).toBeNull();
  });
});
