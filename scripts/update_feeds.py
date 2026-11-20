#!/usr/bin/env python3
"""抓取商务播客/新闻 RSS，生成 data/latest.json 供 practice.html 与精听工作台使用。

数据可靠性约定（与雅思站/高口站 update_feeds.py 同一契约）：
- 单个源失败时，沿用上次成功抓取的该源数据（合并写入，绝不因部分失败丢弃好数据）；
- 仅当「全部源失败且无历史数据」时才以非零码退出（CI 视为失败）；
- 每个源带 fetched_at，前端可见数据新旧。
仅在 GitHub Actions 定时任务与手动触发时运行。"""
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
    {"id": "hbr-ideacast",   "name": "HBR IdeaCast",              "url": "https://feeds.feedburner.com/harvardbusiness/ideacast"},
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
    return items


def merge_with_previous(previous, fresh):
    """合并本轮抓取结果与上次成功数据。

    fresh 每项: {id, name, url, ok, fetched_at, items}
    previous  : 上一次的 latest.json（可为 None）
    失败源沿用 previous 中同 id 的整条记录；无历史则 items 置空。
    纯函数，便于单元测试。"""
    prev_map = {f.get("id"): f for f in (previous or {}).get("feeds", [])}
    merged = []
    for f in fresh:
        if f["ok"]:
            merged.append({
                "id": f["id"], "name": f.get("name", f["id"]), "url": f.get("url", ""),
                "items": f["items"], "fetched_at": f["fetched_at"],
            })
        elif f["id"] in prev_map:
            keep = dict(prev_map[f["id"]])
            keep.setdefault("fetched_at", None)
            merged.append(keep)
        else:
            merged.append({
                "id": f["id"], "name": f.get("name", f["id"]), "url": f.get("url", ""),
                "items": [], "fetched_at": None,
            })
    return merged


def main():
    now = datetime.now(timezone.utc).isoformat()
    dest = Path(__file__).resolve().parent.parent / "data" / "latest.json"
    previous = None
    if dest.exists():
        try:
            previous = json.loads(dest.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            previous = None  # 历史文件损坏时按无历史处理，不让本次抓取失败

    fresh = []
    ok = 0
    for feed in FEEDS:
        try:
            items = fetch_feed(feed)
            fresh.append({"id": feed["id"], "name": feed["name"], "url": feed["url"],
                          "ok": True, "fetched_at": now, "items": items})
            ok += 1
            print(f"OK   {feed['name']}")
        except Exception as exc:  # noqa: BLE001
            fresh.append({"id": feed["id"], "name": feed["name"], "url": feed["url"],
                          "ok": False, "fetched_at": now, "items": []})
            print(f"FAIL {feed['name']}: {exc}", file=sys.stderr)

    out = {"updated": now, "feeds": merge_with_previous(previous, fresh)}
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    kept = sum(1 for f in out["feeds"] if f.get("items"))
    print(f"wrote {dest} ({ok}/{len(FEEDS)} feeds fetched, {kept} feeds with items after merge)")
    if ok == 0 and kept == 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
