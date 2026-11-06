"""Refresh data/videos.json from the channel's public YouTube RSS feed (latest 15 uploads).

Run by .github/workflows/deploy.yml on every deploy and once a day. Stdlib only.
"""
import json
import pathlib
import urllib.request
import xml.etree.ElementTree as ET

CHANNEL_ID = "UCiynhQDY03Shb994WtMz1rg"  # @eethangaoo
FEED = f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}"
OUT = pathlib.Path(__file__).resolve().parent.parent / "data" / "videos.json"
NS = {
    "a": "http://www.w3.org/2005/Atom",
    "yt": "http://www.youtube.com/xml/schemas/2015",
    "media": "http://search.yahoo.com/mrss/",
}


def main():
    with urllib.request.urlopen(FEED, timeout=30) as resp:
        root = ET.fromstring(resp.read())

    videos = []
    for entry in root.findall("a:entry", NS):
        title = entry.findtext("a:title", "", NS)
        link = entry.find("a:link", NS)
        href = link.get("href", "") if link is not None else ""
        videos.append({
            "id": entry.findtext("yt:videoId", "", NS),
            "title": title,
            "published": entry.findtext("a:published", "", NS)[:10],
            "kind": "short" if "/shorts/" in href or "#shorts" in title.lower() else "video",
            "description": (entry.findtext("media:group/media:description", "", NS) or "")[:280],
        })

    if not videos:
        raise SystemExit("Feed returned no videos; keeping the existing data/videos.json")

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(videos, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(videos)} videos to {OUT}")


if __name__ == "__main__":
    main()
