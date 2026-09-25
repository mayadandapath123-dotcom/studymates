/* 3D stage: procedural cozy room + rigged chibi buddies (Three.js, vendored).
   The behavior brain talks to this view via setPose/setSpot/setCharacter —
   all locomotion, posing and secondary motion are procedural, damped and
   buttery. No model files: everything is built from primitives. */
import * as THREE from "./vendor/three.module.min.js";

const STYLE = {
  milo: { skin: 0xffd9b3, hair: 0x7a4a2b, top: 0x3fb3a8, top2: 0x2b8f87, bottom: 0x8a6a4f, shoe: 0xe07a3f, blush: 0xf4a48f, cup: 0xe07a3f, accent: 0x2fa39a, brow: 0x5b4a3f, freckles: true },
  momo: { skin: 0x8a5a3b, hair: 0x2b2320, top: 0xfff3df, top2: 0xf0d9b5, bottom: 0xe05a5a, shoe: 0x2fa39a, blush: 0xd97b6c, cup: 0x2fa39a, accent: 0xe05a5a, brow: 0x171212, freckles: false },
};
/* walkable spots: position, facing yaw, sit-lift (0 = stand) */
const SPOTS = {
  desk: { p: [0.15, 0, -1.5], yaw: 1.0, sit: 0.42 },
  window: { p: [-2.15, 0, -1.8], yaw: Math.PI, sit: 0 },
  plant: { p: [-2.2, 0, 1.15], yaw: -2.03, sit: 0 },
  center: { p: [0.4, 0, 0.8], yaw: 0.3, sit: 0 },
  bed: { p: [-2.2, 0, -2.2], yaw: Math.PI / 2, sit: 0.38 },
  door: { p: [2.9, 0, -2.25], yaw: Math.PI, sit: 0 },
};
const VIA = [0.7, 0, 0.35]; // lane waypoint that avoids the desk/bed
/* pose targets: arms [x,y,z], head [x,y,z], lean, props */
const POSES = {
  idle: { aL: [-0.12, 0, 0.1], aR: [-0.12, 0, -0.1], head: [0, 0, 0], lean: 0.02 },
  write: { aL: [-0.55, 0, 0.12], aR: [-1.5, 0, -0.12], head: [0.3, 0.25, 0], lean: 0.1, pencil: 1 },
  read: { aL: [-1.05, 0.35, 0.3], aR: [-1.05, -0.35, -0.3], head: [0.28, 0, 0], lean: 0.08, book: 1 },
  type: { aL: [-1.42, 0, 0.1], aR: [-1.42, 0, -0.1], head: [0.22, 0.15, 0], lean: 0.08 },
  think: { aL: [-0.3, 0, 0.1], aR: [-2.0, 0, -0.25], head: [0.05, 0.1, -0.14], lean: 0.02 },
  drink: { aL: [-0.2, 0, 0.1], aR: [-2.3, 0, -0.2], head: [-0.16, 0, 0], lean: -0.04, cup: 1 },
  stretch: { aL: [-2.75, 0, 0.45], aR: [-2.75, 0, -0.45], head: [-0.22, 0, 0], lean: -0.1 },
  yawn: { aL: [-1.9, 0, 0.3], aR: [-0.3, 0, -0.1], head: [-0.12, 0, 0], lean: 0 },
  look: { aL: [-0.12, 0, 0.1], aR: [-0.12, 0, -0.1], head: [0, 0, 0], lean: 0.02 },
  stand: { aL: [-0.08, 0, 0.08], aR: [-0.08, 0, -0.08], head: [0, 0, 0], lean: 0 },
  walk: { aL: [-0.1, 0, 0.1], aR: [-0.1, 0, -0.1], head: [0.05, 0, 0], lean: 0.04 },
  music: { aL: [-0.45, 0, 0.15], aR: [-0.45, 0, -0.15], head: [0.08, 0, 0], lean: 0.03, phones: 1 },
  window: { aL: [0.35, 0, 0.08], aR: [0.35, 0, -0.08], head: [-0.28, 0, 0], lean: -0.02 },
  rest: { aL: [-0.55, 0, 0.12], aR: [-0.55, 0, -0.12], head: [0.55, 0.1, 0.08], lean: 0.48 },
  celebrate: { aL: [-2.9, 0, 0.35], aR: [-2.9, 0, -0.35], head: [-0.15, 0, 0], lean: -0.06 },
  exercise: { aL: [-0.3, 0, 0.2], aR: [-0.3, 0, -0.2], head: [0, 0, 0], lean: 0 },
  plant: { aL: [-0.2, 0, 0.1], aR: [-1.0, 0, -0.1], head: [0.28, 0.1, 0], lean: 0.12, can: 1 },
  phone: { aL: [-0.3, 0, 0.1], aR: [-2.5, 0, -0.55], head: [0, 0, -0.1], lean: 0.02, phone: 1 },
};
const TIMES = {
  morning: { sky: 0x8ed6ff, sun: 0xfff3c4, dir: 0xffedd0, di: 1.15, hs: 0xbcd9ff, hg: 0xcaa26b, hi: 0.75, lamp: 0, moon: 0, stars: 0, sunY: 2.7 },
  afternoon: { sky: 0x5eb9ff, sun: 0xffffff, dir: 0xffffff, di: 1.3, hs: 0xcfe6ff, hg: 0xcaa26b, hi: 0.9, lamp: 0, moon: 0, stars: 0, sunY: 2.9 },
  evening: { sky: 0xff9d5c, sun: 0xffb36b, dir: 0xffb36b, di: 0.85, hs: 0xffc890, hg: 0x9a6a45, hi: 0.55, lamp: 0.7, moon: 0, stars: 0, sunY: 1.7 },
  night: { sky: 0x232c52, sun: 0xfff3c4, dir: 0x8a9bd8, di: 0.22, hs: 0x4a5a94, hg: 0x2e2a4a, hi: 0.26, lamp: 1.7, moon: 1, stars: 1, sunY: 2.7 },
};

/* ---------- helpers ---------- */
const matCache = new Map();
function M(color, rough = 0.9) {
  const k = color + "|" + rough;
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 }));
  return matCache.get(k);
}
function mesh(geo, material, x = 0, y = 0, z = 0, cast = true, recv = false) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = cast; m.receiveShadow = recv;
  return m;
}
const BOX = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const SPH = (r, w = 20, h = 16) => new THREE.SphereGeometry(r, w, h);
const CYL = (rt, rb, h, s = 18) => new THREE.CylinderGeometry(rt, rb, h, s);
const CAP = (r, l) => new THREE.CapsuleGeometry(r, l, 6, 14);
function canvasTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const damp = THREE.MathUtils.damp;
const clamp = THREE.MathUtils.clamp;
function wrapAngle(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }

/* ==================================================================== */
export function createStage({ room, bubble, zzz, notes }) {
  const canvas = room.querySelector("#scene");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffdfb8);
  const camera = new THREE.PerspectiveCamera(40, 1.6, 0.1, 60);
  const CAM_T = new THREE.Vector3(-0.5, 1.0, -0.9);
  const CAM_P = new THREE.Vector3(0.1, 3.0, 6.7);

  /* ---------- lights ---------- */
  const hemi = new THREE.HemisphereLight(0xcfe6ff, 0xcaa26b, 0.9);
  scene.add(hemi);
  scene.add(new THREE.AmbientLight(0xfff2e0, 0.15));
  const dir = new THREE.DirectionalLight(0xffffff, 1.3);
  dir.position.set(-2.5, 4.5, 1.5);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  dir.shadow.camera.left = -5; dir.shadow.camera.right = 5;
  dir.shadow.camera.top = 5; dir.shadow.camera.bottom = -5;
  dir.shadow.camera.near = 0.5; dir.shadow.camera.far = 20;
  dir.shadow.bias = -0.0004;
  dir.target.position.set(0.5, 0, -0.5);
  scene.add(dir, dir.target);
  const fill = new THREE.DirectionalLight(0xfff2e0, 0.3);
  fill.position.set(3, 4, 6);
  scene.add(fill);
  const lampLight = new THREE.PointLight(0xffb35c, 0, 6, 2);
  lampLight.position.set(0.5, 1.5, -1.7);
  scene.add(lampLight);

  /* ---------- textures ---------- */
  const softTex = canvasTex(64, 64, (g) => {
    const r = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  });
  const streakTex = canvasTex(16, 64, (g) => {
    const r = g.createLinearGradient(0, 0, 0, 64);
    r.addColorStop(0, "rgba(200,225,245,0)"); r.addColorStop(0.5, "rgba(200,225,245,.95)"); r.addColorStop(1, "rgba(200,225,245,0)");
    g.fillStyle = r; g.fillRect(6, 0, 4, 64);
  });
  const floorTex = canvasTex(256, 256, (g) => {
    g.fillStyle = "#d9a066"; g.fillRect(0, 0, 256, 256);
    g.fillStyle = "#c08a4e";
    for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 2, 256);
    g.fillStyle = "rgba(140,95,50,.5)";
    for (let i = 0; i < 40; i++) g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(4, 3);
  const posterTex = (accent) => canvasTex(256, 320, (g) => {
    g.fillStyle = "#fff8ec"; g.fillRect(0, 0, 256, 320);
    g.strokeStyle = accent; g.lineWidth = 14; g.strokeRect(10, 10, 236, 300);
    g.fillStyle = accent; g.font = "900 44px sans-serif"; g.textAlign = "center";
    g.fillText("You can", 128, 140); g.fillText("do it!", 128, 195);
    g.font = "900 60px sans-serif"; g.fillText("★", 128, 270);
  });
  const calTex = canvasTex(128, 160, (g) => {
    g.fillStyle = "#fff8ec"; g.fillRect(0, 0, 128, 160);
    g.fillStyle = "#e05a5a"; g.fillRect(0, 0, 128, 30);
    g.fillStyle = "#f0e2c8";
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) g.fillRect(12 + c * 28, 42 + r * 28, 20, 20);
    g.fillStyle = "#3fb3a8"; g.fillRect(12, 42, 20, 20); g.fillRect(40, 42, 20, 20);
    g.fillStyle = "#e07a3f"; g.fillRect(68, 98, 20, 20);
  });
  const lapTex = canvasTex(256, 160, (g) => {
    g.fillStyle = "#22303f"; g.fillRect(0, 0, 256, 160);
    const cols = ["#7fd3c6", "#f5b942", "#7fd3c6", "#e08bc0", "#7fd3c6"];
    cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(20, 24 + i * 26, 150 - i * 18, 10); });
    g.fillStyle = "#f5b942"; g.fillRect(20, 24 + 5 * 26, 8, 10);
  });

  /* ---------- room shell ---------- */
  const R = {};
  const floor = mesh(BOX(8.6, 0.12, 6.8), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85 }), 0, -0.06, 0, false, true);
  scene.add(floor);
  const wallMat = M(0xffe0b8, 0.95);
  scene.add(mesh(BOX(0.99, 3.5, 0.15), wallMat, -3.805, 1.75, -3.28, false, true));
  scene.add(mesh(BOX(5.59, 3.5, 0.15), wallMat, 1.505, 1.75, -3.28, false, true));
  scene.add(mesh(BOX(2.02, 0.95, 0.15), wallMat, -2.3, 0.475, -3.28, false, true));
  scene.add(mesh(BOX(2.02, 0.45, 0.15), wallMat, -2.3, 3.275, -3.28, false, true));
  scene.add(mesh(BOX(0.15, 3.5, 6.9), wallMat, -4.28, 1.75, 0, false, true));
  scene.add(mesh(BOX(8.6, 0.14, 0.05), M(0xb57f45), 0, 0.07, -3.18, false));
  scene.add(mesh(BOX(0.05, 0.14, 6.8), M(0xb57f45), -4.18, 0.07, 0, false));
  // rug
  scene.add(mesh(CYL(1.45, 1.45, 0.03, 36), M(0x6fb8ab), 0.3, 0.015, 0.9, false, true));
  scene.add(mesh(CYL(1.0, 1.0, 0.034, 36), M(0x8fd3c6), 0.3, 0.015, 0.9, false, true));

  /* ---------- window + outside ---------- */
  const winG = new THREE.Group();
  winG.position.set(-2.3, 2.0, -3.2);
  const frameMat = M(0xfff8ec, 0.8);
  const fw = 1.9, fh = 2.0, ft = 0.12;
  [[-fw / 2, 0, ft, fh], [fw / 2, 0, ft, fh], [0, fh / 2, fw + ft, ft], [0, -fh / 2, fw + ft, ft], [0, 0, 0.07, fh], [0, 0, fw, 0.07]].forEach(([x, y, w, h]) => {
    winG.add(mesh(BOX(w, h, 0.1), frameMat, x, y, 0));
  });
  winG.add(mesh(BOX(fw + 0.35, 0.09, 0.3), frameMat, 0, -fh / 2 - 0.06, 0.08));
  // curtains
  const curtMat = M(0xe08bc0, 0.9);
  winG.add(mesh(BOX(0.28, 2.3, 0.1), curtMat, -fw / 2 - 0.2, 0.05, 0.05));
  winG.add(mesh(BOX(0.28, 2.3, 0.1), curtMat, fw / 2 + 0.2, 0.05, 0.05));
  scene.add(winG);
  R.skyMat = new THREE.MeshBasicMaterial({ color: 0x5eb9ff });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.0), R.skyMat);
  sky.position.set(-2.3, 2.0, -3.62);
  scene.add(sky);
  const hillMat = new THREE.MeshBasicMaterial({ color: 0x8fce7f });
  R.hills = [];
  [[-3.1, 0.78, 0.9], [-1.6, 0.68, 1.1]].forEach(([x, y, r]) => {
    const h = new THREE.Mesh(SPH(r, 20, 12), hillMat);
    h.scale.y = 0.45; h.scale.z = 0.5; h.position.set(x, y, -3.75);
    scene.add(h); R.hills.push(h);
  });
  R.sunMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  R.sun = new THREE.Mesh(SPH(0.22, 20, 16), R.sunMat);
  R.sun.position.set(-2.9, 2.9, -3.5);
  R.sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: 0xffe9a0, transparent: true, opacity: 0.9, depthWrite: false }));
  R.sunGlow.scale.set(1.1, 1.1, 1);
  R.sunGlow.position.copy(R.sun.position);
  scene.add(R.sun, R.sunGlow);
  R.moon = new THREE.Mesh(SPH(0.18, 20, 16), new THREE.MeshBasicMaterial({ color: 0xfffbe8 }));
  R.moon.position.set(-1.6, 2.6, -3.5);
  R.moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: 0xdfe6ff, transparent: true, opacity: 0.8, depthWrite: false }));
  R.moonGlow.scale.set(0.9, 0.9, 1);
  R.moonGlow.position.copy(R.moon.position);
  R.moon.visible = R.moonGlow.visible = false;
  scene.add(R.moon, R.moonGlow);
  // stars
  {
    const n = 60, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = -3.9 + Math.random() * 3.2; pos[i * 3 + 1] = 0.9 + Math.random() * 2.2; pos[i * 3 + 2] = -3.56; }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    R.starMat = new THREE.PointsMaterial({ size: 0.07, map: softTex, transparent: true, opacity: 0, depthWrite: false, color: 0xffffff });
    R.stars = new THREE.Points(g, R.starMat);
    R.stars.visible = false;
    scene.add(R.stars);
  }
  // rain (outside window)
  {
    const n = 240;
    R.rainPos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { R.rainPos[i * 3] = -3.2 + Math.random() * 1.9; R.rainPos[i * 3 + 1] = 0.9 + Math.random() * 2.2; R.rainPos[i * 3 + 2] = -3.5 + Math.random() * 0.15; }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(R.rainPos, 3));
    R.rain = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.38, map: streakTex, transparent: true, opacity: 0.85, depthWrite: false }));
    R.rain.visible = false;
    R.rain.frustumCulled = false;
    scene.add(R.rain);
  }

  /* ---------- wall decor ---------- */
  // clock (live hands)
  const clockG = new THREE.Group();
  clockG.position.set(-0.8, 2.55, -3.18);
  clockG.add(mesh(CYL(0.19, 0.19, 0.05, 28), M(0x8a5a33), 0, 0, 0));
  clockG.children[0].rotation.x = Math.PI / 2;
  const face = mesh(CYL(0.155, 0.155, 0.055, 28), M(0xfff8ec, 0.7), 0, 0, 0, false);
  face.rotation.x = Math.PI / 2;
  clockG.add(face);
  R.hourH = new THREE.Group(); R.minH = new THREE.Group();
  const hh = mesh(BOX(0.025, 0.085, 0.012), M(0x5b4a3f), 0, 0.035, 0, false);
  const mh = mesh(BOX(0.018, 0.125, 0.012), M(0xe07a3f), 0, 0.05, 0, false);
  R.hourH.add(hh); R.minH.add(mh);
  R.hourH.position.z = R.minH.position.z = 0.032;
  clockG.add(R.hourH, R.minH);
  scene.add(clockG);
  // calendar + poster + shelf
  const cal = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.44), new THREE.MeshStandardMaterial({ map: calTex, roughness: 0.9 }));
  cal.position.set(-0.05, 2.32, -3.19); cal.rotation.z = 0.05;
  scene.add(cal);
  R.posterMilo = new THREE.MeshStandardMaterial({ map: posterTex("#2fa39a"), roughness: 0.9 });
  R.posterMomo = new THREE.MeshStandardMaterial({ map: posterTex("#e05a5a"), roughness: 0.9 });
  R.poster = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.7), R.posterMilo);
  R.poster.position.set(0.78, 2.28, -3.19); R.poster.rotation.z = -0.05;
  scene.add(R.poster);
  const shelfG = new THREE.Group();
  shelfG.position.set(2.0, 2.42, -3.1);
  shelfG.add(mesh(BOX(1.15, 0.07, 0.3), M(0xa06a3b), 0, 0, 0));
  const bkCols = [0xe05a5a, 0x3fb3a8, 0xf5b942, 0x7a86e0, 0x8fce7f];
  bkCols.forEach((c, i) => shelfG.add(mesh(BOX(0.13, 0.3 + (i % 3) * 0.05, 0.2), M(c), -0.42 + i * 0.2, 0.19, 0)));
  scene.add(shelfG);

  /* ---------- desk zone ---------- */
  const deskG = new THREE.Group();
  const woodMat = M(0xc98d4e), woodDark = M(0x8a5a33);
  deskG.add(mesh(BOX(2.0, 0.06, 0.8), woodMat, 1.3, 0.93, -1.65, true, true));
  [[0.42, -1.32], [2.18, -1.32], [0.42, -1.98], [2.18, -1.98]].forEach(([x, z]) => deskG.add(mesh(BOX(0.08, 0.9, 0.08), woodDark, x, 0.45, z)));
  // laptop (faces -x toward buddy)
  const lapG = new THREE.Group();
  lapG.position.set(0.58, 0.96, -1.48);
  lapG.add(mesh(BOX(0.3, 0.025, 0.26), M(0x3a4a5c, 0.6), 0, 0.013, 0));
  R.lapScreenMat = new THREE.MeshStandardMaterial({ map: lapTex, emissive: 0xffffff, emissiveMap: lapTex, emissiveIntensity: 0.9, roughness: 0.4, color: 0x222222 });
  const lapScrG = new THREE.Group();
  lapScrG.position.set(0.14, 0.025, 0);
  lapScrG.rotation.z = -0.09;
  lapScrG.add(mesh(BOX(0.02, 0.3, 0.34), M(0x3a4a5c, 0.6), 0, 0.15, 0));
  const lapFace = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.26), R.lapScreenMat);
  lapFace.rotation.y = -Math.PI / 2;
  lapFace.position.set(-0.011, 0.15, 0);
  lapScrG.add(lapFace);
  lapG.add(lapScrG);
  deskG.add(lapG);
  // notebook, cup, bottle, books, pencil cup
  deskG.add(mesh(BOX(0.34, 0.025, 0.26), M(0xfff8ec, 0.8), 0.66, 0.975, -1.44));
  deskG.children[deskG.children.length - 1].rotation.y = 0.1;
  deskG.add(mesh(BOX(0.02, 0.03, 0.26), M(0xe05a5a), 0.5, 0.975, -1.44));
  deskG.children[deskG.children.length - 1].rotation.y = 0.1;
  R.deskCupMat = M(0xe07a3f);
  deskG.add(mesh(CYL(0.05, 0.04, 0.1, 16), R.deskCupMat, 1.38, 1.01, -1.78));
  deskG.add(mesh(CYL(0.035, 0.035, 0.2, 14), M(0x9adcff, 0.3), 1.62, 1.06, -1.8));
  deskG.add(mesh(BOX(0.3, 0.05, 0.22), M(0x7a86e0), 1.92, 0.985, -1.7));
  deskG.add(mesh(BOX(0.26, 0.05, 0.2), M(0x8fce7f), 1.92, 1.035, -1.7));
  deskG.add(mesh(CYL(0.05, 0.045, 0.11, 14), M(0x7a86e0), 0.5, 1.015, -1.9));
  deskG.add(mesh(CYL(0.008, 0.008, 0.12, 8), M(0xf5b942), 0.49, 1.1, -1.9));
  deskG.add(mesh(CYL(0.008, 0.008, 0.1, 8), M(0xe05a5a), 0.52, 1.09, -1.88));
  // lamp
  const lampG = new THREE.Group();
  lampG.position.set(0.42, 0.96, -1.88);
  lampG.add(mesh(CYL(0.07, 0.09, 0.04, 16), M(0x5b4a3f, 0.6), 0, 0.02, 0));
  const lampArm = mesh(CYL(0.02, 0.02, 0.42, 10), M(0x5b4a3f, 0.6), 0.05, 0.22, 0.02);
  lampArm.rotation.z = -0.25;
  lampG.add(lampArm);
  R.shadeMat = new THREE.MeshStandardMaterial({ color: 0xe05a5a, roughness: 0.6, emissive: 0xffc46b, emissiveIntensity: 0 });
  const shade = mesh(CYL(0.05, 0.11, 0.13, 16, true), R.shadeMat, 0.12, 0.42, 0.05);
  lampG.add(shade);
  R.bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff2cc });
  const bulb = new THREE.Mesh(SPH(0.035, 12, 10), R.bulbMat);
  bulb.position.set(0.12, 0.38, 0.05);
  lampG.add(bulb);
  deskG.add(lampG);
  scene.add(deskG);
  // desk cup steam
  R.steams = [];
  function addSteam(x, y, z, s = 1) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    for (let i = 0; i < 2; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: 0xffffff, transparent: true, opacity: 0.0, depthWrite: false }));
      sp.scale.set(0.09 * s, 0.09 * s, 1);
      sp.userData.off = i * 0.5;
      g.add(sp); R.steams.push(sp);
    }
    scene.add(g);
    return g;
  }
  addSteam(1.38, 1.08, -1.78);

  /* ---------- chair (faces +x) ---------- */
  const chairG = new THREE.Group();
  chairG.position.set(0.15, 0, -1.55);
  chairG.add(mesh(BOX(0.5, 0.07, 0.5), M(0xc98d4e), 0, 0.565, 0));
  chairG.add(mesh(BOX(0.07, 0.62, 0.5), M(0xa06a3b), -0.26, 0.9, 0));
  [[-0.18, -0.18], [-0.18, 0.18], [0.18, -0.18], [0.18, 0.18]].forEach(([x, z]) => chairG.add(mesh(BOX(0.06, 0.53, 0.06), woodDark, x, 0.265, z)));
  scene.add(chairG);

  /* ---------- bed (along left wall) ---------- */
  const bedG = new THREE.Group();
  bedG.add(mesh(BOX(1.4, 0.35, 2.2), M(0xa06a3b), -3.1, 0.28, -1.9));
  bedG.add(mesh(BOX(1.4, 0.95, 0.12), M(0x8a5a33), -3.1, 0.65, -2.96));
  bedG.add(mesh(BOX(1.3, 0.15, 2.0), M(0xfff3df, 0.95), -3.1, 0.525, -1.9, true, true));
  bedG.add(mesh(BOX(0.55, 0.13, 0.34), M(0xffffff, 0.95), -3.1, 0.66, -2.65));
  bedG.add(mesh(BOX(1.32, 0.12, 1.15), M(0xe05a5a, 0.95), -3.1, 0.62, -1.45));
  bedG.add(mesh(BOX(1.32, 0.05, 0.3), M(0xf08a80, 0.95), -3.1, 0.68, -1.95));
  scene.add(bedG);

  /* ---------- bookcase (left wall) ---------- */
  const bcG = new THREE.Group();
  bcG.position.set(-4.02, 0, -0.1);
  bcG.add(mesh(BOX(0.36, 1.9, 1.0), M(0xb57f45), 0, 0.95, 0));
  bcG.add(mesh(BOX(0.3, 1.74, 0.88), M(0x8a5a33), 0.02, 0.92, 0));
  const bcCols = [0xe05a5a, 0x3fb3a8, 0xf5b942, 0x7a86e0, 0x8fce7f, 0xe08bc0];
  for (let s = 0; s < 3; s++) {
    const y = 0.42 + s * 0.55;
    bcG.add(mesh(BOX(0.32, 0.05, 0.88), M(0xb57f45), 0.02, y - 0.2, 0));
    for (let b = 0; b < 4; b++) bcG.add(mesh(BOX(0.2, 0.3 + ((b + s) % 3) * 0.05, 0.13), M(bcCols[(b + s * 2) % 6]), 0.03, y, -0.38 + b * 0.24));
  }
  scene.add(bcG);

  /* ---------- plant ---------- */
  const plantG = new THREE.Group();
  plantG.position.set(-2.7, 0, 0.9);
  plantG.add(mesh(CYL(0.17, 0.13, 0.3, 16), M(0xe07a3f), 0, 0.15, 0));
  plantG.add(mesh(CYL(0.15, 0.15, 0.04, 16), M(0x5f3d22), 0, 0.3, 0, false));
  R.leaves = new THREE.Group();
  R.leaves.position.y = 0.3;
  const leafMat = M(0x4e9e5f), leafMat2 = M(0x6fbf7f);
  [[0, 0.35, 0, 0, 0.16], [-0.14, 0.28, 0.05, 0, 0.13], [0.14, 0.28, -0.05, 0, 0.13], [0.03, 0.3, 0.14, 0.5, 0.12], [-0.03, 0.3, -0.14, -0.5, 0.12]].forEach(([x, y, z, rz, r], i) => {
    const leaf = mesh(SPH(r, 12, 10), i % 2 ? leafMat2 : leafMat, x, y, z);
    leaf.scale.set(0.55, 1.5, 0.55);
    leaf.rotation.z = rz + (x ? -x * 1.2 : 0);
    leaf.rotation.x = z ? z * 1.5 : 0;
    R.leaves.add(leaf);
  });
  plantG.add(R.leaves);
  scene.add(plantG);

  /* ---------- backpack + door ---------- */
  const bpG = new THREE.Group();
  bpG.position.set(2.55, 0, -0.95);
  bpG.rotation.y = -0.4;
  bpG.add(mesh(BOX(0.34, 0.46, 0.24), M(0x7a86e0, 0.85), 0, 0.23, 0));
  bpG.add(mesh(BOX(0.22, 0.2, 0.06), M(0x5f68c4, 0.85), 0, 0.16, 0.13));
  scene.add(bpG);
  const doorG = new THREE.Group();
  doorG.position.set(3.15, 0, -3.2);
  doorG.add(mesh(BOX(1.1, 2.3, 0.08), M(0xfff8ec, 0.85), 0, 1.15, 0.02));
  doorG.add(mesh(BOX(0.92, 2.14, 0.1), M(0xc98d4e, 0.85), 0, 1.07, 0.03));
  doorG.add(mesh(BOX(0.6, 0.7, 0.11), M(0xb57f45, 0.85), 0, 1.6, 0.03));
  const knob = mesh(SPH(0.045, 12, 10), M(0xf5b942, 0.4), -0.32, 1.05, 0.1);
  doorG.add(knob);
  scene.add(doorG);

  /* ---------- dust motes ---------- */
  {
    const n = 36;
    R.dustPos = new Float32Array(n * 3);
    R.dustSeed = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      R.dustPos[i * 3] = -3.5 + Math.random() * 6.5;
      R.dustPos[i * 3 + 1] = 0.4 + Math.random() * 2.4;
      R.dustPos[i * 3 + 2] = -2.5 + Math.random() * 4.5;
      R.dustSeed[i * 2] = Math.random() * Math.PI * 2;
      R.dustSeed[i * 2 + 1] = 0.3 + Math.random() * 0.7;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(R.dustPos, 3));
    R.dust = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.035, map: softTex, transparent: true, opacity: 0.55, depthWrite: false, color: 0xfff6e0 }));
    R.dust.frustumCulled = false;
    scene.add(R.dust);
  }

  /* ====================================================================
     CHARACTER RIG (procedural chibi — built twice, once per buddy)
  ==================================================================== */
  const charMatCache = new Map();
  function CM(color, rough = 0.9) {
    const k = color + "|" + rough;
    if (!charMatCache.has(k)) charMatCache.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 }));
    return charMatCache.get(k);
  }
  function buildCharacter(id) {
    const S = STYLE[id];
    const skin = CM(S.skin, 0.75), hairM = CM(S.hair, 0.85);
    const topM = CM(S.top, 0.9), botM = CM(S.bottom, 0.9), shoeM = CM(S.shoe, 0.8);
    const white = CM(0xffffff, 0.5), dark = CM(0x33313b, 0.5);
    const root = new THREE.Group();
    const body = new THREE.Group();
    body.position.y = 0;
    root.add(body);
    const rig = { id, root, body, mats: [] };

    // legs
    rig.legL = new THREE.Group(); rig.legR = new THREE.Group();
    rig.legL.position.set(-0.115, 0.32, 0); rig.legR.position.set(0.115, 0.32, 0);
    [rig.legL, rig.legR].forEach((leg) => {
      leg.add(mesh(CAP(0.068, 0.14), botM, 0, -0.1, 0));
      const shoe = mesh(SPH(0.085, 14, 12), shoeM, 0, -0.245, 0.03);
      shoe.scale.set(1, 0.7, 1.25);
      leg.add(shoe);
      body.add(leg);
    });
    // torso
    rig.torso = new THREE.Group();
    rig.torso.position.y = 0.32;
    body.add(rig.torso);
    rig.torsoMesh = mesh(CAP(0.185, 0.2), topM, 0, 0.16, 0);
    rig.torsoMesh.scale.set(1, 1, 0.88);
    rig.torso.add(rig.torsoMesh);
    rig.torso.add(mesh(BOX(0.16, 0.1, 0.04), CM(S.top2, 0.9), 0, 0.06, 0.155));
    if (id === "momo") {
      [-0.085, 0.085].forEach((x) => {
        rig.torso.add(mesh(BOX(0.055, 0.26, 0.025), botM, x, 0.22, 0.15));
        const b = mesh(CYL(0.018, 0.018, 0.02, 10), CM(0xffd23f, 0.5), x, 0.11, 0.165);
        b.rotation.x = Math.PI / 2;
        rig.torso.add(b);
      });
    }
    // arms
    function arm(side) {
      const g = new THREE.Group();
      g.position.set(0.235 * side, 0.32, 0);
      g.add(mesh(CAP(0.058, 0.16), topM, 0, -0.11, 0));
      g.add(mesh(SPH(0.072, 14, 12), skin, 0, -0.24, 0));
      body.add(g);
      return g;
    }
    rig.armL = arm(-1); rig.armR = arm(1);
    // head
    rig.head = new THREE.Group();
    rig.head.position.y = 0.78;
    body.add(rig.head);
    rig.head.add(mesh(SPH(0.29, 26, 20), skin, 0, 0.26, 0));
    rig.head.add(mesh(SPH(0.06, 12, 10), skin, -0.28, 0.24, 0));
    rig.head.add(mesh(SPH(0.06, 12, 10), skin, 0.28, 0.24, 0));
    // hair
    if (id === "milo") {
      const cap = mesh(SPH(0.3, 24, 18), hairM, 0, 0.36, -0.03);
      cap.scale.set(1.03, 0.82, 1.03);
      rig.head.add(cap);
      for (let i = -2; i <= 2; i++) rig.head.add(mesh(SPH(0.068, 12, 10), hairM, i * 0.08, 0.44 - Math.abs(i) * 0.012, 0.235));
      rig.head.add(mesh(SPH(0.095, 14, 12), hairM, -0.27, 0.28, 0));
      rig.head.add(mesh(SPH(0.095, 14, 12), hairM, 0.27, 0.28, 0));
      const curl = mesh(new THREE.TorusGeometry(0.045, 0.016, 8, 16, Math.PI * 1.4), hairM, 0.1, 0.62, 0.05, false);
      curl.rotation.set(0.6, 0, -0.6);
      rig.head.add(curl);
    } else {
      [[-0.2, 0.52, 0], [0, 0.58, -0.02], [0.2, 0.52, 0]].forEach(([x, y, z]) => rig.head.add(mesh(SPH(0.2, 20, 16), hairM, x, y, z)));
      rig.head.add(mesh(SPH(0.23, 20, 16), hairM, 0, 0.34, -0.13));
      const shape = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 0.022 : 0.05, a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        i ? shape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      const star = mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.025, bevelEnabled: false }), CM(0xffd23f, 0.5), 0.24, 0.5, 0.08, false);
      star.rotation.set(-0.15, 0.5, 0.15);
      rig.head.add(star);
    }
    // face
    rig.browL = mesh(BOX(0.09, 0.018, 0.02), CM(S.brow, 0.7), -0.105, 0.4, 0.25, false);
    rig.browR = mesh(BOX(0.09, 0.018, 0.02), CM(S.brow, 0.7), 0.105, 0.4, 0.25, false);
    rig.browL.rotation.z = 0.06; rig.browR.rotation.z = -0.06;
    rig.head.add(rig.browL, rig.browR);
    function eye(x) {
      const g = new THREE.Group();
      g.position.set(x, 0.3, 0.245);
      g.add(mesh(SPH(0.055, 14, 12), white, 0, 0, 0, false));
      const pg = new THREE.Group();
      pg.add(mesh(SPH(0.024, 10, 8), dark, 0, 0.002, 0.038, false));
      pg.add(mesh(SPH(0.009, 8, 6), white, 0.01, 0.012, 0.055, false));
      g.add(pg);
      rig.head.add(g);
      return { g, pg };
    }
    rig.eyeL = eye(-0.105); rig.eyeR = eye(0.105);
    function happyEye(x) {
      const e = mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 14, Math.PI), dark, x, 0.3, 0.25, false);
      e.visible = false;
      rig.head.add(e);
      return e;
    }
    rig.happyL = happyEye(-0.105); rig.happyR = happyEye(0.105);
    const blushM = new THREE.MeshStandardMaterial({ color: S.blush, roughness: 0.9, transparent: true, opacity: 0.75 });
    rig.blushL = mesh(SPH(0.045, 12, 10), blushM, -0.17, 0.22, 0.21, false);
    rig.blushR = mesh(SPH(0.045, 12, 10), blushM, 0.17, 0.22, 0.21, false);
    rig.blushL.scale.set(1, 0.62, 0.35); rig.blushR.scale.set(1, 0.62, 0.35);
    rig.head.add(rig.blushL, rig.blushR);
    if (S.freckles) {
      const fM = CM(0xc98f5f, 0.8);
      [[-0.15, 0.2, 0.235], [-0.1, 0.185, 0.245], [-0.15, 0.165, 0.24], [0.15, 0.2, 0.235], [0.1, 0.185, 0.245], [0.15, 0.165, 0.24]].forEach(([x, y, z]) => rig.head.add(mesh(SPH(0.008, 6, 6), fM, x, y, z, false)));
    }
    const mouthM = CM(0x7a4b3a, 0.7), mouthFill = CM(0x7c4038, 0.8);
    rig.mSmile = mesh(new THREE.TorusGeometry(0.05, 0.011, 8, 16, Math.PI), mouthM, 0, 0.165, 0.262, false);
    rig.mSmile.rotation.z = Math.PI;
    rig.mGrin = mesh(SPH(0.05, 14, 12), mouthFill, 0, 0.155, 0.255, false);
    rig.mGrin.scale.set(1, 0.7, 0.4);
    rig.mOpen = mesh(SPH(0.045, 14, 12), mouthFill, 0, 0.15, 0.255, false);
    rig.mOpen.scale.set(1, 1.3, 0.5);
    rig.mFlat = mesh(BOX(0.07, 0.012, 0.015), mouthM, 0, 0.16, 0.262, false);
    rig.mGrin.visible = rig.mOpen.visible = rig.mFlat.visible = false;
    rig.head.add(rig.mSmile, rig.mGrin, rig.mOpen, rig.mFlat);
    // headphones
    rig.phones = new THREE.Group();
    const band = mesh(new THREE.TorusGeometry(0.315, 0.032, 10, 22, Math.PI), CM(0x4a5568, 0.6), 0, 0.28, 0);
    rig.phones.add(band);
    [-0.3, 0.3].forEach((x) => {
      const pad = mesh(CYL(0.07, 0.07, 0.07, 14), CM(0x4a5568, 0.6), x, 0.26, 0);
      pad.rotation.z = Math.PI / 2;
      rig.phones.add(pad);
    });
    rig.phones.visible = false;
    rig.head.add(rig.phones);
    // props
    rig.pencil = new THREE.Group();
    rig.pencil.add(mesh(CYL(0.012, 0.012, 0.16, 8), CM(0xf5b942, 0.6), 0, 0, 0, false));
    const tip = mesh(new THREE.ConeGeometry(0.012, 0.035, 8), CM(0xe07a3f, 0.6), 0, -0.097, 0, false);
    tip.rotation.x = Math.PI;
    rig.pencil.add(tip);
    rig.pencil.position.set(0, -0.26, 0.05);
    rig.pencil.rotation.x = 0.5;
    rig.pencil.visible = false;
    rig.armR.add(rig.pencil);
    rig.book = new THREE.Group();
    const covM = CM(S.accent, 0.8), pgM = CM(0xfff7e6, 0.9);
    const pl = mesh(BOX(0.16, 0.2, 0.025), pgM, -0.075, 0, 0, false);
    const pr = mesh(BOX(0.16, 0.2, 0.025), pgM, 0.075, 0, 0, false);
    pl.rotation.y = 0.35; pr.rotation.y = -0.35;
    const cl = mesh(BOX(0.17, 0.21, 0.012), covM, -0.082, 0, -0.016, false);
    const cr = mesh(BOX(0.17, 0.21, 0.012), covM, 0.082, 0, -0.016, false);
    cl.rotation.y = 0.35; cr.rotation.y = -0.35;
    rig.book.add(pl, pr, cl, cr);
    rig.book.position.set(0, 0.62, 0.3);
    rig.book.rotation.x = -0.25;
    rig.book.visible = false;
    body.add(rig.book);
    rig.cup = new THREE.Group();
    rig.cup.add(mesh(CYL(0.05, 0.042, 0.09, 14), CM(S.cup, 0.7), 0, 0, 0, false));
    const handle = mesh(new THREE.TorusGeometry(0.028, 0.009, 8, 14, Math.PI * 1.5), CM(S.cup, 0.7), 0.05, 0, 0, false);
    handle.rotation.z = -0.6;
    rig.cup.add(handle);
    rig.cup.position.set(0.1, 0.86, 0.3);
    rig.cup.rotation.x = -0.35;
    rig.cup.visible = false;
    body.add(rig.cup);
    const cupSteam = addSteam(0, 0, 0, 0.8);
    cupSteam.position.set(0, 0, 0);
    rig.cup.add(cupSteam);
    cupSteam.position.set(0, 0.06, 0);
    rig.phone = new THREE.Group();
    rig.phone.add(mesh(BOX(0.07, 0.13, 0.018), CM(0x3a3f4b, 0.5), 0, 0, 0, false));
    const phScr = new THREE.Mesh(new THREE.PlaneGeometry(0.055, 0.1), new THREE.MeshBasicMaterial({ color: 0x7fd3c6 }));
    phScr.position.z = 0.01;
    rig.phone.add(phScr);
    rig.phone.position.set(0.02, -0.24, 0.03);
    rig.phone.rotation.set(-0.4, 0, -0.5);
    rig.phone.visible = false;
    rig.armR.add(rig.phone);
    rig.can = new THREE.Group();
    rig.can.add(mesh(CYL(0.055, 0.065, 0.12, 14), CM(0x7fb069, 0.8), 0, 0, 0, false));
    const spout = mesh(CYL(0.014, 0.02, 0.16, 8), CM(0x5f8f4f, 0.8), -0.09, 0.03, 0, false);
    spout.rotation.z = 1.1;
    rig.can.add(spout);
    rig.drops = [];
    for (let i = 0; i < 3; i++) {
      const d = mesh(SPH(0.014, 8, 6), new THREE.MeshBasicMaterial({ color: 0x7fc8f0 }), -0.16, -0.02, 0, false);
      d.userData.off = i / 3;
      rig.can.add(d); rig.drops.push(d);
    }
    rig.can.position.set(0, -0.28, 0.06);
    rig.can.rotation.x = 0.3;
    rig.can.visible = false;
    rig.armR.add(rig.can);
    // collect fade materials (skip sprites)
    const seen = new Set();
    root.traverse((o) => {
      if (o.isMesh && o.material && !seen.has(o.material)) {
        seen.add(o.material);
        rig.mats.push({ m: o.material, t: o.material.transparent, o: o.material.opacity, d: o.material.depthWrite });
      }
    });
    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
    rig.root.visible = false;
    scene.add(root);
    return rig;
  }
  const rigs = { milo: buildCharacter("milo"), momo: buildCharacter("momo") };

  /* ---------- state ---------- */
  const st = {
    char: "milo", pose: "write", expr: "focused", spot: "desk",
    reduced: false, rainOn: false,
    time: "afternoon",
    path: [], moving: false, yaw: SPOTS.desk.yaw,
    sit: 0.42, fade: 1, fadeTarget: 1, fadeAfter: false,
    blinkT: 2, blinkOn: 0, walkPh: 0, t: 0,
    jA: { L: [0, 0, 0], R: [0, 0, 0], H: [0, 0, 0] }, // actual joint angles
  };
  const rig = () => rigs[st.char];
  rigs.milo.root.visible = true;
  rigs.milo.root.position.set(...SPOTS.desk.p);
  rigs.milo.root.rotation.y = st.yaw;
  rigs.momo.root.position.set(...SPOTS.desk.p);
  rigs.momo.root.rotation.y = st.yaw;
  // environment lerp state
  const env = {
    sky: new THREE.Color(0x5eb9ff), sun: new THREE.Color(0xffffff), dir: new THREE.Color(0xffffff), di: 1.3,
    hs: new THREE.Color(0xcfe6ff), hg: new THREE.Color(0xcaa26b), hi: 0.9,
    lamp: 0, moon: 0, stars: 0, sunY: 2.9, rain: 0,
  };
  const _c1 = new THREE.Color(), _c2 = new THREE.Color();

  /* ---------- API ---------- */
  function setPose(pose, expr) {
    if (POSES[pose]) st.pose = pose;
    if (expr) st.expr = expr;
    const r = rig();
    const P = POSES[st.pose];
    r.pencil.visible = !!P.pencil;
    r.book.visible = !!P.book;
    r.cup.visible = !!P.cup;
    r.phone.visible = !!P.phone;
    r.can.visible = !!P.can;
    r.phones.visible = !!P.phones || st.pose === "music";
  }
  function setSpot(spot) {
    if (spot === "off") {
      st.fadeAfter = true;
      queuePath(SPOTS.door.p, st.spot);
      st.spot = "door";
      return;
    }
    st.fadeAfter = false;
    st.fadeTarget = 1;
    setFade(true);
    const from = st.spot;
    st.spot = SPOTS[spot] ? spot : "center";
    queuePath(SPOTS[st.spot].p, from);
  }
  function queuePath(target, from) {
    const cur = rig().root.position;
    const d = Math.hypot(target[0] - cur.x, target[2] - cur.z);
    const needsVia = d > 1.5 && (from === "desk" || from === "bed" || from === "door" || target === SPOTS.desk.p || target === SPOTS.bed.p || target === SPOTS.door.p);
    st.path = needsVia ? [VIA.slice(), target.slice()] : [target.slice()];
  }
  function setFade(fading) {
    const r = rig();
    r.mats.forEach(({ m }) => { m.transparent = fading ? true : m.transparent; if (fading) m.depthWrite = false; });
  }
  function setCharacter(id) {
    if (!rigs[id] || st.char === id) return;
    const old = rig();
    old.root.visible = false;
    st.char = id;
    const r = rig();
    r.root.position.copy(old.root.position);
    r.root.rotation.y = old.root.rotation.y;
    r.root.visible = st.fade > 0.02;
    r.mats.forEach(({ m, t, o, d }) => { m.transparent = t; m.opacity = o; m.depthWrite = d; });
    old.mats.forEach(({ m, t, o, d }) => { m.transparent = t; m.opacity = o; m.depthWrite = d; });
    st.fade = st.fadeTarget = 1;
    R.poster.material = id === "momo" ? R.posterMomo : R.posterMilo;
    R.deskCupMat.color.set(id === "momo" ? 0x2fa39a : 0xe07a3f);
    setPose(st.pose, st.expr);
  }
  function setTimeOfDay(t) {
    if (!TIMES[t]) return;
    st.time = t;
    if (!st.envSnap) {
      st.envSnap = true;
      const T = TIMES[t];
      env.sky.set(T.sky); env.sun.set(T.sun); env.dir.set(T.dir); env.di = T.di;
      env.hs.set(T.hs); env.hg.set(T.hg); env.hi = T.hi;
      env.lamp = T.lamp; env.moon = T.moon; env.stars = T.stars; env.sunY = T.sunY;
      env.rain = st.rainOn ? 1 : 0;
    }
  }
  function setRain(on) { st.rainOn = !!on; }
  function setReduced(on) { st.reduced = !!on; }

  /* ---------- resize ---------- */
  function resize() {
    const w = room.clientWidth || 800, h = room.clientHeight || 500;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.aspect = aspect;
    if (aspect >= 1.4) { camera.fov = 40; st.dolly = 1; }
    else { camera.fov = 40 + (1.4 - aspect) * 30; st.dolly = 1 + (1.4 - aspect) * 0.6; }
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(room);
  resize();

  /* ---------- overlay anchoring ---------- */
  const _v = new THREE.Vector3();
  function anchor(el, dx, dy) {
    if (!el || el.hidden) return;
    const r = rig();
    r.head.getWorldPosition(_v);
    _v.y += 0.42;
    _v.project(camera);
    const w = room.clientWidth, h = room.clientHeight;
    el.style.left = ((_v.x * 0.5 + 0.5) * w + dx) + "px";
    el.style.top = ((-_v.y * 0.5 + 0.5) * h + dy) + "px";
  }

  /* ---------- main loop ---------- */
  const clock = new THREE.Clock();
  let steamT = 0;
  function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.25);
    st.t += dt;
    const t = st.t, r = rig(), P = POSES[st.pose];
    const kFast = 1 - Math.exp(-8 * dt), kSoft = 1 - Math.exp(-5 * dt);

    /* locomotion */
    const rp = r.root.position;
    st.moving = st.path.length > 0;
    if (st.moving) {
      const tgt = st.path[0];
      const dx = tgt[0] - rp.x, dz = tgt[2] - rp.z;
      const d = Math.hypot(dx, dz);
      const sp = 1.25 * (d < 0.5 ? 0.35 + 0.65 * (d / 0.5) : 1);
      const step = Math.min(d, sp * dt);
      rp.x += (dx / (d || 1)) * step;
      rp.z += (dz / (d || 1)) * step;
      const wantYaw = Math.atan2(dx, dz);
      st.yaw += wrapAngle(wantYaw - st.yaw) * (1 - Math.exp(-7 * dt));
      st.walkPh += dt * 9 * (sp / 1.25);
      if (d < 0.07) {
        st.path.shift();
        if (!st.path.length && st.fadeAfter) { st.fadeTarget = 0; setFade(true); }
      }
    } else {
      const spotYaw = SPOTS[st.spot] ? SPOTS[st.spot].yaw : 0.3;
      st.yaw += wrapAngle(spotYaw - st.yaw) * (1 - Math.exp(-5 * dt));
      if (st.pose === "walk") st.walkPh += dt * 9; // march in place
    }
    r.root.rotation.y = st.yaw;
    const arrived = !st.moving;
    const sitTarget = arrived && SPOTS[st.spot] ? SPOTS[st.spot].sit : 0;
    st.sit = damp(st.sit, sitTarget, 5, dt);
    const sitB = clamp(st.sit / 0.35, 0, 1);

    /* fade */
    st.fade = damp(st.fade, st.fadeTarget, 3.5, dt);
    if (Math.abs(st.fade - st.fadeTarget) < 0.01) st.fade = st.fadeTarget;
    r.root.visible = st.fade > 0.02;
    if (st.fade < 1) r.mats.forEach(({ m, o }) => { m.opacity = o * st.fade; });
    else if (st.fadeTarget === 1) r.mats.forEach(({ m, t, o, d }) => { if (m.opacity !== o || m.transparent !== t || m.depthWrite !== d) { m.opacity = o; m.transparent = t; m.depthWrite = d; } });
    room.dataset.faded = st.fade < 0.5 ? "true" : "false";

    /* joints → damped toward pose */
    const J = st.jA;
    ["L", "R"].forEach((s) => {
      const key = s === "L" ? "aL" : "aR";
      for (let i = 0; i < 3; i++) J[s][i] = damp(J[s][i], P[key][i], 8, dt);
    });
    for (let i = 0; i < 3; i++) J.H[i] = damp(J.H[i], P.head[i], 7, dt);
    const lean = damp(r.torso.rotation.x, P.lean, 7, dt);
    r.torso.rotation.x = lean;
    // secondary motion
    const sec = st.reduced ? 0 : 1;
    let armSwingL = 0, armSwingR = 0, headEx = [0, 0, 0], jumpY = 0, bobY = 0;
    if (st.moving) {
      const s = Math.sin(st.walkPh);
      armSwingL = s * 0.35; armSwingR = -s * 0.35;
      bobY = Math.abs(Math.cos(st.walkPh)) * 0.03 * sec;
    }
    if (st.pose === "type" && sec) { armSwingL = Math.sin(t * 19) * 0.05; armSwingR = Math.sin(t * 19 + Math.PI) * 0.05; }
    if (st.pose === "write" && sec) { armSwingR = Math.sin(t * 9) * 0.05; headEx[1] = Math.sin(t * 9) * 0.02; }
    if (st.pose === "read" && sec) { headEx[1] = Math.sin(t * 0.9) * 0.06; }
    if (st.pose === "music" && sec) {
      headEx[2] = Math.sin(t * 12) * 0.14; headEx[0] = Math.abs(Math.sin(t * 6)) * -0.06;
      r.body.rotation.z = Math.sin(t * 6) * 0.03;
    } else r.body.rotation.z = damp(r.body.rotation.z, 0, 6, dt);
    if (st.pose === "look" && sec) { headEx[1] = Math.sin(t * 0.9) * 0.55; headEx[0] = Math.sin(t * 1.7) * 0.12; }
    if (st.pose === "drink" && sec) { J.R[0] += Math.sin(t * 7) * 0.03; }
    if (st.pose === "celebrate" && sec) {
      jumpY = Math.abs(Math.sin(t * 6.5)) * 0.2;
      headEx[2] = Math.sin(t * 6.5) * 0.08;
    }
    let jackA = 0, jackL = 0;
    if (st.pose === "exercise" && sec) {
      jackA = (Math.sin(t * 10) * 0.5 + 0.5); // 0..1
      jumpY = Math.abs(Math.sin(t * 10)) * 0.06;
    }
    r.armL.rotation.set(J.L[0] + armSwingL - jackA * 2.2, J.L[1], J.L[2] + jackA * 0.15);
    r.armR.rotation.set(J.R[0] + armSwingR - jackA * 2.2, J.R[1], J.R[2] - jackA * 0.15);
    r.head.rotation.set(J.H[0] + headEx[0], J.H[1] + headEx[1], J.H[2] + headEx[2]);
    // legs
    let thL = 0, thR = 0, legZL = 0, legZR = 0;
    if (st.moving || st.pose === "walk") { const s = Math.sin(st.walkPh); thL = s * 0.55; thR = -s * 0.55; }
    if (st.pose === "exercise" && sec) { legZL = jackA * 0.3; legZR = -jackA * 0.3; }
    const sitTh = -1.35 * sitB;
    r.legL.rotation.x = damp(r.legL.rotation.x, sitTh + thL * (1 - sitB), 8, dt);
    r.legR.rotation.x = damp(r.legR.rotation.x, sitTh + thR * (1 - sitB), 8, dt);
    r.legL.rotation.z = damp(r.legL.rotation.z, legZL, 8, dt);
    r.legR.rotation.z = damp(r.legR.rotation.z, legZR, 8, dt);
    // body height + breathing
    const breathe = sec ? Math.sin(t * Math.PI * 2 * 0.25) : 0;
    r.body.position.y = st.sit + jumpY + bobY + breathe * 0.006;
    const stretchS = st.pose === "stretch" ? 1.06 : 1;
    r.torso.scale.set(1, stretchS + breathe * 0.008, 0.88);
    // exercise can tilt + drops
    if (r.can.visible && sec) {
      r.can.rotation.z = Math.sin(t * 3.5) * 0.18;
      r.drops.forEach((d) => {
        const ph = (t * 1.4 + d.userData.off) % 1;
        d.position.y = -0.02 - ph * 0.22;
        d.visible = ph < 0.9;
      });
    }

    /* expression */
    const forcedHappy = st.pose === "music" || st.pose === "celebrate";
    const closed = st.pose === "stretch" || st.pose === "yawn" || st.pose === "rest";
    const expr = forcedHappy ? "happy" : st.expr;
    const happy = expr === "happy";
    r.eyeL.g.visible = r.eyeR.g.visible = !happy;
    r.happyL.visible = r.happyR.visible = happy;
    // blink
    st.blinkT -= dt;
    if (st.blinkT <= 0 && !st.reduced && !happy && !closed) { st.blinkOn = 0.12; st.blinkT = 2.2 + Math.random() * 3.2; }
    if (st.blinkOn > 0) st.blinkOn -= dt;
    let lid = 1;
    if (closed || expr === "sleepy") lid = 0.08;
    else if (expr === "tired") lid = 0.5 + Math.sin(t * 1.2) * 0.08;
    if (st.blinkOn > 0) lid = 0.08;
    r.eyeL.g.scale.y = r.eyeR.g.scale.y = lid;
    const pup = expr === "surprised" ? 1.35 : 1;
    r.eyeL.pg.scale.set(pup, pup, pup); r.eyeR.pg.scale.set(pup, pup, pup);
    const browY = expr === "surprised" ? 0.025 : expr === "focused" ? -0.008 : 0;
    r.browL.position.y = 0.4 + browY; r.browR.position.y = 0.4 + browY;
    r.mSmile.visible = !happy && expr !== "sleepy" && expr !== "tired" && !closed && expr !== "surprised";
    r.mGrin.visible = happy;
    r.mOpen.visible = expr === "surprised" || st.pose === "stretch" || st.pose === "yawn";
    r.mFlat.visible = !r.mSmile.visible && !r.mGrin.visible && !r.mOpen.visible;
    const blushS = happy ? 1.25 : 1;
    r.blushL.scale.set(blushS, 0.62 * blushS, 0.35); r.blushR.scale.set(blushS, 0.62 * blushS, 0.35);

    /* environment → time of day */
    const T = TIMES[st.time];
    const ek = 1 - Math.exp(-2 * dt);
    env.sky.lerp(_c1.set(T.sky), ek); env.sun.lerp(_c1.set(T.sun), ek);
    env.dir.lerp(_c1.set(T.dir), ek); env.di += (T.di - env.di) * ek;
    env.hs.lerp(_c1.set(T.hs), ek); env.hg.lerp(_c1.set(T.hg), ek); env.hi += (T.hi - env.hi) * ek;
    env.lamp += (T.lamp - env.lamp) * ek;
    env.moon += (T.moon - env.moon) * ek; env.stars += (T.stars - env.stars) * ek;
    env.sunY += (T.sunY - env.sunY) * ek;
    env.rain += ((st.rainOn ? 1 : 0) - env.rain) * ek;
    _c2.copy(env.sky).multiplyScalar(1 - 0.28 * env.rain);
    R.skyMat.color.copy(_c2);
    R.sunMat.color.copy(env.sun);
    R.sun.position.y = env.sunY;
    R.sunGlow.position.y = env.sunY;
    R.sunGlow.material.color.copy(env.sun);
    const dayF = 1 - env.moon;
    R.sun.visible = R.sunGlow.visible = dayF > 0.05;
    R.sunGlow.material.opacity = 0.9 * dayF * (1 - 0.5 * env.rain);
    R.moon.visible = R.moonGlow.visible = env.moon > 0.05;
    R.moonGlow.material.opacity = 0.8 * env.moon;
    R.stars.visible = env.stars > 0.03;
    R.starMat.opacity = env.stars * (1 - env.rain);
    dir.color.copy(env.dir).multiplyScalar(1 - 0.3 * env.rain);
    dir.intensity = env.di * (1 - 0.25 * env.rain);
    hemi.color.copy(env.hs); hemi.groundColor.copy(env.hg); hemi.intensity = env.hi;
    lampLight.intensity = env.lamp * 6;
    R.shadeMat.emissiveIntensity = env.lamp * 0.9;
    R.bulbMat.color.set(env.lamp > 0.15 ? 0xffe9b0 : 0x9a938a);
    // rain
    R.rain.visible = env.rain > 0.03;
    if (R.rain.visible && !st.reduced) {
      const p = R.rainPos;
      for (let i = 0; i < p.length; i += 3) {
        p[i + 1] -= dt * 5.5;
        if (p[i + 1] < 0.9) p[i + 1] += 2.2;
      }
      R.rain.geometry.attributes.position.needsUpdate = true;
      R.rain.material.opacity = 0.85 * env.rain;
    }
    // dust
    if (!st.reduced) {
      const p = R.dustPos, s = R.dustSeed;
      for (let i = 0; i < s.length / 2; i++) {
        p[i * 3] += Math.sin(t * 0.4 * s[i * 2 + 1] + s[i * 2]) * dt * 0.05;
        p[i * 3 + 1] += Math.cos(t * 0.3 * s[i * 2 + 1] + s[i * 2]) * dt * 0.04;
      }
      R.dust.geometry.attributes.position.needsUpdate = true;
    }
    // leaves sway
    if (!st.reduced) R.leaves.rotation.z = Math.sin(t * 1.1) * 0.03;
    // steam
    steamT += dt;
    R.steams.forEach((sp) => {
      const ph = (steamT * 0.45 + sp.userData.off) % 1;
      const parentVisible = sp.parent.parent.visible !== false;
      sp.material.opacity = parentVisible ? Math.sin(ph * Math.PI) * 0.75 : 0;
      sp.position.y = ph * 0.22;
      sp.position.x = Math.sin(ph * 5 + sp.userData.off * 9) * 0.02;
    });
    // clock hands (real time)
    const now = new Date();
    R.minH.rotation.z = -((now.getMinutes() + now.getSeconds() / 60) / 60) * Math.PI * 2;
    R.hourH.rotation.z = -(((now.getHours() % 12) + now.getMinutes() / 60) / 12) * Math.PI * 2;
    // laptop shimmer
    R.lapScreenMat.emissiveIntensity = 0.9 + Math.sin(t * 2.3) * 0.06;

    /* camera (gentle sway unless reduced) */
    const dolly = st.dolly || 1;
    const sway = st.reduced ? 0 : 1;
    camera.position.set(
      CAM_P.x * dolly + Math.sin(t * 0.25) * 0.06 * sway,
      CAM_P.y + Math.sin(t * 0.31) * 0.04 * sway,
      CAM_T.z + (CAM_P.z - CAM_T.z) * dolly
    );
    camera.lookAt(CAM_T);

    /* overlays follow the head */
    anchor(bubble, 30, -10);
    anchor(zzz, 40, -6);
    anchor(notes, -50, 0);

    renderer.render(scene, camera);
  }
  tick();

  return {
    setPose, setSpot, setCharacter, setTimeOfDay, setRain, setReduced,
    get currentSpot() { return st.spot; },
    get isMoving() { return st.moving; },
    get debugPos() { const q = rig().root.position; return [+q.x.toFixed(2), +q.z.toFixed(2)]; },
    get debugEnv() { return { rainOn: st.rainOn, rain: +env.rain.toFixed(3), vis: R.rain.visible, op: +R.rain.material.opacity.toFixed(3), moon: +env.moon.toFixed(3), n: R.rain.geometry.attributes.position.count }; },
  };
}
