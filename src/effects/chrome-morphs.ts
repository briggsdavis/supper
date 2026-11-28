import { CUTLERY_MATH, CUTLERY_PARTS, PRISM_COAT } from "./chrome-cutlery.ts"
import type { ChromeScene } from "./chrome-lens.ts"
import { createMarch } from "./chrome-march.ts"

export type MorphKind = "sweep" | "pool" | "flip"

const HEADER = `
uniform float uMorph;
const float uLay = 0.0;
const float DR = 0.62;
const float DH = 0.0085;
const float HOLE = 0.125;
`

const COMMON = `
float ease(float a, float b, float x) {
  x = clamp((x - a) / (b - a), 0.0, 1.0);
  return x * x * (3.0 - 2.0 * x);
}

float forkAt(vec3 p, float curve) {
  float b = bound(p);
  if (b > 0.2) return b;
  float lift = max(p.y - 0.25, 0.0);
  p.z -= curve * (0.24 * lift * lift + 1.4 * p.x * p.x * smoothstep(0.15, 0.5, p.y) - 0.03);
  return max(b - 0.08, smin(handle(p, 0.15, 0.034), plate(forkHead(p.xy), p.z, 0.016, 0.012), 0.001 + 0.05 * smoothstep(-0.25, 0.1, p.y)) * 0.85);
}

float knifeAt(vec3 p) {
  float b = bound(p);
  if (b > 0.2) return b;
  float h = mix(0.016, 0.007, smoothstep(-0.068, 0.096, p.x - 0.02 * sin(clamp(p.y, 0.0, 1.0) * 2.8)));
  return max(b - 0.08, smin(handle(p, 0.0, 0.052), plate(knifeBlade(p.xy), p.z, h, h * 0.8), 0.05) * 0.85);
}

float disc(vec3 p, float hole) {
  float r = length(p.xy);
  return plate(max(r - DR, hole - r), p.z, DH, DH * 0.7);
}

vec3 lean(vec3 p) {
  p.yz = rot(-0.3 - uLight.y * 0.06) * p.yz;
  p.xz = rot(-uLight.x * 0.08) * p.xz;
  return p;
}

vec3 rest(vec3 p, float k) {
  p.y -= 0.02 * sin(uTime * 0.5 + 1.0) * k;
  p.xz = rot(0.45 * sin(uTime * 0.29 + 0.8) * k) * p.xz;
  p.yz = rot(0.25 * sin(uTime * 0.23) * k) * p.yz;
  p.xy = rot(-uTime * 0.15 * k) * p.xy;
  return p;
}

vec3 forkPose(vec3 q, float k) {
  q.y -= 0.03 * sin(uTime * 0.5) * k;
  q.xz = rot((0.5 * sin(uTime * 0.31) + 0.15) * k) * q.xz;
  return q;
}

vec3 knifePose(vec3 q, float k) {
  q.y -= 0.03 * sin(uTime * 0.5 + 2.0) * k;
  q.xz = rot((0.5 * sin(uTime * 0.27 + 1.7) - 0.2) * k) * q.xz;
  q.x = -q.x;
  return q;
}
`

const DISC_COAT = `
vec3 radialAt(vec3 pos) {
  vec2 e = vec2(0.003, 0.0);
  float f = length(group(pos).xy);
  return normalize(vec3(
    length(group(pos + e.xyy).xy),
    length(group(pos + e.yxy).xy),
    length(group(pos + e.yyx).xy)) - f + 1e-7);
}

float ridge(float u, float c, float w) {
  float k = (u - c) / w;
  return k * exp(-k * k);
}

float bump(float u, float c, float w) {
  float k = (u - c) / w;
  return exp(-k * k);
}

vec3 discCoat(vec3 l, vec3 pos, vec3 n, vec3 V) {
  float u = length(l.xy) / DR;
  vec3 g = radialAt(pos);
  g = normalize(g - n * dot(g, n) + 1e-5);
  n = normalize(n + g * (0.14 * (u - 0.6) + 0.16 * ridge(u, 0.283, 0.014)));
  vec3 col = prism(l, n, V, 0.04);
  vec3 streak = vec3(0.0);
  vec3 total = vec3(0.0);
  for (int i = 0; i < 9; i++) {
    float w = float(i) / 8.0;
    vec3 c = spectral(w);
    streak += glow(reflect(-V, normalize(n + g * (w - 0.5) * 1.5))) * c;
    total += c;
  }
  streak /= total;
  col += mix(vec3(dot(streak, vec3(0.3, 0.5, 0.2))), streak, 0.8) * vec3(0.4, 0.37, 0.5);
  float hub = 1.0 - smoothstep(0.312, 0.319, u);
  float band = (1.0 - smoothstep(0.374, 0.378, u)) * (1.0 - hub);
  col *= mix(1.0, 0.42, hub) * mix(1.0, 0.82, band);
  col *= 1.0 + 0.5 * hub * bump(u, 0.283, 0.012);
  col *= 1.0 - 0.25 * bump(u, 0.376, 0.003) - 0.2 * bump(u, 0.972, 0.004);
  return col;
}
`

const SWEEP = {
  group: `
const float REACH = 0.99;
const float US = DR / REACH;

float pose() { return 1.0 - ease(0.0, 0.12, uMorph); }
float gather() { return ease(0.02, 0.26, uMorph); }
float fan() { return ease(0.22, 0.8, uMorph); }
float flatten() { return ease(0.5, 0.8, uMorph); }
float settle() { return ease(0.8, 1.0, uMorph); }

vec3 group(vec3 p) {
  p /= uScale;
  p = lean(p);
  p = rest(p, settle());
  p.xy = rot(-6.2831853 * ease(0.1, 0.86, uMorph)) * p.xy;
  return p;
}
`,
  body: `
float stack() {
  float ga = gather();
  return (0.026 * ga + 0.05 * sin(PI * ga)) * (1.0 - flatten());
}

float squash() { return mix(1.0, 4.0, flatten()); }

vec3 forkSpace(vec3 q) {
  float ga = gather();
  q.x += 0.27 * (1.0 - ga);
  q.z -= stack();
  q.xy = rot(-PI * 0.25 * ga) * q.xy;
  q = forkPose(q, pose());
  q.z *= squash();
  return q;
}

vec3 knifeSpace(vec3 q) {
  float ga = gather();
  q.x -= 0.27 * (1.0 - ga);
  q.z += stack();
  q.xy = rot(PI * 0.25 * ga) * q.xy;
  q /= 0.9;
  q.y += 0.111;
  q = knifePose(q, pose());
  q.z *= squash();
  return q;
}

float forkD(vec3 q) { return forkAt(forkSpace(q), pose()) / squash(); }
float knifeD(vec3 q) { return knifeAt(knifeSpace(q)) * 0.9 / squash(); }

float sheet(vec3 q) {
  float f = fan();
  if (f <= 0.0) return 1.0;
  vec2 c = rot(-PI * 0.25) * q.xy;
  float r = length(c);
  float S = f * PI * 0.5;
  float A = atan(-c.x, c.y);
  float a = mod(A, PI * 0.5);
  float side = mod(floor(A / (PI * 0.5)), 2.0) < 0.5 ? 1.0 : -1.0;
  float e = a <= S ? -min(a, S - a) : min(a - S, PI * 0.5 - a);
  float tail = clamp(a / S, 0.0, 1.0);
  float reach = REACH * (1.0 - 0.2 * tail * tail * tail * (1.0 - smoothstep(0.7, 1.0, f)));
  float z = q.z - side * stack() * (1.0 - 4.0 * a / PI);
  return plate(max(r * sin(e) - 0.03 * ease(0.66, 0.8, uMorph), r - reach), z, DH / US, DH * 0.7 / US) * 0.8;
}

float us() { return mix(1.0, US, gather()); }

float map(vec3 p) {
  vec3 g = group(p);
  float s = settle();
  if (s >= 1.0) return disc(g, DR * HOLE) * uScale;
  float k = us();
  vec3 q = g / k;
  float d = smin(forkD(q), knifeD(q), 0.001 + 0.03 * flatten());
  d += 0.02 * ease(0.7, 0.84, uMorph);
  d = smin(d, sheet(q), 0.05 * (1.0 - ease(0.7, 0.8, uMorph)) + 0.001) * k;
  if (s > 0.0) d = mix(d, disc(g, DR * HOLE * ease(0.3, 1.0, s)), s);
  return d * uScale;
}

vec3 coat(vec3 pos, vec3 n, vec3 V) {
  vec3 g = group(pos);
  float w = ease(0.72, 0.96, uMorph);
  if (w >= 1.0) return discCoat(g, pos, n, V);
  vec3 q = g / us();
  vec3 a = forkSpace(q);
  vec3 b = knifeSpace(q);
  float df = forkAt(a, pose()) / squash();
  float dk = knifeAt(b) * 0.9 / squash();
  a.z /= squash();
  b.z /= squash();
  float web = smoothstep(-0.02, 0.02, min(df, dk) - sheet(q));
  vec3 l = mix(df < dk ? a : b + 3.0, g, max(web, ease(0.4, 0.8, uMorph)));
  vec3 col = prism(l, n, V, mix(0.3, 0.04, max(web, ease(0.45, 0.85, uMorph))));
  if (w <= 0.0) return col;
  return mix(col, discCoat(g, pos, n, V), w);
}
`,
}

const POOL = {
  group: `
float pose() { return 1.0 - ease(0.0, 0.2, uMorph); }
float melt() { return ease(0.06, 0.7, uMorph); }
float settle() { return ease(0.72, 1.0, uMorph); }

vec3 group(vec3 p) {
  p /= uScale;
  p = lean(p);
  p.y -= 0.1 * (1.0 - melt());
  p = rest(p, settle());
  return p;
}
`,
  body: `
vec3 forkSpace(vec3 g) {
  float me = melt();
  g.x += mix(0.27, 0.2, me);
  g.x += 0.04 * me * sin(g.y * 6.0 + uTime * 1.1);
  g.z += 0.02 * me * sin(g.y * 9.0 - uTime * 0.9);
  return forkPose(g, pose());
}

vec3 knifeSpace(vec3 g) {
  float me = melt();
  g.x -= mix(0.27, 0.2, me);
  g.x += 0.04 * me * sin(g.y * 5.0 - uTime * 1.3 + 2.0);
  g.z += 0.02 * me * sin(g.y * 8.0 + uTime * 0.8 + 1.0);
  return knifePose(g, pose());
}

float utensils(vec3 g) {
  float d = smin(forkAt(forkSpace(g), pose()), knifeAt(knifeSpace(g)), 0.001 + 0.25 * melt());
  float keep = mix(1.5, -0.3, ease(0.1, 0.74, uMorph));
  d = smax(d, length(vec3(g.x * 0.55, g.y - 0.1, g.z)) - keep, 0.3);
  return d * 0.8;
}

float pool(vec3 g) {
  float calm = settle();
  float grow = ease(0.1, 0.8, uMorph);
  float th = atan(g.y, g.x);
  float r = length(g.xy);
  float R = (DR + 0.05) * grow - 0.05;
  R *= 1.0 + (1.0 - calm) * (0.06 * sin(3.0 * th + uTime * 0.7) + 0.035 * sin(5.0 * th - uTime * 1.1));
  float h = mix(0.04, DH, ease(0.35, 0.95, uMorph));
  h += (1.0 - calm) * 0.0035 * sin(r * 42.0 - uTime * 4.0) * smoothstep(0.0, 0.12, R - r);
  float hole = DR * HOLE * ease(0.84, 1.0, uMorph);
  return plate(max(r - R, hole - r), g.z, h, h * 0.8) * 0.8;
}

float map(vec3 p) {
  vec3 g = group(p);
  float s = settle();
  if (s >= 1.0) return disc(g, DR * HOLE) * uScale;
  float d = smin(utensils(g), pool(g), mix(0.03, 0.24, melt()) * (1.0 - s) + 0.002);
  if (s > 0.0) d = mix(d, disc(g, DR * HOLE), s);
  return d * uScale;
}

vec3 coat(vec3 pos, vec3 n, vec3 V) {
  vec3 g = group(pos);
  float w = ease(0.66, 0.96, uMorph);
  if (w >= 1.0) return discCoat(g, pos, n, V);
  vec3 a = forkSpace(g);
  vec3 b = knifeSpace(g);
  vec3 l = mix(forkAt(a, pose()) < knifeAt(b) ? a : b + 3.0, g, ease(0.04, 0.3, uMorph));
  vec3 col = prism(l, n, V, mix(0.3, 0.55, melt()));
  if (w <= 0.0) return col;
  return mix(col, discCoat(g, pos, n, V), w);
}
`,
}

const FLIP = {
  group: `
float pose() { return 1.0 - ease(0.0, 0.2, uMorph); }
float toss() { return ease(0.06, 0.94, uMorph); }
float turn() { return 3.0 * PI * toss(); }
float swap() { return smoothstep(-0.2, 0.2, turn() - 1.5 * PI); }
float settle() { return ease(0.8, 1.0, uMorph); }

vec3 group(vec3 p) {
  float arc = sin(PI * toss());
  p.z -= 0.3 * arc;
  p.y -= 0.1 * arc;
  p /= uScale;
  p = lean(p);
  p = rest(p, settle());
  p.yz = rot(turn()) * p.yz;
  p.xy = rot(0.5 * arc) * p.xy;
  return p;
}
`,
  body: `
vec3 forkSpace(vec3 g) {
  g.x += mix(0.27, 0.19, toss() * 2.0);
  return forkPose(g, pose());
}

vec3 knifeSpace(vec3 g) {
  g.x -= mix(0.27, 0.19, toss() * 2.0);
  g.y += 0.1 * min(toss() * 2.0, 1.0);
  return knifePose(g, pose());
}

float map(vec3 p) {
  vec3 g = group(p);
  float w = swap();
  if (w >= 1.0) return disc(g, DR * HOLE) * uScale;
  float d = min(forkAt(forkSpace(g), pose()), knifeAt(knifeSpace(g)));
  if (w > 0.0) d = mix(d, disc(g, DR * HOLE), w) * 0.8;
  return d * uScale;
}

vec3 coat(vec3 pos, vec3 n, vec3 V) {
  vec3 g = group(pos);
  float w = swap();
  if (w >= 1.0) return discCoat(g, pos, n, V);
  vec3 a = forkSpace(g);
  vec3 b = knifeSpace(g);
  vec3 col = prism(forkAt(a, pose()) < knifeAt(b) ? a : b + 3.0, n, V, 0.3);
  if (w <= 0.0) return col;
  return mix(col, discCoat(g, pos, n, V), w);
}
`,
}

const KINDS = { sweep: SWEEP, pool: POOL, flip: FLIP }

export function createChromeMorph(
  canvas: HTMLCanvasElement,
  kind: MorphKind,
  morph: () => number,
): ChromeScene | null {
  const { group, body } = KINDS[kind]
  const march = createMarch(
    canvas,
    "flame",
    HEADER + CUTLERY_MATH + CUTLERY_PARTS + COMMON + PRISM_COAT + group + DISC_COAT + body,
  )
  if (!march) return null
  const { gl, lens } = march
  const uMorph = march.uniform("uMorph")
  let progress = 0
  let lastTime: number | undefined

  return {
    resize(w, h) {
      lens.resize(w, h)
    },
    render(time, lightX, lightY) {
      const { width, height } = lens
      if (!width || !height) return
      const target = Math.max(0, Math.min(1, morph()))
      const follow = lastTime === undefined ? 1 : -Math.expm1(-16 * (time - lastTime))
      progress += (target - progress) * follow
      lastTime = time
      const m = Math.abs(target - progress) < 0.0001 ? target : progress
      const grow = m * m * (3 - 2 * m)
      const scale = (0.8 + 0.2 * grow) * Math.min(1, (1.4 * width) / height)

      gl.useProgram(march.program)
      gl.uniform1f(uMorph, m)
      march.draw(time, lightX, lightY, scale)
      lens.present(time, 0, 0, 0)
    },
    dispose() {
      lens.dispose()
    },
  }
}
