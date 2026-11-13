import * as THREE from 'three';

// Mist that lies low (the graphics overhaul, owner 2026-11-06: "rain in a brown haze, ridges fading into fog layer
// by layer"): every material's fog gets a band of mist over it, thickest at the bottom, thinning to nothing at its
// top, so the valleys and the water fill with it and the ridges stand out of it one behind another. Sky.update sets
// how high it lies, how deep and how thick: heavy in the early morning and in rain, light by day.
//
// One set of numbers for every material: a plain {x, y, z, w} (not a Vector4, which each material would copy) is
// shared by reference when three clones a material's uniforms, so setting it here sets it everywhere.

/** x: the mist's top (world height), y: how deep its band is, z: how fast it thickens with distance, w: how much (0..1). */
export const MIST = { x: 24, y: 12, z: 0.012, w: 0 };

let installed = false;
export function installMist(): void {
  if (installed) return;
  installed = true;
  const C = THREE.ShaderChunk as unknown as Record<string, string>;
  C.fog_pars_vertex = `
#ifdef USE_FOG
  varying float vFogDepth;
  varying float vFogY;
#endif`;
  // (the world height from the view position: the camera's height plus the view offset turned back into the world)
  C.fog_vertex = `
#ifdef USE_FOG
  vFogDepth = - mvPosition.z;
  vFogY = cameraPosition.y + (transpose(mat3(viewMatrix)) * mvPosition.xyz).y;
#endif`;
  C.fog_pars_fragment = `
#ifdef USE_FOG
  uniform vec3 fogColor;
  uniform vec4 uMist;
  varying float vFogDepth;
  varying float vFogY;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
#endif`;
  C.fog_fragment = `
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
  #else
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
  #endif
  if ( uMist.w > 0.001 ) {
    // how far down into the band this point lies, and how much mist lies between it and the eye
    float sunk = clamp( ( uMist.x - vFogY ) / max( uMist.y, 0.01 ), 0.0, 1.0 );
    float through = 1.0 - exp( - vFogDepth * uMist.z * ( 0.35 + sunk ) );
    fogFactor = max( fogFactor, sunk * sunk * through * uMist.w );
  }
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`;
  const mist = { value: MIST };
  (THREE.UniformsLib.fog as Record<string, { value: unknown }>).uMist = mist;
  for (const k of Object.keys(THREE.ShaderLib)) {
    const u = (THREE.ShaderLib as Record<string, { uniforms: Record<string, { value: unknown }> }>)[k].uniforms;
    if (u && u.fogColor) u.uMist = mist;
  }
}
installMist();
