import { Color } from 'three';

// Per section lighting moods. Colours are lerped every frame, so a section change
// feels like the room light slowly shifting rather than a cut.
const CARAMEL = { key: '#ffd8ad', rim: '#c8945a', sky: '#f2d2ac', bean: '#3a2116', fog: '#0e0907', rimI: 3.2 };
const UBE = { key: '#f1dcff', rim: '#a77ce0', sky: '#d9c4f2', bean: '#3a2456', fog: '#100a12', rimI: 4.2 };

const RAW = {
  hero: CARAMEL,
  story: { ...CARAMEL, key: '#ffd2a0', rim: '#d9a066' },
  menu: CARAMEL,
  cakes: { ...CARAMEL, key: '#ffd9c8', rim: '#e3a59a', sky: '#f6d6cc' },
  ube: UBE,
  offers: UBE,
  training: { ...CARAMEL, rim: '#e2b47c' },
  pet: { ...CARAMEL, rim: '#f08a3c', key: '#ffd6a6' },
  community: CARAMEL,
  visit: { ...CARAMEL, rim: '#d7261e', fog: '#120706', bean: '#3d1d15', rimI: 4.6 },
};

const MOODS = Object.fromEntries(Object.entries(RAW).map(([id, m]) => [id, {
  key: new Color(m.key), rim: new Color(m.rim), sky: new Color(m.sky),
  bean: new Color(m.bean), fog: new Color(m.fog), rimI: m.rimI,
}]));

/**
 * @param {object} t  { keyLight, rimLight, hemi, beanMaterial, fog }
 */
export function createMoods(t) {
  let target = MOODS.hero;

  function set(id) {
    if (MOODS[id]) target = MOODS[id];
  }

  // k = 1 snaps (reduced motion), otherwise a frame rate independent damp.
  function update(dt, snap = false) {
    const k = snap ? 1 : 1 - Math.exp(-dt * 1.6);
    t.keyLight.color.lerp(target.key, k);
    t.rimLight.color.lerp(target.rim, k);
    t.rimLight.intensity += (target.rimI - t.rimLight.intensity) * k;
    t.hemi.color.lerp(target.sky, k);
    t.beanMaterial.color.lerp(target.bean, k);
    t.fog.color.lerp(target.fog, k);
  }

  return { set, update };
}
