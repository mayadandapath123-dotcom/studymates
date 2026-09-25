/* Local-first persistence: settings + study stats in localStorage.
   No accounts, no network. Keys are versioned for safe future migration. */
import { loadJSON, saveJSON, todayKey } from "./utils.js";

const SET_KEY = "studymates.settings.v1";
const STATS_KEY = "studymates.stats.v1";

export const DEFAULT_SETTINGS = {
  char: "milo", time: "auto", freq: "normal",
  pomo: true, focusMin: 25, shortMin: 5, longMin: 15, cycles: 4,
  autoContinue: true, notifs: false, reduce: "auto", goalMin: 120,
  rain: false, birds: false, tones: false,
  volA: 60, volS: 80, muted: false, heroHidden: false,
};

export const settings = {
  data: loadJSON(SET_KEY, { ...DEFAULT_SETTINGS }),
  get(k) { return this.data[k]; },
  set(patch) { Object.assign(this.data, patch); this.save(); },
  save() { saveJSON(SET_KEY, this.data); },
};

function blankStats() {
  return { days: {}, sessions: 0, completed: 0, breaks: 0, focusTotal: 0, streak: 0, longest: 0, lastDate: null, goalDay: null };
}

export const stats = {
  data: loadJSON(STATS_KEY, blankStats()),
  save() { saveJSON(STATS_KEY, this.data); },
  touch() {
    const t = todayKey();
    if (this.data.lastDate === t) return;
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yk = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
    this.data.streak = this.data.lastDate === yk ? this.data.streak + 1 : 1;
    this.data.longest = Math.max(this.data.longest, this.data.streak);
    this.data.lastDate = t;
  },
  /** bank focus seconds; returns true if the daily goal was just reached */
  addFocus(sec, goalSec) {
    if (sec < 1) return false;
    const t = todayKey();
    this.data.days[t] = Math.round((this.data.days[t] || 0) + sec);
    this.data.focusTotal = Math.round(this.data.focusTotal + sec);
    this.touch();
    this.save();
    if (goalSec > 0 && this.data.days[t] >= goalSec && this.data.goalDay !== t) {
      this.data.goalDay = t;
      this.save();
      return true;
    }
    return false;
  },
  sessionStart() { this.data.sessions++; this.touch(); this.save(); },
  sessionComplete() { this.data.completed++; this.touch(); this.save(); },
  breakComplete() { this.data.breaks++; this.save(); },
  todaySec() { return this.data.days[todayKey()] || 0; },
  weekSec() {
    let s = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      s += this.data.days[todayKey(d)] || 0;
    }
    return s;
  },
  avg() { return this.data.completed ? Math.round(this.data.focusTotal / this.data.completed) : 0; },
  resetAll() { this.data = blankStats(); this.save(); },
};
