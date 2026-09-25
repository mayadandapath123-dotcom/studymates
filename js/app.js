/* StudyMates MVP bootstrap: wires timer, behavior, audio, stats and UI. */
import { $, $$, fmtClock, fmtDur, todayKey, last7Keys, dayLabel, toast, prefersReducedMotion, timeOfDayForHour, choice } from "./utils.js";
import { CHARACTERS, getChar, applyCharacter } from "./characters.js";
import { BehaviorEngine } from "./behavior.js";
import { TimerEngine, SessionManager } from "./timer.js";
import { AudioEngine } from "./audio.js";
import { createStage } from "./stage3d.js";
import { settings, stats } from "./store.js";

/* ---------- engines ---------- */
const audio = new AudioEngine();
audio.unlock();
let stage = null;
try {
  stage = createStage({ room: document.querySelector("#room"), bubble: document.querySelector("#bubble"), zzz: document.querySelector("#zzz"), notes: document.querySelector("#musicNotes") });
} catch (err) {
  console.warn("3D stage unavailable:", err);
  const nogl = document.querySelector("#nogl");
  if (nogl) nogl.hidden = false;
}
const isReduced = () => settings.get("reduce") === "on" || (settings.get("reduce") === "auto" && prefersReducedMotion());
const behavior = new BehaviorEngine({
  getCharId: () => settings.get("char"),
  getFreq: () => settings.get("freq"),
  isReduced,
  sfx: (n) => audio.sfx(n),
  onMood: (t) => { const m = $("#moodLine"); if (m) m.textContent = t; },
  view: stage,
});
const engine = new TimerEngine();

/* ---------- render ---------- */
const els = {};
function cacheEls() {
  ["room", "moodLine", "hudMode", "hudTime", "timeBadge", "sessLabel", "timeDisplay", "progressFill", "cycleDots",
    "presetRow", "customMin", "btnCustom", "btnStart", "btnPause", "btnReset", "btnSkip", "pomoToggle", "pomoDesc",
    "doneBanner", "doneTitle", "doneSub", "continueCount", "btnDoneNext", "btnDoneStay", "goalFill", "goalText",
    "goalPct", "goalSelect", "todayTime", "todaySess", "todayStreak", "streakNum", "buddyName", "tipText",
    "qRain", "qBirds", "qTones", "qMute", "btnSound"
  ].forEach((id) => { els[id] = document.getElementById(id); });
  els.dock = document.querySelector(".timer-dock");
  els.modeTabs = $$(".mode-tabs button");
}
let startLabel;
function prepStartBtn() {
  [...els.btnStart.childNodes].forEach((n) => { if (n.nodeType === 3) n.remove(); });
  startLabel = document.createElement("span");
  startLabel.textContent = "Start";
  els.btnStart.appendChild(startLabel);
}

function render() {
  const s = settings.data;
  const st = sm.step();
  const running = engine.running;
  const time = fmtClock(engine.rem);
  els.timeDisplay.textContent = time;
  els.hudTime.textContent = time;
  const lbl = sm.label();
  els.hudMode.textContent = lbl;
  els.sessLabel.textContent = running ? `${lbl} · in session` : sm.started ? `${lbl} · paused` : `Ready · ${lbl}`;
  document.title = running ? `(${time}) StudyMates` : "StudyMates — Study with a buddy who has a life too";
  els.progressFill.style.width = `${Math.round(engine.progress * 100)}%`;
  els.dock.classList.toggle("break-mode", st.type !== "focus");
  // dots
  els.cycleDots.innerHTML = sm.queue.map((q, i) =>
    `<i class="${i < sm.idx ? "done" : i === sm.idx ? "now" : ""}" title="${q.type}"></i>`).join("");
  // tabs
  els.modeTabs.forEach((b) => {
    const on = b.dataset.mode === (s.pomo ? st.type : sm.mode);
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
  });
  // presets
  $$("#presetRow [data-min]").forEach((b) => b.classList.toggle("active", +b.dataset.min === s.focusMin));
  // pomo
  els.pomoToggle.checked = s.pomo;
  els.pomoDesc.textContent = `${s.cycles} focus · ${s.shortMin}m breaks · ${s.longMin}m long`;
  // buttons
  els.btnStart.disabled = running;
  startLabel.textContent = !running && sm.started ? "Resume" : "Start";
  els.btnPause.disabled = !running;
  els.btnSkip.disabled = !running && !sm.started;
  // goal
  const goalSec = s.goalMin * 60, tSec = stats.todaySec();
  const pct = goalSec ? Math.min(100, Math.round((tSec / goalSec) * 100)) : 0;
  els.goalFill.style.width = `${pct}%`;
  els.goalPct.textContent = `${pct}%`;
  els.goalText.textContent = `${fmtDur(tSec)} / ${fmtDur(goalSec)}`;
  if (els.goalSelect.value !== String(s.goalMin)) els.goalSelect.value = String(s.goalMin);
  // today + streak
  els.todayTime.textContent = fmtDur(tSec);
  els.todaySess.textContent = stats.data.completed;
  els.todayStreak.textContent = stats.data.streak;
  els.streakNum.textContent = stats.data.streak;
  // sound buttons
  const setQ = (el, on) => el?.setAttribute("aria-pressed", on ? "true" : "false");
  setQ(els.qRain, s.rain); setQ(els.qBirds, s.birds); setQ(els.qTones, s.tones);
  els.qMute.textContent = s.muted ? "Unmute" : "Mute all";
  els.btnSound.setAttribute("aria-pressed", s.muted ? "true" : "false");
  els.btnSound.setAttribute("aria-label", s.muted ? "Unmute all sound" : "Mute all sound");
}

function onBanner(show, info, count) {
  els.doneBanner.hidden = !show;
  if (info) {
    els.doneTitle.textContent = info.title;
    els.doneSub.textContent = info.sub;
    els.btnDoneNext.textContent = info.nextLabel;
  }
  els.continueCount.textContent = count != null ? `auto-start in ${Math.ceil(count)}s…` : "";
}

const sm = new SessionManager(engine, {
  getSettings: () => settings.data,
  stats: {
    sessionStart: () => stats.sessionStart(),
    sessionComplete: () => stats.sessionComplete(),
    breakComplete: () => stats.breakComplete(),
    addFocus: (sec) => stats.addFocus(sec, settings.get("goalMin") * 60),
  },
  behavior, audio, render, onBanner,
});

/* ---------- time of day + clock ---------- */
function applyTime() {
  const mode = settings.get("time");
  const t = mode === "auto" ? timeOfDayForHour(new Date().getHours()) : mode;
  els.room.dataset.time = t;
  stage?.setTimeOfDay(t);
  els.timeBadge.textContent = t[0].toUpperCase() + t.slice(1) + (mode === "auto" ? " · auto" : "");
}
function applyReduced() { els.room.dataset.reduced = isReduced() ? "true" : "false"; stage?.setReduced(isReduced()); }

/* ---------- modals ---------- */
function openModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.hidden = false;
  m.querySelector("[data-close]")?.focus();
}
function closeModals() { $$(".modal").forEach((m) => { m.hidden = true; }); }

function buildCharCards() {
  const box = $("#charCards");
  box.innerHTML = "";
  Object.values(CHARACTERS).forEach((c) => {
    const el = document.createElement("article");
    el.className = "char-card"; el.dataset.char = c.id;
    el.innerHTML = `<img src="${c.concept}" alt="Concept art of ${c.name}" loading="lazy">
      <h3>${c.name}</h3><div class="tag">${c.tag}</div><p>${c.desc}</p>
      <div class="traits">${c.traits.map((t) => `<span>${t}</span>`).join("")}</div>
      <button class="btn soft small">Study with ${c.name}</button>`;
    el.querySelector("button").addEventListener("click", () => selectChar(c.id));
    box.appendChild(el);
  });
  applyCharacter(settings.get("char"));
}
function selectChar(id) {
  settings.set({ char: id });
  applyCharacter(id);
  stage?.setCharacter(id);
  behavior.greetChar();
}

function renderStatsModal() {
  $("#stToday").textContent = fmtDur(stats.todaySec());
  $("#stWeek").textContent = fmtDur(stats.weekSec());
  $("#stSessions").textContent = stats.data.completed;
  $("#stStreak").textContent = stats.data.streak;
  $("#stLongest").textContent = stats.data.longest;
  $("#stAvg").textContent = fmtDur(stats.avg());
  const keys = last7Keys();
  const max = Math.max(60, ...keys.map((k) => stats.data.days[k] || 0));
  $("#weekChart").innerHTML = keys.map((k) => {
    const v = stats.data.days[k] || 0;
    const h = Math.max(6, Math.round((v / max) * 88));
    const isToday = k === todayKey();
    return `<div class="week-col" title="${fmtDur(v)}"><div class="week-bar" style="height:${h}px;${isToday ? "background:linear-gradient(#f08a48,#c25f27)" : ""}"></div><small>${isToday ? "Today" : dayLabel(k)}</small></div>`;
  }).join("");
}

function syncSettingsUI() {
  const s = settings.data;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  const chk = (id, v) => { const el = document.getElementById(id); if (el) el.checked = v; };
  set("setChar", s.char); set("setTime", s.time); set("setFreq", s.freq); set("setReduce", s.reduce);
  set("setFocus", s.focusMin); set("setShort", s.shortMin); set("setLong", s.longMin); set("setCycles", s.cycles);
  chk("setPomo", s.pomo); chk("setAuto", s.autoContinue); chk("setNotifs", s.notifs);
  chk("setRain", s.rain); chk("setBirds", s.birds); chk("setTones", s.tones);
  set("volAmbient", s.volA); set("volSfx", s.volS);
}

/* ---------- events ---------- */
function guardIdle() {
  if (engine.running || sm.started) { toast("Reset the timer first to change this."); return false; }
  return true;
}
function wire() {
  els.btnStart.addEventListener("click", () => sm.start());
  els.btnPause.addEventListener("click", () => sm.pause());
  els.btnReset.addEventListener("click", () => sm.reset());
  els.btnSkip.addEventListener("click", () => sm.skip());
  els.btnDoneNext.addEventListener("click", () => sm.continueNext());
  els.btnDoneStay.addEventListener("click", () => sm.stayHere());
  els.modeTabs.forEach((b) => b.addEventListener("click", () => sm.setMode(b.dataset.mode)));
  els.pomoToggle.addEventListener("change", (e) => {
    if (!guardIdle()) { e.target.checked = settings.get("pomo"); return; }
    settings.set({ pomo: e.target.checked });
    sm.rebuild();
  });
  $$("#presetRow [data-min]").forEach((b) => b.addEventListener("click", () => {
    if (!guardIdle()) return;
    settings.set({ focusMin: +b.dataset.min });
    els.customMin.value = b.dataset.min;
    sm.rebuild();
  }));
  els.btnCustom.addEventListener("click", () => {
    if (!guardIdle()) return;
    const v = Math.max(1, Math.min(180, Math.round(+els.customMin.value || 25)));
    els.customMin.value = v;
    settings.set({ focusMin: v });
    sm.rebuild();
  });
  els.goalSelect.addEventListener("change", (e) => { settings.set({ goalMin: +e.target.value }); render(); });

  // sounds
  const flip = (key, fn) => { settings.set({ [key]: !settings.get(key) }); audio.ensure(); fn(settings.get(key)); render(); };
  els.qRain.addEventListener("click", () => flip("rain", (v) => { audio.setRain(v); stage?.setRain(v); }));
  els.qBirds.addEventListener("click", () => flip("birds", (v) => audio.setBirds(v)));
  els.qTones.addEventListener("click", () => flip("tones", (v) => audio.setTones(v)));
  const muteFlip = () => { settings.set({ muted: !settings.get("muted") }); audio.setMuted(settings.get("muted")); render(); };
  els.qMute.addEventListener("click", muteFlip);
  els.btnSound.addEventListener("click", muteFlip);

  // header + hero + buddy
  $("#btnChars").addEventListener("click", () => openModal("modalChars"));
  $("#btnHeroChars").addEventListener("click", () => openModal("modalChars"));
  $("#btnBuddyChange").addEventListener("click", () => openModal("modalChars"));
  $("#btnStats").addEventListener("click", () => { renderStatsModal(); openModal("modalStats"); });
  $("#btnMoreStats").addEventListener("click", () => { renderStatsModal(); openModal("modalStats"); });
  $("#btnSettings").addEventListener("click", () => { syncSettingsUI(); openModal("modalSettings"); });
  $("#btnHeroStart").addEventListener("click", () => { $("#roomCard").scrollIntoView({ behavior: isReduced() ? "auto" : "smooth", block: "center" }); sm.start(); });
  $("#btnHeroHide").addEventListener("click", () => { settings.set({ heroHidden: true }); document.body.classList.add("hero-hidden"); });
  $("#btnBoop").addEventListener("click", () => behavior.boop());
  $("#btnPrivacy").addEventListener("click", () => { syncSettingsUI(); openModal("modalSettings"); toast("Privacy: everything stays in your browser. No account, no tracking."); });

  // modal close
  $$(".modal").forEach((m) => {
    m.addEventListener("click", (e) => { if (e.target === m) m.hidden = true; });
    m.querySelector("[data-close]")?.addEventListener("click", () => { m.hidden = true; });
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModals();
    const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName || "");
    if (typing) return;
    if (e.code === "Space" && !e.target.closest("button")) { e.preventDefault(); engine.running ? sm.pause() : sm.start(); }
    else if (e.key === "m" || e.key === "M") muteFlip();
  });

  // settings controls
  const S = (id, ev, fn) => document.getElementById(id)?.addEventListener(ev, fn);
  S("setChar", "change", (e) => selectChar(e.target.value));
  S("setTime", "change", (e) => { settings.set({ time: e.target.value }); applyTime(); });
  S("setFreq", "change", (e) => settings.set({ freq: e.target.value }));
  S("setReduce", "change", (e) => { settings.set({ reduce: e.target.value }); applyReduced(); });
  const needIdle = (fn) => (e) => { if (!guardIdle()) { syncSettingsUI(); return; } fn(e); };
  S("setFocus", "change", needIdle((e) => { settings.set({ focusMin: +e.target.value }); sm.rebuild(); }));
  S("setShort", "change", needIdle((e) => { settings.set({ shortMin: +e.target.value }); sm.rebuild(); }));
  S("setLong", "change", needIdle((e) => { settings.set({ longMin: +e.target.value }); sm.rebuild(); }));
  S("setCycles", "change", needIdle((e) => { settings.set({ cycles: +e.target.value }); sm.rebuild(); }));
  S("setPomo", "change", needIdle((e) => { settings.set({ pomo: e.target.checked }); sm.rebuild(); }));
  S("setAuto", "change", (e) => settings.set({ autoContinue: e.target.checked }));
  S("setNotifs", "change", async (e) => {
    const on = e.target.checked;
    if (on && "Notification" in window && Notification.permission === "default") {
      try { await Notification.requestPermission(); } catch {}
    }
    if (on && "Notification" in window && Notification.permission === "denied") {
      toast("Browser notifications are blocked. Enable them in your browser settings.");
      e.target.checked = false; settings.set({ notifs: false }); return;
    }
    settings.set({ notifs: on });
  });
  S("setRain", "change", (e) => { settings.set({ rain: e.target.checked }); audio.ensure(); audio.setRain(e.target.checked); stage?.setRain(e.target.checked); render(); });
  S("setBirds", "change", (e) => { settings.set({ birds: e.target.checked }); audio.ensure(); audio.setBirds(e.target.checked); render(); });
  S("setTones", "change", (e) => { settings.set({ tones: e.target.checked }); audio.ensure(); audio.setTones(e.target.checked); render(); });
  S("volAmbient", "input", (e) => { settings.set({ volA: +e.target.value }); audio.setVolA(+e.target.value / 100); });
  S("volSfx", "input", (e) => { settings.set({ volS: +e.target.value }); audio.setVolS(+e.target.value / 100); });
  S("btnExport", "click", () => {
    const blob = new Blob([JSON.stringify({ app: "StudyMates", exportedAt: new Date().toISOString(), settings: settings.data, stats: stats.data }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "studymates-data.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  S("btnWipe", "click", () => {
    if (!confirm("Erase all StudyMates data on this device? Your buddy will forget everything.")) return;
    localStorage.removeItem("studymates.settings.v1");
    localStorage.removeItem("studymates.stats.v1");
    location.reload();
  });

  // NOTE: settings save on every change already, so unload only banks stats.
  window.addEventListener("beforeunload", () => { try { sm._flushFocus(); stats.save(); } catch {} });
}

/* ---------- tips ---------- */
const TIPS = [
  "Put your phone face-down before you press Start.",
  "Tiny sessions count. Fifteen focused minutes beats zero.",
  "Sip water every break — your buddy does.",
  "If you get stuck, explain the problem out loud to your buddy.",
  "Stretch your neck and shoulders between sessions.",
  "One chapter at a time. Your buddy believes in you.",
  "End each session by writing down the next tiny step.",
];
function rotateTips() {
  let i = 0;
  setInterval(() => { i = (i + 1) % TIPS.length; if (els.tipText) els.tipText.textContent = TIPS[i]; }, 25000);
}

/* ---------- boot ---------- */
function boot() {
  cacheEls();
  prepStartBtn();
  if (settings.get("heroHidden")) document.body.classList.add("hero-hidden");
  applyCharacter(settings.get("char"));
  stage?.setCharacter(settings.get("char"));
  stage?.setRain(settings.get("rain"));
  buildCharCards();
  audio.setMuted(settings.get("muted"));
  audio.setVolA(settings.get("volA") / 100);
  audio.setVolS(settings.get("volS") / 100);
  applyTime(); applyReduced();
  setInterval(() => { if (settings.get("time") === "auto") applyTime(); }, 60000);
  wire();
  sm.rebuild();
  render();
  rotateTips();
  behavior.setPhase("idle");
  setTimeout(() => behavior.bubble(`Hi! I'm ${getChar(settings.get("char")).name}. Press Start when you're ready!`, 4600, true), 1400);
  // apply saved ambience after first user gesture (autoplay-safe)
  const applyAmbient = () => {
    audio.ensure();
    audio.setRain(settings.get("rain"));
    stage?.setRain(settings.get("rain"));
    if (settings.get("birds")) audio.setBirds(true);
    if (settings.get("tones")) audio.setTones(true);
    render();
  };
  window.addEventListener("pointerdown", applyAmbient, { once: true });
  window.addEventListener("keydown", applyAmbient, { once: true });
  // offline support
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
  // debug/testing handle (read-only usage intended)
  window.StudyMates = { sm, engine, behavior, settings, stats, stage };
}
boot();
