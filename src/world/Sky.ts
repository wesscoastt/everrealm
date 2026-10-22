import * as THREE from 'three';
import { realmHour } from './clock';
import type { WeatherState } from './weather';
import { precipitation } from './precip';
import { SharedUniforms } from './materials';
import { createSeededRandom } from '../utils/random';

interface Key {
  t: number;
  zenith: string;
  horizon: string;
  sun: string;
  sunI: number;
  hemiSky: string;
  hemiGround: string;
  hemiI: number;
  fog: string;
}

// Colour keys across the day. Hours 0-24.
// Night keeps a cool moonlit ambient strong enough to read walls and streets by; lamps do the rest.
const KEYS: Key[] = [
  { t: 0, zenith: '#070d22', horizon: '#18264a', sun: '#9fb4ec', sunI: 0.6, hemiSky: '#3e5694', hemiGround: '#1c1e2c', hemiI: 0.95, fog: '#16213e' },
  { t: 4.6, zenith: '#0b1530', horizon: '#26365e', sun: '#9fb4ec', sunI: 0.55, hemiSky: '#3e5694', hemiGround: '#1c1e2c', hemiI: 0.9, fog: '#1d2a4c' },
  { t: 6.0, zenith: '#3a5a9a', horizon: '#f2a273', sun: '#ffb27a', sunI: 1.1, hemiSky: '#8a9ccc', hemiGround: '#5a4434', hemiI: 0.8, fog: '#d8a88c' },
  { t: 8.0, zenith: '#4a8ad6', horizon: '#d6e6ee', sun: '#fff0d6', sunI: 2.5, hemiSky: '#bcd8f2', hemiGround: '#6a5a3a', hemiI: 1.05, fog: '#c4dcea' },
  { t: 12.0, zenith: '#3b80da', horizon: '#c4e2f4', sun: '#fffaf0', sunI: 2.9, hemiSky: '#c8e0f6', hemiGround: '#6d5c3c', hemiI: 1.1, fog: '#bcd9ee' },
  { t: 16.5, zenith: '#4479c4', horizon: '#f2d6aa', sun: '#ffd49a', sunI: 2.5, hemiSky: '#c4d6ec', hemiGround: '#6f5534', hemiI: 1.0, fog: '#e2d0b0' },
  { t: 18.6, zenith: '#2e3f80', horizon: '#f39060', sun: '#ff9a5e', sunI: 1.3, hemiSky: '#9a8ab8', hemiGround: '#5a3a2a', hemiI: 0.8, fog: '#d48a70' },
  { t: 20.2, zenith: '#0f1838', horizon: '#3a3a66', sun: '#9fb4ec', sunI: 0.55, hemiSky: '#45568e', hemiGround: '#1e2030', hemiI: 0.95, fog: '#2a2c50' },
  { t: 24, zenith: '#070d22', horizon: '#18264a', sun: '#9fb4ec', sunI: 0.6, hemiSky: '#3e5694', hemiGround: '#1c1e2c', hemiI: 0.95, fog: '#16213e' },
];

/** Side of the square of sky the clouds wrap around the player in. */
const CLOUD_SPAN = 1500;
interface CloudPart { dx: number; dy: number; dz: number; w: number; h: number; d: number; ph: number }
interface Cloud { x: number; z: number; y: number; drift: number; parts: CloudPart[] }
const cloudPos = new THREE.Vector3(), cloudScale = new THREE.Vector3(), cloudQ = new THREE.Quaternion(), cloudM = new THREE.Matrix4();

const c1 = new THREE.Color(), c2 = new THREE.Color();
function lerpColor(a: string, b: string, t: number, out: THREE.Color): THREE.Color {
  return out.copy(c1.set(a)).lerp(c2.set(b), t);
}

const GREY = new THREE.Color('#8e97a2');
const tmpC = new THREE.Color();

export class Sky {
  readonly group = new THREE.Group();
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  readonly fog: THREE.Fog;
  private dome: THREE.Mesh;
  private domeMat: THREE.ShaderMaterial;
  private clouds: THREE.InstancedMesh;
  private cloudMat: THREE.MeshBasicMaterial;
  private cloudSet: Cloud[] = [];
  private cloudTime = 0;
  /** How far the wind has carried the clouds so far (x, z). */
  private wind = new THREE.Vector2();
  private stars: THREE.Points;
  private farMats: THREE.MeshBasicMaterial[] = [];
  readonly sunDir = new THREE.Vector3();
  /** Hours added to the realm clock (only the debug hook sets it). */
  private hourOffset = 0;
  /** The hour of the day: the realm's, shared by everyone online (see world/clock.ts). */
  get hour(): number { return (((realmHour() + this.hourOffset) % 24) + 24) % 24; }
  set hour(h: number) { this.hourOffset = h - realmHour(); }
  /** 0 at midday, 1 at full night. */
  night = 0;
  /** The camera is under water: a close blue-green fog closes in. */
  underwater = false;
  /** The weather now (eased toward the target), and where it's heading. */
  readonly weather: WeatherState = { cloud: 0.1, precip: 0, snow: false, mist: 0, name: 'Clear' };
  private weatherTo: WeatherState = { ...this.weather };
  /** A roof overhead: no rain drawn (it would fall through it). */
  sheltered = false;
  /** Lightning: a white flash that fades. */
  flash = 0;
  private rain = precipitation('rain');
  private snow = precipitation('snow');
  private precipTime = 0;

  constructor(scene: THREE.Scene, private shared: SharedUniforms) {
    this.fog = new THREE.Fog('#c4dcea', 120, 1100);
    scene.fog = this.fog;

    this.hemi = new THREE.HemisphereLight('#c8e0f6', '#6d5c3c', 1.1);
    scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight('#fff0d6', 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const cam = this.sun.shadow.camera;
    cam.left = -48; cam.right = 48; cam.top = 48; cam.bottom = -48; cam.near = 1; cam.far = 260;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.04;
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.domeMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uZenith: { value: new THREE.Color() },
        uHorizon: { value: new THREE.Color() },
        uSunDir: shared.uSunDir,
        uSunColor: shared.uSunColor,
        uNight: { value: 0 },
      },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }`,
      fragmentShader: `uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uSunDir; uniform vec3 uSunColor; uniform float uNight; varying vec3 vDir;
      void main(){
        float h = clamp(vDir.y, -0.2, 1.0);
        vec3 col = mix(uHorizon, uZenith, pow(max(h, 0.0), 0.55));
        if (h < 0.0) col = mix(uHorizon, uHorizon * 0.7, -h * 4.0);
        float d = max(dot(normalize(vDir), uSunDir), 0.0);
        float disc = smoothstep(0.9993, 0.9997, d);
        float glow = pow(d, 18.0) * 0.55 + pow(d, 4.0) * 0.18;
        col += uSunColor * (glow * (1.0 - uNight * 0.7) + disc * (1.6 - uNight * 1.2));
        // moon opposite the sun
        float m = max(dot(normalize(vDir), -uSunDir), 0.0);
        col += vec3(0.85, 0.9, 1.0) * smoothstep(0.9990, 0.9994, m) * uNight;
        col += vec3(0.4, 0.5, 0.8) * pow(m, 30.0) * 0.25 * uNight;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(2200, 32, 16), this.domeMat);
    this.dome.frustumCulled = false;
    this.dome.renderOrder = -10;
    this.group.add(this.dome);

    // Chunky drifting clouds: clusters of flattened boxes in two layers. Each cluster has a fixed
    // place in the world and drifts with the wind; positions wrap around the player inside
    // CLOUD_SPAN, and the shader fades clusters out toward the wrap edge so none pop in.
    // Flat, painted shading (bright tops, pale sides, soft grey undersides) rather than lit:
    // seen from below, lit boxes go dark and muddy.
    this.cloudMat = new THREE.MeshBasicMaterial({ color: '#ffffff', vertexColors: true, transparent: true, opacity: 0.85, fog: false, depthWrite: false });
    this.cloudMat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vCloudFade;')
        .replace('#include <project_vertex>', `#include <project_vertex>
          vec4 cloudWorld = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
          vCloudFade = 1.0 - smoothstep(${(CLOUD_SPAN * 0.3).toFixed(1)}, ${(CLOUD_SPAN * 0.47).toFixed(1)}, length(cloudWorld.xz - cameraPosition.xz));`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vCloudFade;')
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.a *= vCloudFade;');
    };
    const rnd = createSeededRandom(77);
    let count = 0;
    for (let c = 0; c < 70; c++) {
      const high = c >= 52;
      const cluster: Cloud = { x: rnd() * CLOUD_SPAN, z: rnd() * CLOUD_SPAN, y: high ? 150 + rnd() * 14 : 94 + rnd() * 26, drift: high ? 1.6 : 0.85 + rnd() * 0.3, parts: [] };
      const n = high ? 2 + Math.floor(rnd() * 3) : 3 + Math.floor(rnd() * 6);
      for (let k = 0; k < n; k++) {
        cluster.parts.push(high
          ? { dx: (rnd() - 0.5) * 60, dy: (rnd() - 0.5) * 2, dz: (rnd() - 0.5) * 26, w: 30 + rnd() * 40, h: 1.5 + rnd() * 1.5, d: 10 + rnd() * 14, ph: rnd() * 6.28 }
          : { dx: (rnd() - 0.5) * 34, dy: k === 0 ? 2 : (rnd() - 0.5) * 4, dz: (rnd() - 0.5) * 24, w: 12 + rnd() * 22, h: 3 + rnd() * (k === 0 ? 6 : 3), d: 8 + rnd() * 16, ph: rnd() * 6.28 });
      }
      count += n;
      this.cloudSet.push(cluster);
    }
    const box = new THREE.BoxGeometry(1, 1, 1);
    const normals = box.getAttribute('normal');
    const shade: number[] = [];
    for (let v = 0; v < normals.count; v++) {
      const y = normals.getY(v), k = y > 0.5 ? 1 : y < -0.5 ? 0.8 : 0.9;
      shade.push(k, k, k * 1.02);
    }
    box.setAttribute('color', new THREE.Float32BufferAttribute(shade, 3));
    this.clouds = new THREE.InstancedMesh(box, this.cloudMat, count);
    this.clouds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.clouds.frustumCulled = false;
    this.group.add(this.clouds);

    const starPos: number[] = [];
    for (let i = 0; i < 900; i++) {
      const v = new THREE.Vector3(rnd() - 0.5, rnd() * 0.9 + 0.05, rnd() - 0.5).normalize().multiplyScalar(2100);
      starPos.push(v.x, v.y, v.z);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    this.stars.frustumCulled = false;
    this.group.add(this.stars);

    scene.add(this.group);
    scene.add(this.rain.obj, this.snow.obj);
  }

  /** Where the weather should go; the sky gets there over half a minute or so. */
  setWeather(w: WeatherState): void {
    this.weatherTo = w;
  }

  /** Ease the weather toward its target and move the rain or snow with the camera. */
  private updateWeather(dt: number, cam: THREE.Vector3): void {
    const W = this.weather, T = this.weatherTo, k = Math.min(1, dt / 25);
    // Change kind only once the old fall has thinned out
    if (W.snow !== T.snow && W.precip < 0.05) W.snow = T.snow;
    W.cloud += (T.cloud - W.cloud) * k;
    W.precip += ((W.snow === T.snow ? T.precip : 0) - W.precip) * k;
    W.mist += (T.mist - W.mist) * k;
    W.name = T.name;
    this.precipTime += dt;
    for (const [p, on] of [[this.rain, !W.snow], [this.snow, W.snow]] as const) {
      const show = on && W.precip > 0.02 && !this.underwater;
      p.obj.visible = show;
      if (!show) continue;
      const u = p.mat.uniforms;
      u.uTime.value = this.precipTime;
      u.uCam.value.copy(cam);
      // Under a roof, a few drops still show at the edges of the view rather than none at all
      u.uAmount.value = W.precip * (this.sheltered ? 0.25 : 1);
      u.uOpacity.value = (W.snow ? 0.85 : 0.55) * (1 - this.night * 0.55);
    }
    this.flash = Math.max(0, this.flash - dt * 4);
  }

  /** Drift every cluster with the wind and lay it out around the player. */
  private updateClouds(dt: number, center: THREE.Vector3): void {
    this.cloudTime += dt;
    // The wind veers slowly over a few minutes and gusts a little.
    const heading = 0.5 + Math.sin(this.cloudTime * 0.004) * 0.6;
    const speed = 4.2 + Math.sin(this.cloudTime * 0.031) * 1.1;
    this.wind.x += Math.cos(heading) * speed * dt;
    this.wind.y += Math.sin(heading) * speed * dt;
    const half = CLOUD_SPAN / 2;
    const wrap = (v: number) => ((v % CLOUD_SPAN) + CLOUD_SPAN) % CLOUD_SPAN - half;
    let i = 0;
    for (const c of this.cloudSet) {
      const rx = wrap(c.x + this.wind.x * c.drift - center.x);
      const rz = wrap(c.z + this.wind.y * c.drift - center.z);
      for (const p of c.parts) {
        // Each puff swells and thins slowly so the shapes change as they travel.
        const b = 1 + Math.sin(this.cloudTime * 0.05 + p.ph) * 0.08;
        cloudPos.set(rx + p.dx, c.y + p.dy, rz + p.dz);
        cloudScale.set(p.w * b, p.h * (2 - b), p.d * b);
        this.clouds.setMatrixAt(i++, cloudM.compose(cloudPos, cloudQ, cloudScale));
      }
    }
    this.clouds.instanceMatrix.needsUpdate = true;
  }

  registerFarMaterial(m: THREE.MeshBasicMaterial): void {
    this.farMats.push(m);
  }

  update(dt: number, center: THREE.Vector3, timeScale: number): void {
    void timeScale;
    const h = this.hour;
    let i = 0;
    while (i < KEYS.length - 2 && KEYS[i + 1].t <= h) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const t = (h - a.t) / (b.t - a.t);
    const zen = lerpColor(a.zenith, b.zenith, t, this.domeMat.uniforms.uZenith.value);
    lerpColor(a.horizon, b.horizon, t, this.domeMat.uniforms.uHorizon.value);
    lerpColor(a.fog, b.fog, t, this.fog.color);
    if (this.underwater) { this.fog.color.set('#1f6a80').multiplyScalar(1 - this.night * 0.65); this.fog.near = 0.5; this.fog.far = 30; }
    else { this.fog.near = 120; this.fog.far = 1100; }
    lerpColor(a.sun, b.sun, t, this.sun.color);
    this.sun.intensity = a.sunI + (b.sunI - a.sunI) * t;
    lerpColor(a.hemiSky, b.hemiSky, t, this.hemi.color);
    lerpColor(a.hemiGround, b.hemiGround, t, this.hemi.groundColor);
    this.hemi.intensity = a.hemiI + (b.hemiI - a.hemiI) * t;

    // Weather: grey skies dim the sun and wash the colours toward slate; mist and rain pull the fog in
    this.updateWeather(dt, center);
    const W = this.weather, c = W.cloud;
    tmpC.copy(GREY).multiplyScalar(1 - this.night * 0.8);
    zen.lerp(tmpC, c * 0.55);
    this.domeMat.uniforms.uHorizon.value.lerp(tmpC, c * 0.5);
    if (!this.underwater) {
      this.fog.color.lerp(tmpC, c * 0.5);
      const thick = Math.max(W.mist, W.precip * 0.55);
      this.fog.near = 120 * (1 - thick * 0.9);
      this.fog.far = 1100 - c * 300 - thick * 850;
    }
    // Under a lid of cloud the sun all but goes (shadows fade) and the light turns flat and cool
    this.sun.intensity *= 1 - c * 0.85;
    this.sun.color.lerp(tmpC.copy(GREY), c * 0.4);
    this.hemi.intensity *= 1 - c * 0.3;
    this.hemi.color.lerp(GREY, c * 0.45);
    this.hemi.groundColor.multiplyScalar(1 - c * 0.3);
    tmpC.copy(GREY).multiplyScalar(1 - this.night * 0.8);
    if (this.flash > 0) { this.hemi.intensity += this.flash * 2.5; zen.lerp(tmpC.set('#dfe6ff'), this.flash * 0.6); }

    // Sun path: rises in the east (+x), sets in the west, tilted toward the south.
    const ang = ((h - 6) / 12) * Math.PI;
    const elev = Math.sin(ang);
    this.sunDir.set(Math.cos(ang), elev, 0.35).normalize();
    const isNight = elev < -0.05;
    const lightDir = isNight ? this.sunDir.clone().multiplyScalar(-1) : this.sunDir.clone();
    if (lightDir.y < 0.18) lightDir.y = 0.18;
    lightDir.normalize();
    this.shared.uSunDir.value.copy(this.sunDir);
    this.shared.uSunColor.value.copy(this.sun.color);
    this.shared.uSkyColor.value.copy(zen).lerp(this.fog.color, 0.5);

    this.night = THREE.MathUtils.clamp(1 - (elev + 0.15) / 0.35, 0, 1);
    this.domeMat.uniforms.uNight.value = this.night;
    this.shared.uGlow.value = 0.22 + this.night * 1.25;
    (this.stars.material as THREE.PointsMaterial).opacity = this.night * 0.9;
    // White by day, warmed by a low sun, blue-grey and dim at night
    this.cloudMat.color.set('#ffffff').lerp(this.sun.color, 0.3 * (1 - this.night)).lerp(this.fog.color, 0.12).lerp(GREY, this.weather.cloud * 0.55).multiplyScalar(1 - this.night * 0.78);
    this.cloudMat.opacity = 0.85 + this.weather.cloud * 0.12;

    // Shadow frustum follows the player, snapped to texels to avoid shimmer.
    const snap = 96 / 2048;
    const cx = Math.round(center.x / snap) * snap, cz = Math.round(center.z / snap) * snap;
    this.sun.target.position.set(cx, center.y, cz);
    this.sun.position.set(cx + lightDir.x * 120, center.y + lightDir.y * 120, cz + lightDir.z * 120);
    this.sun.target.updateMatrixWorld();

    this.group.position.set(center.x, 0, center.z);
    this.updateClouds(dt, center);

    for (const m of this.farMats) {
      const base = (m.userData.base as THREE.Color) ?? m.color.clone();
      m.userData.base = base;
      m.color.copy(base).lerp(this.fog.color, (m.userData.haze as number) ?? 0.5).multiplyScalar(1 - this.night * 0.55);
    }
  }
}
