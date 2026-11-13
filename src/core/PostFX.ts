import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// The picture after it's drawn (owner 2026-11-05: "feel more like it was built in an engine like Unity"; the
// reference shots in docs/graphics-ref): the frame is drawn in high range, then
//   light shafts: where the sun shows through the leaves or past a wall, its light streams toward you;
//   bloom: what's brighter than white (the sun, lamps, fire, glowing things) spills a soft light round it;
//   the grade: warm lights and cooler shadows, a touch more colour and depth, the edges of the frame darkened.
// The time of day and the weather set how much of each (setLight). It can be turned off in the options.

const SHAFTS = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uSun: { value: new THREE.Vector2(0.5, 0.5) },
    uStrength: { value: 0 },
    uColor: { value: new THREE.Color(1, 0.85, 0.6) },
    uThreshold: { value: 1.05 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 uSun; uniform float uStrength; uniform vec3 uColor; uniform float uThreshold;
    varying vec2 vUv;
    void main(){
      vec4 base = texture2D(tDiffuse, vUv);
      if (uStrength <= 0.001) { gl_FragColor = base; return; }
      // March from this pixel toward the sun, gathering the sky's bright light where nothing stands in front of it
      const int N = 24;
      vec2 stepv = (vUv - uSun) * (0.92 / float(N));
      vec2 uv = vUv;
      float decay = 1.0;
      vec3 acc = vec3(0.0);
      for (int i = 0; i < N; i++) {
        uv -= stepv;
        vec3 s = texture2D(tDiffuse, clamp(uv, 0.0, 1.0)).rgb;
        float l = max(max(s.r, s.g), s.b);
        acc += min(s, vec3(4.0)) * smoothstep(uThreshold, uThreshold + 0.8, l) * decay;
        decay *= 0.955;
      }
      acc /= float(N);
      // fading out toward the frame's edges away from the sun, so the shafts never pop
      float far = length((vUv - uSun) * vec2(1.6, 1.0));
      gl_FragColor = vec4(base.rgb + acc * uColor * uStrength * (1.0 - smoothstep(0.4, 1.4, far)), base.a);
    }`,
};

const GRADE = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uWarm: { value: new THREE.Color(1.04, 1.0, 0.94) },
    uCool: { value: new THREE.Color(0.94, 0.98, 1.06) },
    uSat: { value: 1.1 },
    uContrast: { value: 1.08 },
    uVignette: { value: 0.32 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec3 uWarm; uniform vec3 uCool; uniform float uSat; uniform float uContrast; uniform float uVignette;
    varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      // warm in the light, cool in the shade
      c *= mix(uCool, uWarm, smoothstep(0.1, 0.75, l));
      // a little more colour, and depth about the middle grey
      c = mix(vec3(l), c, uSat);
      c = (c - 0.5) * uContrast + 0.5;
      // the frame's edges a shade darker, as a lens sees it
      vec2 d = (vUv - 0.5) * vec2(1.25, 1.0);
      c *= 1.0 - uVignette * smoothstep(0.35, 0.95, length(d));
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};

export class PostFX {
  readonly composer: EffectComposer;
  private shafts: ShaderPass;
  private bloom: UnrealBloomPass;
  private grade: ShaderPass;
  private readonly tmp = new THREE.Vector3();
  enabled = true;

  constructor(private renderer: THREE.WebGLRenderer, scene: THREE.Scene, private camera: THREE.PerspectiveCamera) {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    // High range, and smoothed edges (the canvas's own antialiasing doesn't reach a render target)
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 2 });
    this.composer = new EffectComposer(renderer, rt);
    this.composer.addPass(new RenderPass(scene, camera));
    this.shafts = new ShaderPass(SHAFTS);
    this.composer.addPass(this.shafts);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.2, 0.42, 1.8);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GRADE);
    this.composer.addPass(this.grade);
  }

  /** The canvas changed size, or its pixel ratio did. */
  resize(w: number, h: number, dpr: number): void {
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
  }

  /**
   * The light this frame: the sun's direction and colour, how far into night it is, the cloud, and whether
   * you're under water (no shafts there, a cooler, flatter grade).
   */
  setLight(sunDir: THREE.Vector3, sunColor: THREE.Color, night: number, cloud: number, under: boolean, cave: boolean, rain = 0): void {
    // Where the sun is on the screen, and how squarely you face it
    const cam = this.camera;
    const look = cam.getWorldDirection(this.tmp.set(0, 0, 0)).clone();
    const facing = look.dot(sunDir);
    const p = this.tmp.copy(cam.position).addScaledVector(sunDir, 1000).project(cam);
    const u = this.shafts.uniforms;
    u.uSun.value.set(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5);
    const day = 1 - night, low = 1 - Math.min(1, Math.max(0, sunDir.y - 0.1) / 0.7); // strongest with the sun low
    u.uStrength.value = under || cave ? 0 : Math.max(0, facing) ** 2 * day * (1 - cloud * 0.85) * (0.55 + low * 0.9);
    // (performance: the shafts' full-screen pass only runs when there's a sun in front of you to stream; owner 2026-11-12)
    this.shafts.enabled = u.uStrength.value > 0.02 && Math.abs(p.x) < 1.6 && Math.abs(p.y) < 1.6 && p.z < 1;
    u.uColor.value.copy(sunColor).lerp(new THREE.Color(1, 0.9, 0.7), 0.4);
    // Bloom a little stronger at night, when lamps and fires are the light; less under grey skies
    this.bloom.strength = under ? 0.1 : 0.17 + night * 0.1 - cloud * 0.05;
    const g = this.grade.uniforms;
    // Golden hour warmer, night bluer, the deep a cold green
    const gold = day * low;
    g.uWarm.value.setRGB(1.03 + gold * 0.05, 1.0 + gold * 0.01, 0.95 - gold * 0.06);
    g.uCool.value.setRGB(0.94 - night * 0.06, 0.98 - night * 0.02, 1.05 + night * 0.08);
    // Rain: the light goes to a muted brown haze (the reference shot 6-rain-haze), the colour drained out of it
    if (rain > 0.01 && !under) { const k = Math.min(1, rain * 1.3); g.uWarm.value.lerp(new THREE.Color(1.03, 0.97, 0.86), k); g.uCool.value.lerp(new THREE.Color(0.97, 0.94, 0.88), k); }
    if (under) { g.uWarm.value.setRGB(0.9, 1.02, 1.04); g.uCool.value.setRGB(0.82, 0.98, 1.06); }
    g.uSat.value = under ? 0.9 : 1.08 + day * 0.04 - cloud * 0.1 - Math.min(1, rain * 1.3) * 0.22;
    g.uContrast.value = under ? 0.96 : 1.06 + day * 0.03;
    g.uVignette.value = cave ? 0.42 : 0.3;
  }

  render(dt: number): void { this.composer.render(dt); }
}
