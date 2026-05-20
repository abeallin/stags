"""Parse source HTML and emit a JS literal of slot URLs for the migration."""
import re
import json
from pathlib import Path
from bs4 import BeautifulSoup


def parse(html_path: Path, stag_slug: str):
    soup = BeautifulSoup(html_path.read_text(encoding="utf-8"), "html.parser")
    result = []
    for section in soup.select("section.day-section"):
        date_div = section.select_one(".day-date")
        if not date_div:
            continue
        date_str = date_div.get_text(strip=True)
        m = re.search(r"(\d{1,2})\s+June", date_str)
        if not m:
            continue
        day = int(m.group(1))
        iso_date = f"2026-06-{day:02d}"

        for slot in section.select(".slot"):
            title_el = slot.select_one(".slot-title")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            map_url = website_url = None
            for a in slot.select(".slot-actions a"):
                href = a.get("href", "")
                label = a.get_text(strip=True).lower()
                if not href:
                    continue
                if label in {"map", "maps", "location"} or "maps." in href or "/maps/" in href or "goo.gl/maps" in href:
                    map_url = href
                elif label in {"website", "site", "info", "menu", "tickets", "book"}:
                    if not website_url:
                        website_url = href
            if map_url or website_url:
                result.append({
                    "stag": stag_slug,
                    "date": iso_date,
                    "title": title,
                    "map_url": map_url,
                    "website_url": website_url,
                })
    return result


root = Path(r"C:\Users\Abel\Stags\pocketbase\source-html")
all_rows = []
all_rows += parse(root / "bcn-stag-2026.html", "bcn")
all_rows += parse(root / "sthlm-stag-2026.html", "sthlm")

print(f"// {len(all_rows)} slots with URLs")
print(json.dumps(all_rows, indent=2, ensure_ascii=True))
