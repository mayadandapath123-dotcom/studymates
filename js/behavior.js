/* Behavior engine: a small state machine + weighted activity picker with
   cooldowns. The buddy always returns to a base pose — it never feels like
   a GIF playlist. Phases: idle | focus | break. */
import { $, rand, choice, pickWeighted } from "./utils.js";
import { getChar } from "./characters.js";

/* id, pose, expr, spot, phases, base weight, dur sec, cooldown sec, mood, bubble set/chance, sfx */
const ACTS = [
  { id: "write", pose: "write", expr: "focused", spot: "desk", phases: ["focus", "idle"], w: 4, dur: [30, 60], cool: 25, mood: "is writing…", bub: ["study", .18] },
  { id: "read", pose: "read", expr: "focused", spot: "desk", phases: ["focus", "idle"], w: 3.5, dur: [30, 55], cool: 30, mood: "is reading…", sfx: "page", bub: ["study", .15] },
  { id: "type", pose: "type", expr: "focused", spot: "desk", phases: ["focus", "idle"], w: 3, dur: [25, 50], cool: 30, mood: "is typing notes…", bub: ["study", .12] },
  { id: "think", pose: "think", expr: "neutral", spot: "desk", phases: ["focus", "idle"], w: 2.5, dur: [8, 16], cool: 45, mood: "is thinking…" },
  { id: "drink", pose: "drink", expr: "happy", spot: "desk", phases: ["focus", "break", "idle"], w: 3, dur: [5, 8], cool: 70, mood: "is having a sip…", sfx: "sip", bub: ["drink", .5] },
  { id: "look", pose: "look", expr: "neutral", spot: "desk", phases: ["focus", "idle"], w: 2.8, dur: [6, 12], cool: 55, mood: "is looking around…" },
  { id: "stretch", pose: "stretch", expr: "sleepy", spot: "desk", phases: ["focus", "break", "idle"], w: 2.2, dur: [5, 8], cool: 80, mood: "is stretching…" },
  { id: "yawn", pose: "yawn", expr: "sleepy", spot: "desk", phases: ["focus", "idle"], w: 1.4, dur: [4, 6], cool: 120, mood: "is yawning…" },
  { id: "window", pose: "window", expr: "neutral", spot: "window", phases: ["focus", "break", "idle"], w: 1.6, dur: [12, 24], cool: 150, mood: "is gazing outside…" },
  { id: "music", pose: "music", expr: "happy", spot: "desk", phases: ["focus", "break", "idle"], w: 1.5, dur: [20, 40], cool: 180, mood: "is vibing to music…" },
  { id: "walk", pose: "walk", expr: "neutral", spot: "center", phases: ["break"], w: 3, dur: [6, 10], cool: 40, mood: "is walking around…" },
  { id: "standBreak", pose: "stand", expr: "neutral", spot: "center", phases: ["break"], w: 2.5, dur: [8, 14], cool: 25, mood: "is taking a breather…" },
  { id: "breakDrink", pose: "drink", expr: "happy", spot: "desk", phases: ["break"], w: 3.5, dur: [6, 9], cool: 45, mood: "is rehydrating…", sfx: "sip", bub: ["drink", .5] },
  { id: "exercise", pose: "exercise", expr: "happy", spot: "center", phases: ["break"], w: 2, dur: [8, 14], cool: 120, mood: "is doing jumping jacks!", bub: ["break", .6] },
  { id: "plant", pose: "plant", expr: "happy", spot: "plant", phases: ["break", "idle"], w: 1.6, dur: [10, 16], cool: 200, mood: "is watering the plant…", bub: ["break", .5] },
  { id: "phone", pose: "phone", expr: "neutral", spot: "bed", phases: ["break", "idle"], w: 1.4, dur: [12, 20], cool: 220, mood: "is checking something…" },
  { id: "nap", pose: "rest", expr: "sleepy", spot: "bed", phases: ["break"], w: 1.2, dur: [18, 30], cool: 300, mood: "is resting eyes…" },
  { id: "washroom", pose: "walk", expr: "neutral", spot: "off", phases: ["focus", "break"], w: 0.5, dur: [10, 16], cool: 420, mood: "stepped out for a moment…", bub: ["washroom", 1], special: "washroom" },
];

const GAPS = { /* seconds between activities by energy + phase */
  calm: { focus: [55, 110], break: [22, 45], idle: [28, 55] },
  normal: { focus: [30, 65], break: [14, 30], idle: [16, 34] },
  lively: { focus: [16, 36], break: [7, 16], idle: [9, 20] },
};

export class BehaviorEngine {
  constructor(opts = {}) {
    this.getCharId = opts.getCharId || (() => "milo");
    this.getFreq = opts.getFreq || (() => "normal");
    this.isReduced = opts.isReduced || (() => false);
    this.sfx = opts.sfx || (() => {});
    this.onMood = opts.onMood || (() => {});
    this.view = opts.view || null; // 3D stage (setPose/setSpot)
    this.bubbleEl = $("#bubble"); this.zzz = $("#zzz"); this.notes = $("#musicNotes");
    this.phase = "idle";
    this.cool = new Map();
    this.gen = 0; this.timer = null; this.bubbleTimer = null;
    this.frozen = false;
  }

  /* ---------- primitives ---------- */
  pose(p, e) {
    this.view?.setPose(p, e);
    this.zzz.hidden = p !== "rest";
    this.notes.hidden = p !== "music";
  }
  spot(s) { this.view?.setSpot(s); }
  mood(t) { this.onMood(`${getChar(this.getCharId()).name} ${t}`); }
  bubble(text, ms = 3400, force = false) {
    if (!text) return;
    if (!force && !this.bubbleEl.hidden && Math.random() < .6) return; // don't spam
    this.bubbleEl.textContent = text;
    this.bubbleEl.hidden = false;
    clearTimeout(this.bubbleTimer);
    this.bubbleTimer = setTimeout(() => { this.bubbleEl.hidden = true; }, ms);
  }
  wait(ms) {
    const g = this.gen;
    const t = this.isReduced() ? Math.min(ms, 1100) : ms;
    return new Promise((res) => setTimeout(() => res(g === this.gen), t));
  }
  later(fn, ms) {
    clearTimeout(this.timer);
    const g = this.gen;
    this.timer = setTimeout(() => { if (g === this.gen && !this.frozen) fn(); }, this.isReduced() ? ms * 1.4 : ms);
  }
  stopLoop() { this.gen++; clearTimeout(this.timer); }

  /* ---------- main loop ---------- */
  setPhase(p) {
    this.stopLoop();
    this.phase = p;
    this.cool.clear();
    this.tick(true);
  }
  freeze() { this.frozen = true; clearTimeout(this.timer); }
  unfreeze() { if (!this.frozen) return; this.frozen = false; this.tick(true); }

  tick(first = false) {
    const act = this.pick();
    this.play(act);
    const durMs = rand(act.dur[0], act.dur[1]) * 1000;
    const gap = GAPS[this.getFreq()]?.[this.phase] || GAPS.normal.focus;
    const gapMs = rand(gap[0], gap[1]) * 1000 * (first ? 0.35 : 1);
    this.later(() => { this.toBase(); this.later(() => this.tick(), gapMs); }, durMs);
  }

  pick() {
    const now = Date.now() / 1000;
    const c = getChar(this.getCharId());
    const cands = ACTS.filter((a) => a.phases.includes(this.phase) && (now - (this.cool.get(a.id) || -1e9)) > a.cool);
    const pool = cands.length ? cands : ACTS.filter((a) => a.phases.includes(this.phase));
    return pickWeighted(pool, (a) => a.w * (c.weights[a.id] ?? c.weights[a.pose] ?? 1));
  }

  play(act) {
    this.cool.set(act.id, Date.now() / 1000);
    if (act.special === "washroom") return this.washroomTrip();
    this.spot(act.spot); // the 3D view walks there on its own
    this.pose(act.pose, act.expr);
    this.mood(act.mood);
    if (act.sfx) setTimeout(() => this.sfx(act.sfx), 1200);
    if (act.bub) {
      const [set, chance] = act.bub;
      if (Math.random() < chance) setTimeout(() => this.bubble(choice(getChar(this.getCharId()).bubbles[set])), 1500);
    }
    if (act.id === "read" && Math.random() < .7) setTimeout(() => this.sfx("page"), rand(6000, 14000));
  }

  toBase() {
    if (this._trip) return; // mid washroom-trip: the trip restores base itself
    if (this.phase === "focus") {
      const bases = ["write", "read", "type"];
      const c = getChar(this.getCharId());
      const b = pickWeighted(bases, (x) => c.weights[x] ?? 1);
      this.spot("desk"); this.pose(b, "focused"); this.mood(`is ${b === "write" ? "writing" : b === "read" ? "reading" : "typing notes"}…`);
    } else if (this.phase === "break") {
      this.spot("center"); this.pose("stand", "neutral"); this.mood("is on a break…");
    } else {
      this.spot("desk"); this.pose("write", "focused"); this.mood("is waiting for you to start…");
    }
  }

  /* ---------- sequences ---------- */
  async sessionStart() {
    this.setPhase("focus");
    this.spot("desk"); this.pose("idle", "neutral"); this.mood("is settling in…");
    if (!(await this.wait(900))) return;
    const c = getChar(this.getCharId());
    this.pose("write", "focused"); this.mood("started studying with you!");
    this.bubble(choice(c.bubbles.greet), 3400, true);
    this.sfx("page");
  }
  breakStart() { // break timer began (after focusComplete already played)
    this.setPhase("break");
    this.spot("center"); this.pose("stand", "happy"); this.mood("is on a break!");
  }
  async focusComplete(hasNext) {
    this.stopLoop(); this.phase = "transition";
    const c = getChar(this.getCharId());
    this.spot("desk"); this.pose("look", "surprised"); this.mood("noticed the timer!");
    this.bubble(choice(c.bubbles.complete), 3400, true);
    if (!(await this.wait(1600))) return;
    this.pose("idle", "happy"); this.sfx("page");
    if (!(await this.wait(900))) return;
    this.pose("stretch", "sleepy"); this.mood("is stretching…");
    if (!(await this.wait(2600))) return;
    this.spot("center"); this.pose("walk", "happy"); this.mood("is getting up…");
    if (!(await this.wait(1500))) return;
    this.setPhase(hasNext ? "break" : "idle");
    if (!hasNext) { this.pose("drink", "happy"); this.mood("is having a sip…"); this.sfx("sip"); }
  }
  async breakOver() { // returning to focus
    this.stopLoop(); this.phase = "transition";
    const c = getChar(this.getCharId());
    this.spot("center"); this.pose("stand", "neutral"); this.mood("is heading back…");
    if (!(await this.wait(900))) return;
    this.spot("desk"); this.pose("walk", "neutral");
    if (!(await this.wait(1500))) return;
    this.setPhase("focus");
    this.pose("write", "focused"); this.mood("is back at it!");
    this.bubble(choice(["Back to it!", "Let's keep going!", "Refreshed and ready."]), 3200, true);
    this.sfx("page");
  }
  async windDown() { // single timer finished, no queue
    await this.focusComplete(false);
  }
  pauseBuddy() {
    this.freeze();
    this.spot("desk"); this.pose("think", "neutral"); this.mood("is waiting… (paused)");
    this.bubble("Paused. I'll wait here.", 3000, true);
  }
  resumeBuddy() { this.unfreeze(); this.mood("is studying with you!"); }
  resetBuddy() { this.setPhase("idle"); this.bubbleEl.hidden = true; }

  async washroomTrip() {
    const c = getChar(this.getCharId());
    this.bubble(choice(c.bubbles.washroom), 3000, true);
    this._trip = true;
    this.pose("walk", "neutral"); this.spot("off"); this.mood("stepped out for a moment…");
    if (!(await this.wait(rand(7000, 12000)))) { this._trip = false; return; }
    this.spot(this.phase === "break" ? "center" : "desk");
    this.pose("walk", "happy");
    if (!(await this.wait(3000))) { this._trip = false; return; }
    this._trip = false;
    this.toBase();
  }
  async celebrateGoal() {
    const c = getChar(this.getCharId());
    const prevPhase = this.phase;
    this.stopLoop(); this.phase = "transition";
    this.spot("center"); this.pose("celebrate", "happy");
    this.mood("is celebrating your goal!");
    this.bubble(choice(c.bubbles.goal), 4200, true);
    this.confetti();
    this.sfx("chime-soft");
    await this.wait(4200);
    this.setPhase(prevPhase === "transition" ? "idle" : prevPhase);
  }
  async boop() {
    const c = getChar(this.getCharId());
    this.stopLoop();
    const prev = this.phase === "transition" ? "idle" : this.phase;
    this.phase = "transition";
    this.pose("idle", "surprised"); this.mood("got a hi from you!");
    this.sfx("pop");
    await this.wait(900);
    this.pose("idle", "happy"); this.bubble(choice(c.bubbles.boop), 3000, true);
    await this.wait(2200);
    this.setPhase(prev);
  }
  greetChar() {
    const c = getChar(this.getCharId());
    this.pose("idle", "happy");
    this.bubble(choice(c.bubbles.greet), 3200, true);
    this.mood(`says hi! (${c.tag})`);
    this.sfx("pop");
  }
  confetti() {
    if (this.isReduced()) return;
    const room = $("#room");
    if (!room) return;
    const colors = ["#e05a5a", "#f5b942", "#3fb3a8", "#7a86e0", "#e08bc0"];
    for (let i = 0; i < 26; i++) {
      const s = document.createElement("span");
      s.style.cssText = `position:absolute;left:${rand(30, 70)}%;top:32%;width:${rand(6, 11)}px;height:${rand(8, 14)}px;background:${choice(colors)};border-radius:3px;z-index:20;pointer-events:none`;
      room.appendChild(s);
      s.animate([
        { transform: "translate(0,0) rotate(0)", opacity: 1 },
        { transform: `translate(${rand(-160, 160)}px,${rand(60, 200)}px) rotate(${rand(-540, 540)}deg)`, opacity: 0 },
      ], { duration: rand(1100, 1900), easing: "cubic-bezier(.2,.7,.3,1)" }).onfinish = () => s.remove();
    }
  }
}
