import {
  ACESFilmicToneMapping, DirectionalLight, Fog, HemisphereLight, PerspectiveCamera,
  PMREMGenerator, Raycaster, SRGBColorSpace, Scene, Vector2, WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createCup } from './cup.js';
import { createBeans } from './beans.js';
import { createMoods } from './moods.js';

/*
  Brewbery 3D background.
  A fixed, transparent canvas behind the whole site: a latte cup in the hero,
  a drifting field of coffee beans that the camera descends through as you scroll,
  and lighting moods that follow the section in view (window 'brew:scene').
*/

const FOV = 35;
const CAM_Z = 8;
const WORLD_PER_VIEWPORT = 3.0; // camera descent (world units) per viewport of page scroll
const CUP_EXIT = [0.35, 0.9]; // cup leaves between these scroll positions (in viewport heights)
const SLOW_FRAME_MS = 22;
const SAMPLE_FRAMES = 60;
const MIN_PIXEL_RATIO = 0.75;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

function readEnvironment() {
  const dpr = window.devicePixelRatio || 1;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const mobile = coarse || window.innerWidth < 760;
  const lowEnd = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  return {
    dpr, coarse, mobile, lowEnd,
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    pixelRatio: Math.min(dpr, mobile ? 1.25 : 1.75),
  };
}

function createRenderer(env) {
  const renderer = new WebGLRenderer({ antialias: env.dpr < 2, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0); // transparent: the CSS fallback gradient glows through
  renderer.setPixelRatio(env.pixelRatio);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = false;
  return renderer;
}

function addEnvironment(renderer, scene) {
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = 0.55;
  room.dispose();
  pmrem.dispose();
}

function addLights(scene) {
  const keyLight = new DirectionalLight('#ffd8ad', 2.4);
  keyLight.position.set(4, 6, 5);
  const rimLight = new DirectionalLight('#c8945a', 3.2);
  rimLight.position.set(-5, 2.5, -4);
  const hemi = new HemisphereLight('#f2d2ac', '#1a0f0a', 0.55);
  // directional lights aim at their target; parent everything to the camera rig via the scene
  scene.add(keyLight, keyLight.target, rimLight, rimLight.target, hemi);
  return { keyLight, rimLight, hemi };
}

// Give the main thread back between heavy setup steps so no single task blocks input for long.
const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

async function buildWorld(renderer, env) {
  const scene = new Scene();
  scene.fog = new Fog('#0e0907', 7, 24);
  const camera = new PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.1, 40);
  camera.position.set(0, 0, CAM_Z);
  addEnvironment(renderer, scene);
  await yieldToMain();
  const lights = addLights(scene);
  const cup = createCup({ maxAnisotropy: renderer.capabilities.getMaxAnisotropy() });
  await yieldToMain();
  const beans = createBeans(env.lowEnd ? 30 : env.mobile ? 32 : 70);
  scene.add(cup.object, beans.mesh);
  const moods = createMoods({ ...lights, beanMaterial: beans.material, fog: scene.fog });
  return { scene, camera, lights, cup, beans, moods };
}

// Shared mutable input state, written by passive listeners and read by the frame loop.
function createInput(env, signal) {
  const input = {
    tx: 0, ty: 0, px: 0, py: 0, lastMove: -1e9,
    scroll: window.scrollY, prevScroll: window.scrollY, spin: 0, repel: 0,
    vh: window.innerHeight,
  };
  window.addEventListener('pointermove', (e) => {
    input.tx = (e.clientX / window.innerWidth) * 2 - 1;
    input.ty = -(e.clientY / window.innerHeight) * 2 + 1;
    input.lastMove = performance.now();
  }, { passive: true, signal });
  if (env.reduced) input.lastMove = -1e9;
  return input;
}

// Damp pointer and scroll, derive scroll velocity spin and repel strength.
function stepInput(input, dt, now) {
  const kp = 1 - Math.exp(-dt * 3.5);
  input.px += (input.tx - input.px) * kp;
  input.py += (input.ty - input.py) * kp;
  const ks = 1 - Math.exp(-dt * 6);
  input.prevScroll = input.scroll;
  input.scroll += (window.scrollY - input.scroll) * ks;
  const velocity = dt > 0 ? Math.abs(input.scroll - input.prevScroll) / dt : 0; // px per second
  const spinTarget = Math.min(4, velocity / 600);
  input.spin += (spinTarget - input.spin) * (1 - Math.exp(-dt * 4));
  const active = now - input.lastMove < 2500 ? 1 : 0;
  input.repel += (active - input.repel) * (1 - Math.exp(-dt * 3));
}

export async function start(hostEl) {
  if (!hostEl) return undefined;
  const env = readEnvironment();
  let renderer;
  try {
    renderer = createRenderer(env);
  } catch {
    return undefined; // no WebGL: the CSS gradient fallback stays
  }
  await yieldToMain();
  const world = await buildWorld(renderer, env);
  await yieldToMain();
  const listeners = new AbortController(); // one abort() removes every listener in stop()
  const input = createInput(env, listeners.signal);
  const runtime = createRuntime(hostEl, renderer, world, input, env, listeners);
  hostEl.appendChild(renderer.domElement);
  runtime.boot();
  return runtime.stop;
}

function createRuntime(hostEl, renderer, world, input, env, listeners) {
  const { scene, camera, cup, beans, moods } = world;
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const tanHalf = Math.tan((FOV * Math.PI) / 360);
  const quality = { sum: 0, n: 0, min: Infinity, pr: env.pixelRatio, lowered: 0 };
  let rafId = 0;
  let last = 0;
  let time = 0;
  let size = { w: 0, h: 0 };

  function applySize(force) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    // phones resize height when the URL bar slides; ignore small jumps to avoid buffer reallocations
    if (!force && w === size.w && Math.abs(h - size.h) < 140 && env.coarse) return;
    size = { w, h };
    input.vh = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    cup.setLayout(camera.aspect, CAM_Z * tanHalf * camera.aspect);
    beans.fitAspect(camera.aspect);
  }

  function step(dt, now) {
    stepInput(input, dt, now);
    const viewports = input.scroll / input.vh;
    const camY = env.reduced ? 0 : -viewports * WORLD_PER_VIEWPORT;
    camera.position.set(input.px * 0.22, camY + input.py * 0.12, CAM_Z);
    camera.lookAt(0, camY, 0);
    camera.updateMatrixWorld();
    ndc.set(input.tx, input.ty);
    raycaster.setFromCamera(ndc, camera);
    const exit = env.reduced ? (window.scrollY > input.vh * CUP_EXIT[1] ? 1 : 0) : smooth(CUP_EXIT[0], CUP_EXIT[1], viewports);
    // the cup lives at the top of the page, so it rides up with the camera descent
    cup.update({ time, dt, px: input.px, py: input.py, exit, reduced: env.reduced });
    beans.update({
      dt, time, camY, tanHalf, aspect: camera.aspect, camZ: CAM_Z,
      ray: raycaster.ray, repel: input.repel, spin: input.spin, reduced: env.reduced,
    });
    moods.update(dt, env.reduced);
  }

  // Adaptive quality: if the average frame is slow, drop resolution, then bean count.
  function sampleQuality(dtMs) {
    quality.sum += dtMs;
    quality.n += 1;
    quality.min = Math.min(quality.min, dtMs);
    if (quality.n < SAMPLE_FRAMES) return;
    const avg = quality.sum / quality.n;
    // every frame near 33ms means the browser caps rAF at 30Hz (iOS Low Power Mode,
    // battery saver): lowering resolution cannot help there, it would only blur the scene
    const capped30 = quality.min > 30 && avg < 36;
    quality.sum = 0;
    quality.n = 0;
    quality.min = Infinity;
    if (avg <= SLOW_FRAME_MS || capped30) return;
    if (quality.pr > MIN_PIXEL_RATIO) {
      quality.pr = Math.max(MIN_PIXEL_RATIO, quality.pr * 0.8);
      renderer.setPixelRatio(quality.pr);
    } else if (quality.lowered < 2) {
      quality.lowered += 1;
      beans.reduceCount(0.65);
    }
  }

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    // the first rAF timestamp can precede the performance.now() taken in play(): never go negative
    const dtMs = Math.min(100, Math.max(0, now - last));
    last = now;
    const dt = Math.min(0.05, dtMs / 1000);
    time += dt;
    step(dt, now);
    renderer.render(scene, camera);
    sampleQuality(dtMs);
  }

  function play() {
    if (rafId || env.reduced || document.hidden) return;
    last = performance.now();
    quality.sum = 0;
    quality.n = 0;
    quality.min = Infinity;
    rafId = requestAnimationFrame(frame);
  }

  function pause() {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function renderStatic() {
    step(0, performance.now());
    renderer.render(scene, camera);
  }

  return createLifecycle({
    hostEl, renderer, scene, camera, input, env, moods, listeners, applySize, renderStatic, play, pause,
  });
}

// The engine may have announced the current section before this module loaded.
function sceneInView() {
  const mid = window.innerHeight / 2;
  for (const el of document.querySelectorAll('[data-scene]')) {
    const r = el.getBoundingClientRect();
    if (r.top <= mid && r.bottom >= mid) return el.dataset.scene;
  }
  return 'hero';
}

// Free GPU buffers, textures and programs (renderer.dispose alone keeps geometry alive).
function disposeScene(scene) {
  const seen = new Set();
  const free = (res) => { if (res && !seen.has(res)) { seen.add(res); res.dispose(); } };
  scene.traverse((obj) => {
    free(obj.geometry);
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) { if (m) { free(m.map); free(m); } }
  });
  free(scene.environment);
}

// Wires listeners, first frame and teardown. Kept separate so the runtime above stays readable.
function createLifecycle(c) {
  const { hostEl, renderer, scene, camera, input, env, moods, listeners, applySize, renderStatic, play, pause } = c;
  const signal = listeners.signal;
  let stopped = false;
  let resizeQueued = false;
  let cupGone = window.scrollY > input.vh * CUP_EXIT[1];

  const onResize = () => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => {
      resizeQueued = false;
      applySize(false);
      if (env.reduced) renderStatic();
    });
  };
  const onScene = (e) => {
    moods.set(e.detail);
    if (env.reduced) requestAnimationFrame(renderStatic);
  };
  const onVisibility = () => (document.hidden ? pause() : play());
  // reduced motion: no loop, only re-render when the cup should appear or disappear
  const onStaticScroll = () => {
    const gone = window.scrollY > input.vh * CUP_EXIT[1];
    if (gone !== cupGone) { cupGone = gone; requestAnimationFrame(renderStatic); }
  };
  const onLost = (e) => { e.preventDefault(); pause(); hostEl.classList.remove('is-ready'); };
  const onRestored = () => { hostEl.classList.add('is-ready'); if (env.reduced) renderStatic(); else play(); };

  function reveal() {
    if (stopped) return; // stop() may land while shaders are still compiling
    renderStatic();
    requestAnimationFrame(() => hostEl.classList.add('is-ready'));
    play();
  }

  function boot() {
    window.addEventListener('resize', onResize, { passive: true, signal });
    window.addEventListener('brew:scene', onScene, { signal });
    document.addEventListener('visibilitychange', onVisibility, { signal });
    if (env.reduced) window.addEventListener('scroll', onStaticScroll, { passive: true, signal });
    renderer.domElement.addEventListener('webglcontextlost', onLost, { signal });
    renderer.domElement.addEventListener('webglcontextrestored', onRestored, { signal });
    applySize(true);
    moods.set(sceneInView());
    moods.update(0, true);
    // compile shaders off the main thread where KHR_parallel_shader_compile exists
    const compile = renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve();
    compile.then(reveal, reveal);
  }

  function stop() {
    stopped = true;
    pause();
    listeners.abort();
    disposeScene(scene);
    renderer.dispose();
    renderer.domElement.remove();
    hostEl.classList.remove('is-ready');
  }

  return { boot, stop };
}
