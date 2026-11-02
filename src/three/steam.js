import { Color, DoubleSide, Group, Mesh, PlaneGeometry, ShaderMaterial } from 'three';

// Wispy steam: a few vertical ribbons whose alpha is driven by scrolling fbm noise
// and whose vertices curl sideways as they rise. Cheap: 3 to 4 quads, one shader.
const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    float h = uv.y;
    p.x += sin(h * 4.0 + uTime * 0.9 + uSeed) * 0.13 * h + sin(h * 9.0 - uTime * 1.3 + uSeed * 2.0) * 0.04 * h;
    p.z += cos(h * 3.0 + uTime * 0.7 + uSeed) * 0.08 * h;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  uniform float uOpacity;
  uniform vec3 uColor;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }
  void main() {
    float n = fbm(vec2(vUv.x * 2.2 + uSeed, vUv.y * 1.6 - uTime * 0.22));
    float n2 = fbm(vec2(vUv.x * 4.0 - uSeed, vUv.y * 3.0 - uTime * 0.38));
    float centre = 0.5 + (n - 0.5) * 0.45;
    float core = smoothstep(0.42, 0.0, abs(vUv.x - centre));
    float vert = smoothstep(0.0, 0.2, vUv.y) * (1.0 - smoothstep(0.5, 1.0, vUv.y));
    float wisps = smoothstep(0.38, 0.85, n * 0.55 + n2 * 0.65);
    gl_FragColor = vec4(uColor, core * vert * wisps * uOpacity);
    #include <colorspace_fragment>
  }
`;

const RIBBONS = [
  { x: -0.14, z: 0.02, ry: -0.35, s: 1.0 },
  { x: 0.06, z: -0.04, ry: 0.1, s: 1.15 },
  { x: 0.2, z: 0.05, ry: 0.45, s: 0.9 },
  { x: -0.02, z: 0.1, ry: -0.05, s: 0.8 },
];

export function createSteam(ribbonCount = 4) {
  const group = new Group();
  const geo = new PlaneGeometry(0.55, 1.7, 1, 14);
  geo.translate(0, 0.85, 0);
  const materials = [];
  RIBBONS.slice(0, ribbonCount).forEach((r, i) => {
    const mat = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSeed: { value: i * 3.7 + 1.3 },
        uOpacity: { value: 0.32 },
        uColor: { value: new Color('#f6e7d2') },
      },
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      toneMapped: false,
    });
    const mesh = new Mesh(geo, mat);
    mesh.position.set(r.x, 0, r.z);
    mesh.rotation.y = r.ry;
    mesh.scale.setScalar(r.s);
    mesh.renderOrder = 2;
    group.add(mesh);
    materials.push(mat);
  });

  function update(time, opacity) {
    for (const m of materials) {
      m.uniforms.uTime.value = time;
      m.uniforms.uOpacity.value = 0.32 * opacity;
    }
    group.visible = opacity > 0.01;
  }

  return { group, update };
}
