import * as THREE from 'three';

export interface SharedUniforms {
  uTime: { value: number };
  uGlow: { value: number };
  uSunDir: { value: THREE.Vector3 };
  uSkyColor: { value: THREE.Color };
  uSunColor: { value: THREE.Color };
  /** 0 outdoors .. 1 with the camera inside a building: window glass turns see-through. */
  uIndoor: { value: number };
}

export function createSharedUniforms(): SharedUniforms {
  return {
    uTime: { value: 0 },
    uGlow: { value: 0.3 },
    uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
    uSkyColor: { value: new THREE.Color('#8fc4ec') },
    uSunColor: { value: new THREE.Color('#fff1d6') },
    uIndoor: { value: 0 },
  };
}

/** Lambert material that samples the block texture array and adds leaf sway and emissive masks. */
export function createVoxelMaterial(atlas: THREE.DataArrayTexture, shared: SharedUniforms): THREE.MeshLambertMaterial {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uAtlas = { value: atlas };
    shader.uniforms.uTime = shared.uTime;
    shader.uniforms.uGlow = shared.uGlow;
    shader.uniforms.uIndoor = shared.uIndoor;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec2 aMeta;
attribute vec2 aUv;
uniform float uTime;
varying float vLayer;
varying float vSway;
varying vec2 vTileUv;`)
      .replace('#include <begin_vertex>', `vec3 transformed = vec3(position);
if (aMeta.y > 0.5) {
  float ph = position.x * 0.31 + position.z * 0.23 + position.y * 0.17;
  transformed.x += sin(uTime * 1.6 + ph) * 0.045;
  transformed.z += cos(uTime * 1.25 + ph * 1.3) * 0.04;
  transformed.y += sin(uTime * 2.1 + ph * 0.7) * 0.02;
}
vLayer = aMeta.x;
vSway = aMeta.y;
vTileUv = aUv;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
precision highp sampler2DArray;
uniform sampler2DArray uAtlas;
uniform float uGlow;
uniform float uIndoor;
varying float vLayer;
varying float vSway;
varying vec2 vTileUv;`)
      .replace('#include <map_fragment>', `vec4 texel = texture(uAtlas, vec3(vTileUv, floor(vLayer + 0.5)));
if (texel.a < 0.3) discard;
// Leaves (the swaying blocks) have soft alpha edges, which must not read as glow
float glassMask = abs(texel.a - 160.0 / 255.0) < 0.03 ? 1.0 : 0.0;
// From indoors you look out through the glass (a dither fades it as the camera comes inside)
if (glassMask > 0.5 && uIndoor > 0.01 && fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453) < uIndoor) discard;
float emitMask = texel.a < 0.9 && vSway < 0.5 && glassMask < 0.5 ? 1.0 : 0.0;
// Window glass: cool, sky-catching panes by day; the lamplight inside shows as night falls
float nightK = clamp((uGlow - 0.22) / 1.25, 0.0, 1.0);
float lum = dot(texel.rgb, vec3(0.3, 0.5, 0.2));
vec3 dayGlass = vec3(0.42, 0.55, 0.64) * (0.75 + lum * 0.35);
diffuseColor.rgb *= mix(texel.rgb, mix(dayGlass, texel.rgb * 0.35, nightK), glassMask);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += texel.rgb * emitMask * uGlow;
totalEmissiveRadiance += texel.rgb * glassMask * nightK * 1.3;`);
  };
  mat.customProgramCacheKey = () => 'everrealm-voxel';
  return mat;
}

/** Stylised water: depth tint, animated ripples, sky fresnel, shoreline foam, falling-sheet streaks. It darkens
 *  with the day (the sky's night value rides on uGlow), to a moonlit navy at night. */
export function createWaterMaterial(shared: SharedUniforms): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uShallow: { value: new THREE.Color('#4fc0c8') },
        uDeep: { value: new THREE.Color('#1d5a86') },
        uFoam: { value: new THREE.Color('#f4fbff') },
      },
    ]),
    vertexShader: /* glsl */ `
      attribute vec2 aUv;
      attribute vec3 aWater;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vWater;
      varying vec3 vWorld;
      varying vec3 vNormal2;
      #include <fog_pars_vertex>
      void main() {
        vUv = aUv;
        vWater = aWater;
        vec3 p = position;
        if (aWater.z < 0.5) {
          p.y += sin(uTime * 1.3 + position.x * 0.7 + position.z * 0.5) * 0.035 + cos(uTime * 0.9 + position.z * 0.8) * 0.025;
        }
        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorld = world.xyz;
        vNormal2 = normal;
        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uShallow;
      uniform vec3 uDeep;
      uniform vec3 uFoam;
      uniform vec3 uSkyColor;
      uniform vec3 uSunColor;
      uniform vec3 uSunDir;
      uniform float uGlow;
      varying vec2 vUv;
      varying vec3 vWater;
      varying vec3 vWorld;
      varying vec3 vNormal2;
      #include <fog_pars_fragment>
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y);
      }
      void main() {
        float depth = clamp((vWater.x - 1.0) / 5.0, 0.0, 1.0);
        vec3 V = normalize(cameraPosition - vWorld);
        // Night: the body of the water goes to a moonlit navy, and foam and glints dim with it
        float night = clamp((uGlow - 0.22) / 1.25, 0.0, 1.0);
        vec3 shallow = mix(uShallow, vec3(0.06, 0.15, 0.22), night);
        vec3 deepC = mix(uDeep, vec3(0.02, 0.05, 0.11), night);
        vec3 foamC = uFoam * mix(1.0, 0.32, night);
        if (vWater.z > 0.5) {
          // Falling sheet
          float streak = vn(vec2(vUv.x * 6.0, vUv.y * 0.8 + uTime * 3.2));
          float streak2 = vn(vec2(vUv.x * 13.0 + 3.0, vUv.y * 1.6 + uTime * 4.6));
          vec3 c = mix(shallow * 1.1, foamC, smoothstep(0.45, 0.85, streak * 0.6 + streak2 * 0.5));
          gl_FragColor = vec4(c, 0.82);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
          return;
        }
        vec2 p = vWorld.xz;
        float n1 = vn(p * 0.9 + vec2(uTime * 0.35, uTime * 0.2));
        float n2 = vn(p * 2.1 - vec2(uTime * 0.25, uTime * 0.45));
        vec3 N = normalize(vec3((n1 - 0.5) * 0.35 + (n2 - 0.5) * 0.2, 1.0, (n2 - 0.5) * 0.35));
        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        vec3 base = mix(shallow, deepC, depth);
        vec3 col = mix(base, uSkyColor * 1.05, fres * 0.65);
        vec3 R = reflect(-uSunDir, N);
        float spec = pow(max(dot(R, V), 0.0), 90.0);
        col += uSunColor * spec * 0.9;
        // Sparkle bands
        float band = smoothstep(0.72, 0.9, vn(p * 3.0 + uTime * 0.6) * n1);
        col += band * 0.08 * (1.0 - night * 0.75);
        // Shore foam with a breathing edge
        float foamEdge = vWater.y * (0.75 + 0.25 * sin(uTime * 2.0 + p.x * 1.7 + p.y * 1.3));
        float foam = smoothstep(0.25, 0.75, foamEdge + (n2 - 0.5) * 0.4);
        col = mix(col, foamC, foam * 0.75);
        float alpha = mix(0.62, 0.9, depth) + fres * 0.08 + foam * 0.2;
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.97));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
}

export function bindWaterUniforms(mat: THREE.ShaderMaterial, shared: SharedUniforms): void {
  mat.uniforms.uTime = shared.uTime;
  mat.uniforms.uSkyColor = shared.uSkyColor;
  mat.uniforms.uSunColor = shared.uSunColor;
  mat.uniforms.uSunDir = shared.uSunDir;
  mat.uniforms.uGlow = shared.uGlow;
}
