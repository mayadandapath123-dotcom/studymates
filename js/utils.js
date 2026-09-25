/* Shared utilities: dom, random, time, storage */
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function pickWeighted(items, weightFn) {
  let total = 0;
  const scored = items.map((it) => { const w = Math.max(0, weightFn(it)); total += w; return [it, w]; });
  if (total <= 0) return items[0] || null;
  let r = Math.random() * total;
  for (const [it, w] of scored) { r -= w; if (r <= 0) return it; }
  return scored[scored.length - 1][0];
}

export const pad2 = (n) => String(n).padStart(2, "0");
export function fmtClock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
}
export function fmtDur(totalSec) {
  totalSec = Math.round(totalSec);
  if (totalSec <= 0) return "0m";
  if (totalSec < 60) return `${totalSec}s`;
  const m = Math.floor(totalSec / 60), h = Math.floor(m / 60);
  if (h <= 0) return `${m}m`;
  const rm = m % 60;
  return rm ? `${h}h ${rm}m` : `${h}h`;
}
export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
export function dayLabel(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short" });
}
export function last7Keys() {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    out.push(todayKey(d));
  }
  return out;
}

export function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch { return fallback; }
}
export function saveJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* storage full/blocked */ }
}

export function toast(msg, kind = "") {
  const box = $("#toasts");
  if (!box) return;
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .4s"; }, 3400);
  setTimeout(() => el.remove(), 3900);
  while (box.children.length > 3) box.firstChild.remove();
}

export const prefersReducedMotion = () =>
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function timeOfDayForHour(h) {
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 16) return "afternoon";
  if (h >= 16 && h < 19) return "evening";
  return "night";
}
