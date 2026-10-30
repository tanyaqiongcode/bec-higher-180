#!/usr/bin/env python3
"""经 GitHub REST API 创建仓库并推送本目录全部文件（本机 github.com 被墙，api.github.com 可用）。
流程：create repo → blobs → tree → commit → create ref main → patch repo → enable Pages。"""
import base64
import json
import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPO = "bec-higher-180"
OWNER = "tanyaqiongcode"
DESC = "BEC 高级 180 突围营 · C1 Business Higher：听力 158→175+，真题精听+商务播客+每日打卡"
HOME = f"https://{OWNER}.github.io/{REPO}/"

SKIP_DIRS = {".git", ".DS_Store"}
TEXT_SUFFIXES = {".html", ".css", ".js", ".py", ".json", ".md", ".yml", ".txt"}


def api(method, path, token, payload=None, raw=False):
    url = f"https://api.github.com{path}"
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("User-Agent", "bec180-push/1.0")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read()
            return resp.status, (json.loads(body) if body and not raw else body)
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


def collect_files():
    out = []
    for p in sorted(ROOT.rglob("*")):
        rel = p.relative_to(ROOT)
        if any(part in SKIP_DIRS for part in rel.parts) or p.name in SKIP_DIRS:
            continue
        if p.is_file() and (p.suffix in TEXT_SUFFIXES or p.name == "LICENSE"):
            out.append((str(rel), p.read_text(encoding="utf-8")))
    return out


def main():
    token = os.popen("gh auth token").read().strip()
    if not token:
        sys.exit("no gh token")
    files = collect_files()
    print(f"{len(files)} files to push:")
    for f, _ in files:
        print("  -", f)

    # 1. create repo (idempotent-ish: ignore 422 already exists)
    st, body = api("POST", "/user/repos", token, {
        "name": REPO, "description": DESC, "homepage": HOME,
        "private": False, "auto_init": False, "has_issues": True,
    })
    if st in (201, 422):
        print(f"repo: {st} ({'created' if st == 201 else 'already exists'})")
    else:
        sys.exit(f"create repo failed: {st} {body}")

    # 1.5 seed commit if repo is empty (Git Data API requires ≥1 commit)
    st, commits = api("GET", f"/repos/{OWNER}/{REPO}/commits?per_page=1", token)
    parent_sha = None
    if st == 409 or (st == 200 and not commits):
        seed = Path(ROOT / "README.md").read_text(encoding="utf-8")
        st, b = api("PUT", f"/repos/{OWNER}/{REPO}/contents/README.md", token, {
            "message": "chore: seed commit",
            "content": base64.b64encode(seed.encode("utf-8")).decode(),
        })
        if st not in (201, 200):
            sys.exit(f"seed commit failed: {st} {b}")
        print("seed commit via Contents API ok")
    st, ref = api("GET", f"/repos/{OWNER}/{REPO}/git/ref/heads/main", token)
    if st == 200:
        parent_sha = ref["object"]["sha"]
        print(f"parent commit: {parent_sha[:10]}")

    # 2. blobs
    tree = []
    for path, text in files:
        st, b = api("POST", f"/repos/{OWNER}/{REPO}/git/blobs", token, {
            "content": base64.b64encode(text.encode("utf-8")).decode(),
            "encoding": "base64",
        })
        if st != 201:
            sys.exit(f"blob failed {path}: {st} {b}")
        tree.append({"path": path, "mode": "100644", "type": "blob", "sha": b["sha"]})
        print(f"blob ok: {path}")

    # 3. tree
    tree_payload = {"tree": tree}
    if parent_sha:
        st, pc = api("GET", f"/repos/{OWNER}/{REPO}/git/commits/{parent_sha}", token)
        tree_payload["base_tree"] = pc["tree"]["sha"]
    st, t = api("POST", f"/repos/{OWNER}/{REPO}/git/trees", token, tree_payload)
    if st != 201:
        sys.exit(f"tree failed: {st} {t}")
    print(f"tree ok: {t['sha'][:10]}")

    # 4. commit
    commit_payload = {
        "message": "feat: BEC 高级 180 突围营 · 听力突围站首推",
        "tree": t["sha"],
        "author": {"name": OWNER, "email": f"{OWNER}@users.noreply.github.com"},
    }
    if parent_sha:
        commit_payload["parents"] = [parent_sha]
    st, c = api("POST", f"/repos/{OWNER}/{REPO}/git/commits", token, commit_payload)
    if st != 201:
        sys.exit(f"commit failed: {st} {c}")
    print(f"commit ok: {c['sha'][:10]}")

    # 5. update branch main (fast-forward from seed)
    st, r = api("PATCH", f"/repos/{OWNER}/{REPO}/git/refs/heads/main", token, {
        "sha": c["sha"], "force": False,
    })
    if st == 200:
        print("ref main updated")
    else:
        print(f"ref update: {st} {r} — trying create")
        st, r = api("POST", f"/repos/{OWNER}/{REPO}/git/refs", token, {"ref": "refs/heads/main", "sha": c["sha"]})
        print(f"ref created: {st}")

    # 6. patch repo metadata
    api("PATCH", f"/repos/{OWNER}/{REPO}", token, {"description": DESC, "homepage": HOME})
    print("repo metadata ok")

    # 7. enable Pages
    st, p = api("POST", f"/repos/{OWNER}/{REPO}/pages", token, {
        "source": {"branch": "main", "path": "/"}
    })
    print(f"pages: {st} ({'enabled' if st in (201, 204) else p.get('message', '')})")

    print(f"\nDone → {HOME}")


if __name__ == "__main__":
    main()
