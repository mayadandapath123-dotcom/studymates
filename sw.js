/* StudyMates service worker: offline-first app shell cache. */
const V = "studymates-v2";
const ASSETS = [
  "./", "./index.html", "./manifest.webmanifest",
  "./css/tokens.css", "./css/ui.css", "./css/room.css",
  "./js/app.js", "./js/utils.js", "./js/characters.js", "./js/behavior.js",
  "./js/timer.js", "./js/audio.js", "./js/store.js", "./js/stage3d.js",
  "./js/vendor/three.module.min.js",
  "./assets/concept-milo.png", "./assets/concept-momo.png",
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()).catch(() => {}));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET" || !request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(V).then((c) => c.put(request, copy)).catch(() => {});
        }
        return res;
      }).catch(() => {
        if (request.mode === "navigate") return caches.match("./index.html");
        throw new Error("offline");
      });
    })
  );
});
