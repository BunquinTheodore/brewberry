import {
  CircleGeometry, Group, LatheGeometry, Mesh, MeshPhysicalMaterial,
  MeshStandardMaterial, TorusGeometry, Vector2, Vector3,
} from 'three';
import { createLatteTexture } from './latteArt.js';
import { createSteam } from './steam.js';

// Lathe profiles (radius, height). Each one is a closed outline traced bottom
// outward, up the outside, then back in over the top, so faces point outward.
const CUP_PROFILE = [
  [0.001, 0], [0.36, 0], [0.42, 0.025], [0.5, 0.12], [0.6, 0.3], [0.68, 0.52], [0.73, 0.72],
  [0.755, 0.9], [0.76, 0.935], [0.735, 0.945], [0.71, 0.9], [0.685, 0.72],
  [0.63, 0.5], [0.53, 0.28], [0.42, 0.17], [0.25, 0.13], [0.001, 0.12],
];
const SAUCER_PROFILE = [
  [0.001, 0], [0.36, 0], [0.39, 0.025], [0.62, 0.045], [1.0, 0.11], [1.1, 0.14],
  [1.11, 0.16], [1.07, 0.16], [0.95, 0.12], [0.55, 0.075], [0.42, 0.07], [0.001, 0.068],
];
const SEGMENTS = 44;
const SAUCER_TOP = 0.068;
const LATTE_Y = 0.84;
const LATTE_R = 0.69;
const BASE_TILT = 0.5; // tip the rim toward the camera so the latte art reads
const SPIN_SPEED = 0.2;
const INTRO_SECONDS = 1.8;
const STACKED_MAX_W = 820; // hero.css stacks copy above the cup at this width and below

const lathe = (pts) => new LatheGeometry(pts.map(([x, y]) => new Vector2(x, y)), SEGMENTS);
const easeOut = (x) => 1 - Math.pow(1 - x, 3);

function buildCupBody(ceramic, maxAniso) {
  const cup = new Group();
  cup.position.y = SAUCER_TOP;
  cup.add(new Mesh(lathe(CUP_PROFILE), ceramic));

  const latteMat = new MeshStandardMaterial({ map: createLatteTexture(maxAniso), roughness: 0.32, metalness: 0 });
  const latte = new Mesh(new CircleGeometry(LATTE_R, SEGMENTS), latteMat);
  latte.rotation.x = -Math.PI / 2;
  latte.position.y = LATTE_Y;
  cup.add(latte);

  // Partial torus = handle, its open side tucked into the cup wall.
  const arc = Math.PI * 1.3;
  const handle = new Mesh(new TorusGeometry(0.2, 0.05, 10, 22, arc), ceramic);
  handle.rotation.z = -arc / 2;
  handle.position.set(0.74, 0.5, 0);
  cup.add(handle);
  return cup;
}

export function createCup({ maxAnisotropy = 1 } = {}) {
  const ceramic = new MeshPhysicalMaterial({
    color: '#f4ede2', roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08,
  });
  const placement = new Group(); // position / scale / exit
  const tilt = new Group(); // pointer parallax
  const spin = new Group(); // slow turn on its axis
  spin.position.y = -0.5; // pivot near the middle of the stack
  spin.add(new Mesh(lathe(SAUCER_PROFILE), ceramic));
  spin.add(buildCupBody(ceramic, maxAnisotropy));
  tilt.add(spin);
  placement.add(tilt);

  const steam = createSteam();
  placement.add(steam.group);

  const rim = new Vector3();
  const layout = { x: 2.2, y: 0, scale: 1.3 };

  // Desktop: to the right of the hero copy. Phones (aspect < 0.8) and any viewport where the
  // hero stacks its copy on top (<= 820px wide, see hero.css): lower centre, smaller.
  // Tall phones keep a bigger cup; short ones (iPhone SE, tablets) shrink it so the
  // cream ceramic never sits behind the lead paragraph.
  function setLayout(aspect, halfWidth) {
    if (aspect < 0.8 || window.innerWidth <= STACKED_MAX_W) {
      Object.assign(layout, { x: 0, y: -1.3, scale: aspect <= 0.5 ? 0.8 : 0.68 });
      return;
    }
    // scale with the visible half width so the saucer never crosses into the copy column
    const scale = Math.min(1.3, Math.max(0.9, halfWidth * 0.3));
    Object.assign(layout, { x: Math.min(2.4, Math.max(1.45, halfWidth * 0.5)), y: -0.1, scale });
  }

  /**
   * @param {object} s  time, dt, px/py (damped pointer -1..1), exit (0..1), camY, reduced
   */
  function update(s) {
    const intro = s.reduced ? 1 : easeOut(Math.min(1, s.time / INTRO_SECONDS));
    const e = s.exit;
    placement.visible = e < 0.995;
    if (!placement.visible) return;
    const bob = s.reduced ? 0 : Math.sin(s.time * 0.9) * 0.05;
    placement.position.set(layout.x * (1 - e * 0.25), layout.y + bob + e * 1.4, -e * 1.6);
    placement.scale.setScalar(layout.scale * (0.6 + 0.4 * intro) * (1 - e * 0.55));
    if (!s.reduced) spin.rotation.y += s.dt * SPIN_SPEED; // reduced motion keeps the composed angle
    tilt.rotation.set(BASE_TILT - s.py * 0.18 - e * 0.3, s.px * 0.32 + (1 - intro) * -1.2, -s.px * 0.08);
    // steam rises vertically in world space from the tilted rim
    rim.set(0, 0.42, 0).applyEuler(tilt.rotation);
    steam.group.position.copy(rim);
    steam.update(s.reduced ? 4.2 : s.time, intro * Math.pow(1 - e, 2));
  }

  spin.rotation.y = -0.9; // start with the handle angled toward the viewer
  return { object: placement, setLayout, update };
}
