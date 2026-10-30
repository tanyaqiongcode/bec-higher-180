/* BEC 高级 180 突围营 · main.js
   导航 / 滚动动效 / 倒计时 / 数字滚动 / 打卡 / 听力分数换算器 / 动态渲染 */
(function () {
  "use strict";

  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  /* ---------- Nav ---------- */
  var burger = $(".nav__burger");
  if (burger) {
    burger.addEventListener("click", function () {
      var links = $(".nav__links");
      links.classList.toggle("open");
      burger.classList.toggle("open");
    });
  }
  var here = location.pathname.split("/").pop() || "index.html";
  $$(".nav__links a").forEach(function (a) {
    if (a.getAttribute("href") === here) a.classList.add("active");
  });

  /* ---------- Reveal on scroll ---------- */
  var reveals = $$(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Score bars ---------- */
  var bars = $$(".sbar__fill");
  if (bars.length && "IntersectionObserver" in window) {
    var bio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var el = e.target;
          el.style.width = Math.max(0, Math.min(100, parseFloat(el.dataset.w || "0"))) + "%";
          bio.unobserve(el);
        }
      });
    }, { threshold: 0.4 });
    bars.forEach(function (el) { bio.observe(el); });
  } else {
    bars.forEach(function (el) { el.style.width = Math.min(100, parseFloat(el.dataset.w || "0")) + "%"; });
  }

  /* ---------- Count-up numbers ---------- */
  function countUp(el) {
    var target = parseFloat(el.dataset.count || "0");
    var dec = (el.dataset.dec ? parseInt(el.dataset.dec, 10) : 0);
    var dur = 1100, t0 = null;
    function tick(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(dec);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  var counters = $$("[data-count]");
  if (counters.length && "IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(countUp);
  }

  /* ---------- Countdown ---------- */
  var cd = $("[data-countdown]");
  if (cd) {
    var target = new Date(cd.dataset.countdown + "T09:00:00+08:00").getTime();
    var cells = {
      d: $("[data-cd='d']", cd), h: $("[data-cd='h']", cd),
      m: $("[data-cd='m']", cd), s: $("[data-cd='s']", cd)
    };
    function pad(n) { return String(n).padStart(2, "0"); }
    function renderCd() {
      var diff = target - Date.now();
      if (diff < 0) diff = 0;
      var d = Math.floor(diff / 864e5),
          h = Math.floor(diff % 864e5 / 36e5),
          m = Math.floor(diff % 36e5 / 6e4),
          s = Math.floor(diff % 6e4 / 1e3);
      if (cells.d) cells.d.textContent = pad(d);
      if (cells.h) cells.h.textContent = pad(h);
      if (cells.m) cells.m.textContent = pad(m);
      if (cells.s) cells.s.textContent = pad(s);
    }
    renderCd();
    setInterval(renderCd, 1000);
  }

  /* ---------- Daily check-in (localStorage) ---------- */
  var CK = "bec180-checkin";
  var box = $("[data-checkin]");
  if (box) {
    var today = new Date();
    var iso = function (d) { return d.toISOString().slice(0, 10); };
    var load = function () { try { return JSON.parse(localStorage.getItem(CK)) || {}; } catch (e) { return {}; } };
    var save = function (o) { localStorage.setItem(CK, JSON.stringify(o)); };

    var daysEl = $("[data-checkin-days]", box);
    var streakEl = $("[data-checkin-streak]", box);
    var btn = $("[data-checkin-btn]", box);

    function last14() {
      var out = [];
      for (var i = 13; i >= 0; i--) {
        var d = new Date(today); d.setDate(d.getDate() - i);
        out.push(d);
      }
      return out;
    }
    function streakOf(log) {
      var n = 0, d = new Date(today);
      if (!log[iso(d)]) d.setDate(d.getDate() - 1); // 今天未打卡时，从昨天数
      while (log[iso(d)]) { n++; d.setDate(d.getDate() - 1); }
      return n;
    }
    function render() {
      var log = load();
      daysEl.innerHTML = "";
      last14().forEach(function (d) {
        var key = iso(d);
        var el = document.createElement("span");
        el.className = "cday" + (log[key] ? " on" : "") + (i0(key) ? " today" : "");
        el.textContent = String(d.getDate());
        el.title = key + (log[key] ? " · 已打卡" : "");
        daysEl.appendChild(el);
      });
      streakEl.textContent = String(streakOf(load()));
    }
    function i0(key) { return key === iso(today); }

    if (btn) {
      btn.addEventListener("click", function () {
        var log = load();
        log[iso(today)] = true;
        save(log);
        btn.textContent = "今日已打卡 ✓";
        btn.disabled = true;
        btn.classList.add("on");
        render();
      });
      (function init() {
        var log = load();
        if (log[iso(today)]) {
          btn.textContent = "今日已打卡 ✓";
          btn.disabled = true;
          btn.classList.add("on");
        }
      })();
    }
    render();
  }

  /* ---------- Listening raw → Cambridge scale converter ----------
     官方锚点（Cambridge 官方换算表）：12/30≈160, 17/30≈170, 21/30≈180, 25/30≈190
     分段线性插值；仅供估算，正式以当次考试为准。 */
  var conv = $("[data-convert]");
  if (conv) {
    var anchors = [[0, 118], [12, 160], [17, 170], [21, 180], [25, 190], [30, 205]];
    var inp = $("[data-convert-in]", conv);
    var out = $("[data-convert-out]", conv);
    var note = $("[data-convert-note]", conv);
    function scale(raw) {
      raw = Math.max(0, Math.min(30, raw));
      for (var i = 0; i < anchors.length - 1; i++) {
        var a = anchors[i], b = anchors[i + 1];
        if (raw >= a[0] && raw <= b[0]) {
          return Math.round(a[1] + (b[1] - a[1]) * (raw - a[0]) / (b[0] - a[0]));
        }
      }
      return 205;
    }
    function gradeOf(s) {
      if (s >= 200) return "Grade A · C2 证书";
      if (s >= 193) return "Grade B · C1 证书";
      if (s >= 180) return "Grade C · C1 证书 ✅";
      if (s >= 160) return "Level B2 · B2 证书";
      return "低于报告线";
    }
    function renderConv() {
      var raw = parseInt(inp.value, 10);
      if (isNaN(raw)) { out.textContent = "—"; note.textContent = "输入 0–30 的做对题数"; return; }
      var s = scale(raw);
      out.textContent = String(s);
      note.textContent = "约等于 " + gradeOf(s) + "（官方锚点：12→160 · 17→170 · 21→180 · 25→190）";
    }
    inp.addEventListener("input", renderConv);
    renderConv();
  }

  /* ---------- Feeds (data/latest.json) ---------- */
  var feedHost = $("[data-feeds]");
  if (feedHost) {
    fetch("data/latest.json", { cache: "no-cache" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var tpl = $("[data-feed-tpl]", feedHost);
        var grid = $("[data-feed-grid]", feedHost);
        if (!grid) return;
        var stamps = $$("[data-feed-updated]");
        stamps.forEach(function (el) {
          el.textContent = data.updated ? "更新于 " + new Date(data.updated).toLocaleDateString("zh-CN") : "";
        });
        grid.innerHTML = "";
        (data.feeds || []).forEach(function (f) {
          var node = tpl.content.firstElementChild.cloneNode(true);
          $("[data-feed-name]", node).textContent = f.name;
          $("[data-feed-link]", node).href = f.url;
          var list = $("[data-feed-list]", node);
          list.innerHTML = "";
          (f.items || []).forEach(function (it) {
            var li = document.createElement("li");
            var a = document.createElement("a");
            a.href = it.link || it.audio || "#";
            a.target = "_blank"; a.rel = "noopener";
            a.textContent = it.title;
            var dt = document.createElement("span");
            dt.className = "dt";
            dt.textContent = it.date ? fmtDate(it.date) : "";
            li.appendChild(a); li.appendChild(dt);
            list.appendChild(li);
          });
          if (!f.items || !f.items.length) {
            list.innerHTML = "<li><span class='dt'>首次抓取将在 GitHub Actions 每日运行后出现</span></li>";
          }
          var au = $("[data-feed-audio] source", node);
          if (au) {
            var firstAudio = (f.items || []).find(function (it) { return it.audio; });
            if (firstAudio) {
              au.src = firstAudio.audio;
              $("[data-feed-audio] audio", node).load();
            } else {
              var box2 = $("[data-feed-audio]", node);
              if (box2) box2.remove();
            }
          }
          grid.appendChild(node);
        });
      })
      .catch(function () { /* 静默：页面静态内容仍然可用 */ });
  }
  function fmtDate(s) {
    var d = new Date(s);
    return isNaN(d) ? s.slice(0, 10) : (d.getMonth() + 1) + "/" + d.getDate();
  }

  /* ---------- Footer year ---------- */
  $$("[data-year]").forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
})();
