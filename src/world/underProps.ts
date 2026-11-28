import * as THREE from 'three';

// The set pieces under the ground (the dungeon pass, after the dark-crawler kit: one hero element in each room,
// darkness round it): a shaft of daylight falling from a crack in the roof, with dust turning in it and a pool
// of light on the floor where it lands; a waterfall coming down a wall, its spray at the foot; and dust on its
// own, hanging in a lamp's light. All of it is drawn as light (nothing is lit by the room's lamps, nothing
// casts a shadow), so it costs a draw each and no lights. The room's key light (world/zones.ts) is what puts
// the shaft's light on the walls round it.

const mats = new Map<string, THREE.ShaderMaterial>();
const cached = (key: string, make: () => THREE.ShaderMaterial) => { let m = mats.get(key); if (!m) { m = make(); mats.set(key, m); } return m; };
const _buf = new THREE.Vector2();

/** A shaft of light: top at (x, y, z), falling h to the floor, r wide at the floor (narrower at the crack). */
export function lightShaft(x: number, y: number, z: number, h: number, r: number, color: string, time: { value: number }): THREE.Group {
  const g = new THREE.Group();
  const beam = cached('shaft' + color, () => new THREE.ShaderMaterial({
    uniforms: { uTime: time, uColor: { value: new THREE.Color(color) }, uA: { value: 0.32 } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uTime; uniform vec3 uColor; uniform float uA; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() {
        // brightest where you look through the most of it (the middle), nothing at its edges
        float edge = pow(abs(dot(vN, vV)), 1.6);
        // stronger near the crack, soft where it meets the floor
        float along = smoothstep(0.0, 0.12, vUv.y) * (0.45 + 0.55 * vUv.y);
        // slow streaks, as light through a ragged crack with something moving high above it
        float a = vUv.x * 6.2832;
        float streak = 0.72 + 0.16 * sin(a * 5.0 + uTime * 0.17) + 0.12 * sin(a * 9.0 - uTime * 0.11 + vUv.y * 3.0);
        gl_FragColor = vec4(uColor * uA * edge * along * streak, 1.0);
      }`,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }));
  const geo = new THREE.CylinderGeometry(Math.max(0.4, r * 0.45), r, h, 28, 1, true);
  const m = new THREE.Mesh(geo, beam);
  m.position.set(x, y - h / 2, z);
  m.renderOrder = 3;
  g.add(m);
  // The pool where it lands
  const pool = cached('pool' + color, () => new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uA: { value: 0.5 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uColor; uniform float uA; varying vec2 vUv;
      void main() { float d = length(vUv - 0.5) * 2.0; float f = pow(max(0.0, 1.0 - d), 1.8); gl_FragColor = vec4(uColor * uA * f, 1.0); }`,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
  }));
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(r * 2.6, r * 2.6).rotateX(-Math.PI / 2), pool);
  disc.position.set(x, y - h + 0.03, z);
  disc.renderOrder = 3;
  g.add(disc);
  g.add(motes(x, y - h, z, r * 0.85, h * 0.8, color, time, 0.07));
  return g;
}

/**
 * Dust in the air round (x, floor y, z): r round, h high, drifting slowly down and turning, each mote catching
 * the light now and then. fall: how fast it sinks (a waterfall's spray rises instead: give it below zero).
 */
export function motes(x: number, y: number, z: number, r: number, h: number, color: string, time: { value: number }, fall = 0.07, size = 0.06): THREE.Points {
  const n = Math.max(30, Math.min(220, Math.round(r * r * h * 1.1)));
  const seed = new Float32Array(n * 3), pos = new Float32Array(n * 3);
  let s = Math.abs(Math.round(x * 13 + z * 7)) + 1;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < n; i++) { seed[i * 3] = rnd(); seed[i * 3 + 1] = rnd(); seed[i * 3 + 2] = rnd(); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(x, y + h / 2, z), Math.max(r, h));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: time, uColor: { value: new THREE.Color(color) }, uBase: { value: new THREE.Vector3(x, y, z) }, uR: { value: r }, uH: { value: h }, uFall: { value: fall }, uSize: { value: size }, uScale: { value: 400 } },
    vertexShader: `attribute vec3 aSeed; uniform float uTime; uniform vec3 uBase; uniform float uR; uniform float uH; uniform float uFall; uniform float uSize; uniform float uScale; varying float vA;
      void main() {
        float a = aSeed.x * 6.2832 + uTime * 0.07 * (aSeed.z - 0.5);
        float rr = sqrt(aSeed.z) * uR;
        float y = mod(aSeed.y * uH - uTime * uFall * (0.5 + aSeed.z), uH);
        vec3 p = uBase + vec3(cos(a) * rr + sin(uTime * 0.3 + aSeed.y * 9.0) * 0.15, y, sin(a) * rr);
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(uSize * uScale / max(0.3, -mv.z), 1.0, 9.0);
        // fade in and out at the top and bottom, and catch the light now and then
        vA = smoothstep(0.0, 0.15, y / uH) * smoothstep(1.0, 0.8, y / uH) * (0.45 + 0.55 * max(0.0, sin(uTime * (0.6 + aSeed.x) + aSeed.y * 40.0)));
      }`,
    fragmentShader: `uniform vec3 uColor; varying float vA;
      void main() { float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard; gl_FragColor = vec4(uColor * vA * (1.0 - d * d) * 0.9, 1.0); }`,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
  });
  const pts = new THREE.Points(geo, m);
  pts.frustumCulled = true;
  pts.renderOrder = 3;
  pts.onBeforeRender = (renderer, _s, camera) => { m.uniforms.uScale.value = renderer.getDrawingBufferSize(_buf).y * 0.5 * (camera as THREE.PerspectiveCamera).projectionMatrix.elements[5]; };
  return pts;
}

/** A waterfall: its lip at (x, y, z), dropping h, len wide, its face turned ry; spray at the foot. */
export function waterfall(x: number, y: number, z: number, h: number, len: number, ry: number, time: { value: number }): THREE.Group {
  const g = new THREE.Group();
  const sheet = cached('falls', () => new THREE.ShaderMaterial({
    uniforms: { uTime: time },
    vertexShader: `varying vec2 vUv; varying vec2 vSize; attribute vec2 aSize;
      void main() { vUv = uv; vSize = aSize; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uTime; varying vec2 vUv; varying vec2 vSize;
      float h1(float n) { return fract(sin(n * 91.345) * 43758.5453); }
      void main() {
        // columns of falling water, each its own speed, streaked
        float cols = vSize.x * 5.0;
        float c = floor(vUv.x * cols), r = h1(c);
        float flow = fract((1.0 - vUv.y) * vSize.y * 0.35 + uTime * (0.9 + r * 0.7) + r * 7.0);
        float s = smoothstep(0.0, 0.25, flow) * smoothstep(1.0, 0.55, flow);
        vec3 deep = vec3(0.32, 0.5, 0.6), white = vec3(0.86, 0.95, 1.0);
        vec3 col = mix(deep, white, s * 0.8 + (1.0 - vUv.y) * 0.25);
        float side = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
        float lip = smoothstep(1.0, 0.94, vUv.y);
        gl_FragColor = vec4(col, (0.55 + 0.35 * s) * side * lip);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }));
  const geo = new THREE.PlaneGeometry(len, h, 1, 1);
  const n = geo.attributes.position.count;
  geo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(Array.from({ length: n * 2 }, (_, i) => (i % 2 ? h : len))), 2));
  const m = new THREE.Mesh(geo, sheet);
  m.position.set(x, y - h / 2, z);
  m.rotation.y = ry;
  m.renderOrder = 2;
  g.add(m);
  // spray rising off the pool at the foot
  g.add(motes(x, y - h, z, len * 0.55, 2.2, '#cfe8f0', time, -0.5, 0.11));
  return g;
}
