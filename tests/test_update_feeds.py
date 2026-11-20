"""update_feeds.merge_with_previous 的单元测试（python -m unittest discover -s tests）。

契约：源失败时沿用上次成功数据（绝不因部分失败丢弃好数据）；
成功源整体替换；无历史的失败源 items 置空。与雅思站/高口站同一契约。"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
from update_feeds import merge_with_previous  # noqa: E402


class TestMergeWithPrevious(unittest.TestCase):
    def test_failed_feed_falls_back_to_previous(self):
        """源失败时必须沿用上次成功数据，不得清空。"""
        previous = {"feeds": [{
            "id": "bbc-bizdaily", "name": "BBC Business Daily", "url": "u",
            "items": [{"title": "旧节目", "link": "https://x/1"}],
            "fetched_at": "2026-11-19T00:00:00+00:00",
        }]}
        fresh = [{"id": "bbc-bizdaily", "name": "BBC Business Daily", "url": "u",
                  "ok": False, "fetched_at": "2026-11-20T00:00:00+00:00", "items": []}]
        merged = merge_with_previous(previous, fresh)
        self.assertEqual(len(merged), 1)
        self.assertEqual(merged[0]["items"], [{"title": "旧节目", "link": "https://x/1"}])
        self.assertEqual(merged[0]["fetched_at"], "2026-11-19T00:00:00+00:00")

    def test_success_replaces_previous(self):
        previous = {"feeds": [{"id": "a", "items": [{"title": "旧"}], "fetched_at": "t0"}]}
        fresh = [{"id": "a", "name": "测试源", "url": "u", "ok": True, "fetched_at": "t1", "items": [{"title": "新"}]}]
        merged = merge_with_previous(previous, fresh)
        self.assertEqual(merged[0]["items"], [{"title": "新"}])
        self.assertEqual(merged[0]["fetched_at"], "t1")

    def test_failed_feed_without_previous_gets_empty_items(self):
        fresh = [{"id": "new-src", "name": "测试源", "url": "u", "ok": False, "fetched_at": "t1", "items": []}]
        merged = merge_with_previous(None, fresh)
        self.assertEqual(merged[0]["items"], [])
        self.assertIsNone(merged[0]["fetched_at"])

    def test_previous_none(self):
        fresh = [{"id": "a", "name": "测试源", "url": "u", "ok": True, "fetched_at": "t1", "items": [{"title": "x"}]}]
        merged = merge_with_previous(None, fresh)
        self.assertEqual(merged[0]["items"], [{"title": "x"}])

    def test_mixed_sources_independent(self):
        """部分成功部分失败：成功源用新数据，失败源沿用旧数据，互不影响。"""
        previous = {"feeds": [
            {"id": "a", "items": [{"title": "A旧"}], "fetched_at": "t0"},
            {"id": "b", "items": [{"title": "B旧"}], "fetched_at": "t0"},
        ]}
        fresh = [
            {"id": "a", "name": "测试源", "url": "u", "ok": True, "fetched_at": "t1", "items": [{"title": "A新"}]},
            {"id": "b", "name": "测试源", "url": "u", "ok": False, "fetched_at": "t1", "items": []},
        ]
        merged = merge_with_previous(previous, fresh)
        self.assertEqual(merged[0]["items"], [{"title": "A新"}])
        self.assertEqual(merged[1]["items"], [{"title": "B旧"}])


if __name__ == "__main__":
    unittest.main()
