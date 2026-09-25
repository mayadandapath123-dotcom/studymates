/* Timer engine (precise, timestamp-based) + session manager (single /
   pomodoro queue, stats hooks, auto-continue, notifications). */
import { toast } from "./utils.js";

export class TimerEngine {
  constructor() {
    this.durMs = 25 * 60 * 1000;
    this.rem = this.durMs;
    this.running = false;
    this.endAt = 0;
    this._t = null;
    this.subs = new Set();
  }
  on(fn) { this.subs.add(fn); return () => this.subs.delete(fn); }
  emit(e) { this.subs.forEach((f) => { try { f(e); } catch {} }); }
  get progress() { return this.durMs ? 1 - this.rem / this.durMs : 0; }
  setDuration(sec) {
    this.pause(true);
    this.durMs = Math.max(1000, sec * 1000);
    this.rem = this.durMs;
    this.emit({ t: "set" });
  }
  start() {
    if (this.running) return;
    if (this.rem <= 0) this.rem = this.durMs;
    this.running = true;
    this.endAt = Date.now() + this.rem;
    clearInterval(this._t);
    this._t = setInterval(() => this._tick(), 250);
    this._tick();
    this.emit({ t: "start" });
  }
  _tick() {
    if (!this.running) return;
    this.rem = Math.max(0, this.endAt - Date.now());
    this.emit({ t: "tick" });
    if (this.rem <= 0) this._finish(false);
  }
  pause(silent = false) {
    if (!this.running) return;
    this.rem = Math.max(0, this.endAt - Date.now());
    this.running = false;
    clearInterval(this._t);
    if (!silent) this.emit({ t: "pause" });
  }
  reset() {
    this.running = false;
    clearInterval(this._t);
    this.rem = this.durMs;
    this.emit({ t: "reset" });
  }
  skip() { if (this.running || this.rem < this.durMs) this._finish(true); }
  _finish(skipped) {
    this.running = false;
    clearInterval(this._t);
    this.rem = 0;
    this.emit({ t: "done", skipped });
  }
}

const MODE_LABEL = { focus: "Focus", short: "Short break", long: "Long break" };

export class SessionManager {
  constructor(engine, deps) {
    this.e = engine;
    this.get = deps.getSettings;      // () => settings
    this.stats = deps.stats;
    this.behavior = deps.behavior;
    this.audio = deps.audio;
    this.render = deps.render || (() => {});
    this.onBanner = deps.onBanner || (() => {});
    this.mode = "focus";
    this.queue = [{ type: "focus", sec: 25 * 60 }];
    this.idx = 0;
    this.started = false;             // current step has begun at least once
    this._awaitingNext = false;       // timer done, banner shown, next step pending
    this.autoTimer = null;
    this.focusAccum = 0;              // seconds banked this step
    this._lastTick = 0;
    this._lastTickSecond = -1;
    engine.on((ev) => this._onEngine(ev));
    // NOTE: boot calls rebuild() after assignment (render() needs `sm`).
  }

  step() { return this.queue[this.idx] || { type: "focus", sec: 25 * 60 }; }
  isBreakStep() { return this.step().type !== "focus"; }

  rebuild() {
    this.cancelAuto();
    this.onBanner(false);
    this._awaitingNext = false;
    const s = this.get();
    if (s.pomo) {
      this.queue = [];
      for (let i = 0; i < s.cycles; i++) {
        this.queue.push({ type: "focus", sec: s.focusMin * 60, n: i + 1 });
        if (i < s.cycles - 1) this.queue.push({ type: "short", sec: s.shortMin * 60 });
        else this.queue.push({ type: "long", sec: s.longMin * 60 });
      }
    } else {
      const sec = this.mode === "focus" ? s.focusMin * 60 : this.mode === "short" ? s.shortMin * 60 : s.longMin * 60;
      this.queue = [{ type: this.mode, sec }];
    }
    this.idx = 0;
    this.started = false;
    this.e.setDuration(this.step().sec);
    this.render();
  }
  setMode(m) {
    if (this.e.running || this.started) { toast("Reset the timer first to switch session type."); return; }
    this.mode = m;
    if (!this.get().pomo) { this.rebuild(); }
    else { // in pomodoro, tabs just preview lengths — jump queue to nearest matching step
      const i = this.queue.findIndex((q) => q.type === (m === "focus" ? "focus" : m));
      this.idx = i >= 0 ? i : 0;
      this.e.setDuration(this.step().sec);
    }
    this.render();
  }

  start() {
    if (this._awaitingNext) return this.continueNext();
    this.cancelAuto();
    this.audio.ensure();
    const st = this.step();
    if (!this.started) {
      this.started = true;
      this.focusAccum = 0;
      this._lastTick = Date.now();
      if (st.type === "focus") { this.stats.sessionStart(); this.behavior.sessionStart(); }
      else this.behavior.breakStart();
    } else {
      this.behavior.resumeBuddy();
      this._lastTick = Date.now();
    }
    this.e.start();
    this.render();
  }
  pause() {
    this.e.pause();
    this.behavior.pauseBuddy();
    this._flushFocus();
    this.render();
  }
  reset() {
    this.cancelAuto();
    this.onBanner(false);
    this._awaitingNext = false;
    this.e.reset();
    this._flushFocus();
    this.started = false;
    this.behavior.resetBuddy();
    this.render();
  }
  skip() { this.cancelAuto(); this.e.skip(); }

  continueNext() {
    this.cancelAuto();
    this.onBanner(false);
    this._awaitingNext = false;
    this.idx++;
    if (this.idx >= this.queue.length) { this.rebuild(); this.behavior.resetBuddy(); return; }
    const st = this.step();
    this.e.setDuration(st.sec);
    this.started = false;
    this.start();
    if (st.type === "focus") this.behavior.breakOver();
  }
  stayHere() {
    this.cancelAuto();
    this.onBanner(false);
    this._awaitingNext = false;
    this.behavior.resetBuddy();
    this.started = false;
    this.e.reset();
    this.render();
    toast("No rush. Press Start whenever you're ready.");
  }

  _onEngine(ev) {
    if (ev.t === "tick") this._onTick();
    else if (ev.t === "done") this._onDone(ev.skipped);
    this.render();
  }
  _onTick() {
    const now = Date.now();
    const st = this.step();
    if (st.type === "focus" && this.e.running) {
      this.focusAccum += (now - this._lastTick) / 1000;
      if (this.focusAccum >= 20) this._flushFocus();
    }
    this._lastTick = now;
    // gentle tick in final 10s
    const sLeft = Math.ceil(this.e.rem / 1000);
    if (sLeft <= 10 && sLeft > 0 && sLeft !== this._lastTickSecond) {
      this._lastTickSecond = sLeft;
      this.audio.sfx("tick");
    }
  }
  _flushFocus() {
    if (this.focusAccum >= 1 && this.step().type === "focus") {
      const reached = this.stats.addFocus(this.focusAccum);
      this.focusAccum = 0;
      if (reached) this.behavior.celebrateGoal();
    } else this.focusAccum = 0;
  }

  _onDone(skipped) {
    const st = this.step();
    this._flushFocus();
    const hasNext = this.idx < this.queue.length - 1;
    if (st.type === "focus") {
      if (!skipped) { this.stats.sessionComplete(); this.audio.sfx("chime"); }
      else this.audio.sfx("chime-soft");
      this.notify(skipped ? "Focus skipped" : "Focus complete!", hasNext ? "Break time — your buddy is stretching." : "Nice session! Take a breather.");
      this.behavior.focusComplete(hasNext);
    } else {
      if (!skipped) { this.stats.breakComplete(); this.audio.sfx("chime"); }
      this.notify("Break over", hasNext ? "Back to focus — your buddy is heading to the desk." : "Hope you feel refreshed!");
      if (hasNext) this.behavior.breakOver(); else this.behavior.windDown();
    }
    this.started = false;
    this._awaitingNext = false;
    if (hasNext) {
      this._awaitingNext = true;
      const next = this.queue[this.idx + 1];
      this.onBanner(true, {
        title: st.type === "focus" ? "Focus complete!" : "Break over!",
        sub: `Next: ${MODE_LABEL[next.type]} · ${Math.round(next.sec / 60)} min`,
        nextLabel: next.type === "focus" ? "Start focus" : "Start break",
      });
      if (this.get().autoContinue && !skipped) this._autoCountdown();
    } else {
      this.rebuild();
      toast(st.type === "focus" ? "Session logged. Well done!" : "Break finished. Ready for more?", "teal");
    }
    this.render();
  }

  _autoCountdown() {
    this.cancelAuto();
    let left = 8;
    this.onBanner(true, null, left);
    this.autoTimer = setInterval(() => {
      left -= 0.5;
      if (left <= 0) { this.continueNext(); return; }
      this.onBanner(true, null, left);
    }, 500);
  }
  cancelAuto() { if (this.autoTimer) { clearInterval(this.autoTimer); this.autoTimer = null; } }

  notify(title, body) {
    try {
      if (this.get().notifs && "Notification" in window && Notification.permission === "granted") {
        new Notification(`StudyMates · ${title}`, { body, silent: true });
      }
    } catch {}
  }
  label(step = this.step()) {
    if (this.get().pomo && step.type === "focus") return `Focus ${step.n}/${this.get().cycles}`;
    return MODE_LABEL[step.type];
  }
}
