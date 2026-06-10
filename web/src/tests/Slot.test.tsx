import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Slot from "../components/Slot";
import type { Slot as SlotType } from "../lib/types";

function makeSlot(over: Partial<SlotType> = {}): SlotType {
  return {
    id: "s1", day: "d1", start_time: "2026-06-12T13:00",
    time_label: "1pm · lunch", title: "Kajsas Fisk", note: "",
    tags: [], is_featured: false, sort_order: 0,
    map_url: "https://maps.google.com/?q=Kajsas+Fisk", ...over,
  };
}

describe("Slot map placeholder", () => {
  it("renders a placeholder, not an iframe, for a future slot with a map", () => {
    render(<Slot slot={makeSlot()} state="future" />);
    expect(screen.queryByTitle("Map of Kajsas Fisk")).toBeNull();
    expect(screen.getByRole("button", { name: /load map of kajsas fisk/i })).toBeTruthy();
  });

  it("loads the iframe when the placeholder is tapped", () => {
    render(<Slot slot={makeSlot()} state="future" />);
    fireEvent.click(screen.getByRole("button", { name: /load map of kajsas fisk/i }));
    expect(screen.getByTitle("Map of Kajsas Fisk")).toBeTruthy();
  });

  it("deep-links 'Open in Maps' to the raw map_url", () => {
    render(<Slot slot={makeSlot()} state="future" />);
    const link = screen.getByRole("link", { name: /open in maps/i }) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("https://maps.google.com/?q=Kajsas+Fisk");
  });

  it("auto-opens the map for the current (now) slot", () => {
    render(<Slot slot={makeSlot()} state="now" />);
    expect(screen.getByTitle("Map of Kajsas Fisk")).toBeTruthy();
  });
});
