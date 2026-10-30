#!/usr/bin/env python3
"""抓取商务播客/新闻 RSS，生成 data/latest.json 供 practice.html 与精听工作台使用。
仅在 GitHub Actions 定时任务与手动触发时运行；单个源失败不影响其他源。"""
import json
import ssl
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

# 商务听力选源逻辑：
#   BBC Business Daily —— 英音国际腔，17min，题材即 BEC Part3（职场/商业趋势）
#   FT News Briefing   —— 英音简报 <10min，商务语域入门-进阶皆宜
#   Marketplace        —— 美音，语速友好、解释性强，B2→C1 过渡首选
#   HBR IdeaCast       —— 管理层访谈，语域最接近 BEC Part3
#   BBC Global News    —— 多国记者口音，练口音多样性
#   The Intelligence   —— Economist 高语域评论（免费 feed 每周一期）
#   Skills 360 (BEP)   —— 教学型商务功能英语（谈判/会议）
FEEDS = [
    {"id": "bbc-bizdaily",   "name": "BBC Business Daily",       "url": "https://downloads.bbc.co.uk/podcasts/worldservice/bizdaily/rss.xml"},
    {"id": "marketplace",    "name": "Marketplace Morning Report", "url": "https://www.marketplace.org/feed/podcast/marketplace-morning-report"},
    {"id": "ft-briefing",    "name": "FT News Briefing",          "url": "https://feeds.acast.com/public/shows/73fe3ede-5c5c-4850-96a8-30db8dbae8bf"},
    {"id": "hbr-ideacast",   "name": "HBR IdeaCast",              "url": "https://feeds.harvardbusiness.org/harvardbusiness/ideacast"},
    {"id": "bbc-globalnews", "name": "BBC Global News Podcast",   "url": "https://downloads.bbc.co.uk/podcasts/worldservice/globalnews/rss.xml"},
    {"id": "economist-intel","name": "The Intelligence · Economist", "url": "https://feeds.acast.com/public/shows/theintelligencepodcast"},
    {"id": "skills360",      "name": "Business English Pod · Skills 360", "url": "https://feeds.feedburner.com/Skills360"},
]

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; bec180/1.0; feed updater)"}
MAX_ITEMS = 6


def fetch_feed(feed):
    req = urllib.request.Request(feed["url"], headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30, context=ssl.create_default_context()) as resp:
        data = resp.read()
    root = ET.fromstring(data)
    items = []
    for item in root.iter("item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        enclosure = item.find("enclosure")
        if not title:
            continue
        items.append({
            "title": title,
            "link": link,
            "date": (item.findtext("pubDate") or "").strip(),
            "audio": enclosure.get("url", "") if enclosure is not None else "",
        })
        if len(items) >= MAX_ITEMS:
            break
    return {"id": feed["id"], "name": feed["name"], "url": feed["url"], "items": items}


def main():
    out = {"updated": datetime.now(timezone.utc).isoformat(), "feeds": []}
    ok = 0
    for feed in FEEDS:
        try:
            out["feeds"].append(fetch_feed(feed))
            ok += 1
            print(f"OK   {feed['name']}")
        except Exception as exc:  # noqa: BLE001
            print(f"FAIL {feed['name']}: {exc}", file=sys.stderr)
    dest = Path(__file__).resolve().parent.parent / "data" / "latest.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {dest} ({ok}/{len(FEEDS)} feeds)")
    if ok == 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
