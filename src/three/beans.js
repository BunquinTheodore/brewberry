import { Color, DynamicDrawUsage, InstancedMesh, MeshStandardMaterial, Object3D, SphereGeometry, Vector3 } from 'three';

// Floating coffee beans: one InstancedMesh, so the whole field is a single draw call.
const VOLUME_Z = [-9, 3]; // depth band (camera sits at z = 8)
const WRAP_HALF = 6.2; // beans wrap vertically within camY +/- this, so the field never ends
const REPEL_RADIUS = 1.35;
const REPEL_FORCE = 0.95;

// Unit sphere reshaped into a bean: long along Y, flat face on +Z with an S-curved crease.
function createBeanGeometry() {
  const geo = new SphereGeometry(1, 20, 12);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    let z = pos.getZ(i);
    if (z > 0) {
      const d = x - 0.16 * Math.sin(y * 2.4);
      const groove = Math.exp(-(d * d) / 0.018) * Math.min(1, z * 3);
      z = z * 0.62 - groove * 0.3;
    }
    pos.setXYZ(i, x * 0.11, y * 0.16, z * 0.085);
  }
  geo.computeVertexNormals();
  return geo;
}

const rand = (a, b) => a + Math.random() * (b - a);

function seedBean() {
  // bias toward the back so the near plane stays airy over the copy
  const z = VOLUME_Z[0] + Math.pow(Math.random(), 1.6) * (VOLUME_Z[1] - VOLUME_Z[0]);
  return {
    nx: rand(-1.05, 1.05), // x as a fraction of the visible half width at this depth
    y: rand(-WRAP_HALF, WRAP_HALF),
    z,
    rx: rand(0, 6.28), ry: rand(0, 6.28), rz: rand(0, 6.28),
    sx: rand(-0.35, 0.35), sy: rand(-0.3, 0.3), sz: rand(-0.2, 0.2),
    rise: rand(0.02, 0.09),
    phase: rand(0, 6.28),
    scale: rand(0.8, 1.25),
    off: new Vector3(),
  };
}

export function createBeans(count) {
  const material = new MeshStandardMaterial({ color: '#3a2116', roughness: 0.4, metalness: 0.05 });
  const mesh = new InstancedMesh(createBeanGeometry(), material, count);
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.frustumCulled = false; // instances span the whole volume, the bounding sphere would be stale
  const beans = Array.from({ length: count }, seedBean);
  const tint = new Color();
  beans.forEach((_, i) => {
    const v = rand(0.78, 1.18);
    mesh.setColorAt(i, tint.setRGB(v, v * 0.96, v * 0.92));
  });

  const dummy = new Object3D();
  const p = new Vector3();
  const toBean = new Vector3();
  const closest = new Vector3();
  const push = new Vector3();

  // Push a bean away from the pointer ray (distance to a line, not a plane, so depth reads right).
  function repel(b, ray, strength, k) {
    push.set(0, 0, 0);
    if (strength > 0.001) {
      toBean.subVectors(p, ray.origin);
      closest.copy(ray.direction).multiplyScalar(toBean.dot(ray.direction)).add(ray.origin);
      push.subVectors(p, closest);
      const dist = push.length();
      if (dist < REPEL_RADIUS && dist > 1e-4) {
        const f = Math.pow(1 - dist / REPEL_RADIUS, 2) * REPEL_FORCE * strength;
        push.multiplyScalar(f / dist);
      } else push.set(0, 0, 0);
    }
    b.off.lerp(push, k);
  }

  /**
   * @param {object} s  dt, time, camY, tanHalf (tan of half vertical fov), aspect,
   *                    camZ, ray, repel (0..1), spin (extra spin from scroll), reduced
   */
  function update(s) {
    const k = 1 - Math.exp(-s.dt * 5);
    for (let i = 0; i < mesh.count; i++) {
      const b = beans[i];
      b.y += b.rise * s.dt;
      const rel = ((b.y - s.camY + WRAP_HALF) % (WRAP_HALF * 2) + WRAP_HALF * 2) % (WRAP_HALF * 2) - WRAP_HALF;
      const halfW = (s.camZ - b.z) * s.tanHalf * s.aspect;
      const sway = s.reduced ? 0 : Math.sin(s.time * 0.4 + b.phase) * 0.12;
      p.set(b.nx * halfW + sway, s.camY + rel, b.z);
      repel(b, s.ray, s.repel, k);
      const spin = s.dt * (1 + s.spin);
      b.rx += b.sx * spin; b.ry += b.sy * spin; b.rz += b.sz * spin;
      dummy.position.copy(p).add(b.off);
      dummy.rotation.set(b.rx, b.ry, b.rz);
      dummy.scale.setScalar(b.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  // Visible bean count = adaptive quality budget, capped at 32 on tall narrow screens so phones stay airy.
  let budget = count;
  let narrow = false;
  const applyCount = () => { mesh.count = Math.max(14, Math.min(budget, narrow ? Math.min(count, 32) : count)); };

  function reduceCount(factor) {
    budget = Math.max(18, Math.floor(budget * factor));
    applyCount();
  }

  function fitAspect(aspect) {
    narrow = aspect < 0.8;
    applyCount();
  }

  return { mesh, material, update, reduceCount, fitAspect };
}
