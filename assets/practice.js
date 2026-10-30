/* BEC 高级 180 突围营 · practice.js
   精听工作台：从每日动态选素材 → 变速/回退/AB 循环播放 → 四步法清单 → 笔记与时长留存 */
(function () {
  "use strict";

  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  var LS_MIN = "bec180-listen";   // { "2026-10-31": minutes }
  var LS_STEPS = "bec180-steps";  // { "<audioUrl>": [bool,bool,bool,bool] }
  var LS_NOTES = "bec180-notes";  // { "<audioUrl>": text }

  var wb = $("[data-workbench]");
  if (!wb) return;

  var audio = $("audio", wb);
  var titleEl = $("[data-wb-title]", wb);
  var srcSel = $("[data-wb-src]", wb);
  var timerEl = $("[data-wb-timer]", wb);
  var totalEl = $("[data-wb-total]", wb);
  var noteEl = $("[data-wb-note]", wb);
  var saveBtn = $("[data-wb-save]", wb);
  var statusEl = $("[data-wb-status]", wb);
  var stepEls = $$("[data-step]", wb);

  var todayIso = new Date().toISOString().slice(0, 10);
  var current = { audio: "", title: "", steps: [false, false, false, false] };

  function jget(k, fb) { try { return JSON.parse(localStorage.getItem(k)) || fb; } catch (e) { return fb; } }
  function jset(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

  /* ---------- session timer ---------- */
  var secToday = (jget(LS_MIN, {})[todayIso] || 0) * 60;
  function paintTime() {
    var m = Math.floor(secToday / 60), s = Math.floor(secToday % 60);
    if (timerEl) timerEl.textContent = m + ":" + String(s).padStart(2, "0");
    if (totalEl) {
      var log = jget(LS_MIN, {});
      var tot = 0;
      Object.keys(log).forEach(function (k) { tot += log[k]; });
      totalEl.textContent = Math.round(tot) + " 分钟";
    }
  }
  audio.addEventListener("timeupdate", function () {
    secToday += 0.25;
    paintTime();
  });
  setInterval(function () {
    var log = jget(LS_MIN, {});
    log[todayIso] = Math.round(secToday / 60 * 10) / 10;
    jset(LS_MIN, log);
    paintTime();
  }, 3000);
  window.addEventListener("beforeunload", function () {
    var log = jget(LS_MIN, {});
    log[todayIso] = Math.round(secToday / 60 * 10) / 10;
    jset(LS_MIN, log);
  });
  paintTime();

  /* ---------- controls ---------- */
  var speedSel = $("[data-wb-speed]", wb);

  /* ---------- source picker ---------- */
  fetch("data/latest.json", { cache: "no-cache" })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      srcSel.innerHTML = "";
      var n = 0;
      (data.feeds || []).forEach(function (f) {
        (f.items || []).forEach(function (it) {
          if (!it.audio) return;
          var opt = document.createElement("option");
          opt.value = it.audio;
          opt.textContent = "「" + f.name + "」" + it.title.slice(0, 42);
          opt.dataset.title = it.title;
          opt.dataset.date = it.date || "";
          srcSel.appendChild(opt);
          n++;
        });
      });
      if (!n) {
        var opt = document.createElement("option");
        opt.value = ""; opt.textContent = "动态抓取后即可选择素材（也可粘贴任意音频链接）";
        srcSel.appendChild(opt);
      }
    })
    .catch(function () {});

  function loadSrc(url, title) {
    if (!url) return;
    current.audio = url; current.title = title || url;
    audio.src = url;
    audio.playbackRate = parseFloat(speedSel.value);
    titleEl.textContent = current.title;
    current.steps = jget(LS_STEPS, {})[url] || [false, false, false, false];
    paintSteps();
    if (noteEl) noteEl.value = jget(LS_NOTES, {})[url] || "";
  }

  srcSel.addEventListener("change", function () {
    var opt = srcSel.selectedOptions[0];
    loadSrc(opt.value, opt.dataset.title || opt.textContent);
  });

  /* custom URL */
  var urlBtn = $("[data-wb-loadurl]", wb);
  var urlInp = $("[data-wb-url]", wb);
  if (urlBtn) {
    urlBtn.addEventListener("click", function () {
      var u = (urlInp.value || "").trim();
      if (u) loadSrc(u, "自定义音频");
    });
  }

  /* ---------- controls ---------- */
  speedSel.addEventListener("change", function () {
    audio.playbackRate = parseFloat(speedSel.value);
  });
  $("[data-wb-back]", wb).addEventListener("click", function () { audio.currentTime = Math.max(0, audio.currentTime - 5); });
  $("[data-wb-fwd]", wb).addEventListener("click", function () { audio.currentTime = audio.currentTime + 5; });
  $("[data-wb-replay]", wb).addEventListener("click", function () { audio.currentTime = Math.max(0, audio.currentTime - 10); audio.play(); });
  $("[data-wb-pause]", wb).addEventListener("click", function () { audio.paused ? audio.play() : audio.pause(); });

  /* A-B loop */
  var loopA = null, loopB = null, loopOn = false;
  var loopBtn = $("[data-wb-loop]", wb);
  loopBtn.addEventListener("click", function () {
    if (!loopOn) {
      loopA = audio.currentTime;
      loopBtn.textContent = "A 已设 " + fmt(loopA) + " → 再点设 B";
      loopOn = "A";
    } else if (loopOn === "A") {
      loopB = audio.currentTime;
      if (loopB - loopA < 2) { loopB = loopA + 5; }
      loopBtn.textContent = "循环中 " + fmt(loopA) + "–" + fmt(loopB) + "（点击取消）";
      loopBtn.classList.add("on");
      loopOn = "AB";
    } else {
      loopA = loopB = null; loopOn = false;
      loopBtn.textContent = "A-B 循环";
      loopBtn.classList.remove("on");
    }
  });
  audio.addEventListener("timeupdate", function () {
    if (loopOn === "AB" && loopA !== null && loopB !== null && audio.currentTime >= loopB) {
      audio.currentTime = loopA;
    }
  });
  function fmt(t) {
    t = Math.max(0, Math.floor(t || 0));
    return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0");
  }

  /* ---------- four-step checklist ---------- */
  function paintSteps() {
    stepEls.forEach(function (el, i) {
      el.checked = !!current.steps[i];
    });
  }
  stepEls.forEach(function (el, i) {
    el.addEventListener("change", function () {
      current.steps[i] = el.checked;
      var all = jget(LS_STEPS, {});
      all[current.audio] = current.steps;
      jset(LS_STEPS, all);
      if (current.steps.every(Boolean)) {
        statusEl.textContent = "本条素材四步全部完成 ✅";
      } else {
        statusEl.textContent = "";
      }
    });
  });

  /* ---------- notes ---------- */
  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      if (!current.audio) return;
      var all = jget(LS_NOTES, {});
      all[current.audio] = noteEl.value;
      jset(LS_NOTES, all);
      saveBtn.textContent = "已保存 ✓";
      setTimeout(function () { saveBtn.textContent = "保存笔记"; }, 1600);
    });
  }

  /* ---------- init: preselect first item ---------- */
  srcSel.selectedIndex = 0;
})();
