import * as THREE from 'three';

// Rain (streaks) or snow (flakes) in a box that wraps round the camera. The drops keep their place
// in the world as you move; the shader does the falling, so it costs nothing per frame. uAmount
// thins the fall by switching drops off (each has a random rank).

const RAIN_N = 3200, SNOW_N = 2600;
export const PRECIP_BOX = new THREE.Vector3(44, 28, 44);

export interface Precip { obj: THREE.LineSegments | THREE.Points; mat: THREE.ShaderMaterial }

/**
 * What's overhead round the camera, a block to a texel across COVER_N blocks: the height below which
 * no drop falls (the ground, a floor, a roof's underside). Without it the fall goes on through roofs
 * and ceilings and it rains in the parlour. Shared by the rain and the snow; Sky fills it.
 */
export const COVER_N = 48;
export function coverTexture(): THREE.DataTexture {
  const t = new THREE.DataTexture(new Float32Array(COVER_N * COVER_N).fill(-1e4), COVER_N, COVER_N, THREE.RedFormat, THREE.FloatType);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

export function precipitation(kind: 'rain' | 'snow', cover: THREE.DataTexture, coverAt: THREE.Vector2): Precip {
  const rain = kind === 'rain';
  const n = rain ? RAIN_N : SNOW_N, per = rain ? 2 : 1;
  const pos = new Float32Array(n * per * 3), end = new Float32Array(n * per), rnd = new Float32Array(n * per);
  for (let i = 0; i < n; i++) {
    const x = Math.random() * PRECIP_BOX.x, y = Math.random() * PRECIP_BOX.y, z = Math.random() * PRECIP_BOX.z, r = Math.random();
    for (let k = 0; k < per; k++) {
      const j = i * per + k;
      pos.set([x, y, z], j * 3);
      end[j] = k;
      rnd[j] = r;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  g.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1));
  const fall = rain
    ? 'p.y = mod(p.y - uTime * (19.0 + aRand * 6.0), uBox.y); p.xz += uWind * p.y * 0.04;'
    : 'p.y = mod(p.y - uTime * (1.6 + aRand * 0.9), uBox.y); p.x += sin(uTime * 0.9 + aRand * 40.0) * 0.6 + uWind.x * p.y * 0.08; p.z += cos(uTime * 0.7 + aRand * 30.0) * 0.6;';
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uBox: { value: PRECIP_BOX }, uAmount: { value: 0 },
      uCover: { value: cover }, uCoverAt: { value: coverAt },
      uWind: { value: new THREE.Vector2(1.5, 0.6) }, uColor: { value: new THREE.Color(rain ? '#c4d0dc' : '#ffffff') }, uOpacity: { value: 0.5 },
    },
    vertexShader: [
      'attribute float aEnd; attribute float aRand;',
      'uniform float uTime; uniform vec3 uCam; uniform vec3 uBox; uniform float uAmount; uniform vec2 uWind;',
      'uniform sampler2D uCover; uniform vec2 uCoverAt;',
      'varying float vOn;',
      'void main(){',
      '  vec3 p = position;',
      '  ' + fall,
      '  p.x = mod(p.x - uCam.x + uBox.x * 0.5, uBox.x) - uBox.x * 0.5 + uCam.x;',
      '  p.z = mod(p.z - uCam.z + uBox.z * 0.5, uBox.z) - uBox.z * 0.5 + uCam.z;',
      '  p.y += uCam.y - uBox.y * 0.45;',
      rain ? '  p.y += aEnd * 0.75; p.xz += aEnd * uWind * 0.03;' : '',
      '  vOn = aRand < uAmount ? 1.0 : 0.0;',
      // Under whatever's overhead, nothing falls
      '  vec2 cuv = (floor(p.xz) - uCoverAt + 0.5) / ' + COVER_N.toFixed(1) + ';',
      '  if (cuv.x > 0.0 && cuv.x < 1.0 && cuv.y > 0.0 && cuv.y < 1.0 && p.y < texture2D(uCover, cuv).r) vOn = 0.0;',
      '  vec4 mv = viewMatrix * vec4(p, 1.0);',
      rain ? '' : '  gl_PointSize = clamp(90.0 / -mv.z, 1.5, 7.0);',
      '  gl_Position = projectionMatrix * mv;',
      '}',
    ].join('\n'),
    fragmentShader: [
      'uniform vec3 uColor; uniform float uOpacity; varying float vOn;',
      'void main(){',
      '  if (vOn < 0.5) discard;',
      rain
        ? '  gl_FragColor = vec4(uColor, uOpacity);'
        : '  vec2 c = gl_PointCoord - 0.5; float d = dot(c, c); if (d > 0.25) discard; gl_FragColor = vec4(uColor, uOpacity * (1.0 - d * 3.0));',
      '}',
    ].join('\n'),
  });
  const obj = rain ? new THREE.LineSegments(g, mat) : new THREE.Points(g, mat);
  obj.frustumCulled = false;
  obj.visible = false;
  obj.renderOrder = 5;
  return { obj, mat };
}
