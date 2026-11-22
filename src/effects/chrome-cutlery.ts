import { axisAngle, type ChromeScene, type Palette } from "./chrome-lens.ts"
import { createMarch } from "./chrome-march.ts"

const SCENE = `
uniform float uAngle;
uniform float uTilt;
uniform float uMorph;
uniform float uDrop;
uniform float uPrism;

float cro(vec2 a, vec2 b) { return a.x * b.y - a.y * b.x; }

float taper(vec2 p, vec2 pa, vec2 pb, float ra, float rb) {
  p -= pa;
  pb -= pa;
  float h = dot(pb, pb);
  vec2 q = vec2(dot(p, vec2(pb.y, -pb.x)), dot(p, pb)) / h;
  q.x = abs(q.x);
  float b = ra - rb;
  vec2 c = vec2(sqrt(h - b * b), b);
  float k = cro(c, q);
  float m = dot(c, q);
  float n = dot(q, q);
  if (k < 0.0) return sqrt(h * n) - ra;
  if (k > c.x) return sqrt(h * (n + 1.0 - 2.0 * q.y)) - rb;
  return m - ra;
}

float roundBox(vec2 p, vec2 b, vec4 r) {
  r.xy = p.x > 0.0 ? r.xy : r.zw;
  r.x = p.y > 0.0 ? r.x : r.y;
  vec2 q = abs(p) - b + r.x;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
}

float pose() {
  return 1.0 - smoothstep(0.0, 0.2, uMorph);
}

float curl() {
  float t = smoothstep(0.08, 0.62, uMorph);
  return t * t * (3.0 - 2.0 * t);
}

float fill() {
  return clamp((uMorph - 0.52) / 0.45, 0.0, 1.0);
}

float melt() {
  return smoothstep(0.0, 0.6, fill());
}

float far() {
  return 0.12 + 0.2 * curl();
}

const float RING = 0.55;

vec3 bend(vec2 q, float center) {
  float k = curl() / RING;
  q.y -= center;
  if (k < 1e-4) return vec3(q.x, q.y + center, 1.0);
  float R = 1.0 / k;
  vec2 d = q - vec2(R, 0.0);
  float rho = length(d);
  float theta = atan(d.y, -d.x);
  return vec3(R - rho, R * theta + center, clamp(rho * k, 0.45, 1.0));
}

float handle(vec3 p, float top, float r) {
  vec2 q = vec2(length(vec2(p.x, p.z * 2.4)), p.y);
  return taper(q, vec2(0.0, -0.9), vec2(0.0, top), 0.088, r) / 2.4;
}

float bound(vec3 p) {
  return length(vec3(p.x, p.y - clamp(p.y, -0.9, 0.9), p.z)) - 0.24;
}

float forkHead(vec2 p) {
  vec2 q = vec2(abs(p.x), p.y);
  float d = roundBox(q - vec2(0.0, 0.46), vec2(0.158, 0.14), vec4(0.11));
  d = smin(d, taper(q, vec2(0.0, -0.25), vec2(0.0, 0.36), 0.006, 0.07), 0.12);
  float tines = min(
    taper(q, vec2(0.042, 0.5), vec2(0.039, 0.97), 0.031, 0.016),
    taper(q, vec2(0.126, 0.5), vec2(0.118, 0.95), 0.031, 0.016));
  return smin(d, tines, 0.03);
}

float knifeBlade(vec2 q) {
  q.x -= 0.02 * sin(clamp(q.y, 0.0, 1.0) * 2.8);
  float d = roundBox(q - vec2(0.014, 0.59), vec2(0.082, 0.62), vec4(0.03));
  return smax(d, min(length(q - vec2(-0.254, 0.734)) - 0.35, q.y - 0.734), 0.03);
}

float fork(vec4 q) {
  vec3 p = q.xyz;
  float b = bound(p) * q.w;
  if (b > far()) return b;
  float lift = max(p.y - 0.25, 0.0);
  p.z -= pose() * (0.24 * lift * lift + 1.4 * p.x * p.x * smoothstep(0.15, 0.5, p.y) - 0.03);
  return max(b - 0.08 * q.w, smin(handle(p, 0.15, 0.034), plate(forkHead(p.xy), p.z, 0.016, 0.012), 0.001 + 0.05 * smoothstep(-0.25, 0.1, p.y)) * 0.85 * q.w);
}

float knife(vec4 q) {
  vec3 p = q.xyz;
  float b = bound(p) * q.w;
  if (b > far()) return b;
  float h = mix(0.016, 0.007, smoothstep(-0.068, 0.096, p.x - 0.02 * sin(clamp(p.y, 0.0, 1.0) * 2.8)));
  return max(b - 0.08 * q.w, smin(handle(p, 0.0, 0.052), plate(knifeBlade(p.xy), p.z, h, h * 0.8), 0.05) * 0.85 * q.w);
}

vec3 group(vec3 p) {
  p.y += uDrop * (1.0 - curl());
  p /= uScale;
  p.xy = rot(-uAngle) * p.xy;
  p.yz = rot(-0.3 - uLight.y * 0.06 * uTilt) * p.yz;
  p.xz = rot(-uLight.x * 0.08 * uTilt) * p.xz;
  p.y -= 0.15 * (1.0 - curl());
  float sway = smoothstep(0.7, 1.0, uMorph);
  p.y -= 0.02 * sin(uTime * 0.5 + 1.0) * sway;
  p.xz = rot(0.45 * sin(uTime * 0.29 + 0.8) * sway) * p.xz;
  p.yz = rot(0.25 * sin(uTime * 0.23) * sway) * p.yz;
  return p;
}

float spread() {
  return mix(0.27, RING, curl());
}

vec4 forkSpace(vec3 g) {
  g.x += spread();
  g.y -= 0.03 * sin(uTime * 0.5) * pose();
  g.xz = rot((0.5 * sin(uTime * 0.31) + 0.15) * pose()) * g.xz;
  vec3 b = bend(g.xy, 0.04);
  return vec4(b.xy, g.z, b.z);
}

vec4 knifeSpace(vec3 g) {
  g.x -= spread();
  g.y -= 0.03 * sin(uTime * 0.5 + 2.0) * pose();
  g.xz = rot((0.5 * sin(uTime * 0.27 + 1.7) - 0.2) * pose()) * g.xz;
  g.x = -g.x;
  g.y += 0.11 * curl();
  vec3 b = bend(g.xy, 0.15);
  return vec4(b.xy, g.z, b.z);
}

float cutlery(vec3 g) {
  vec4 a = forkSpace(g);
  vec4 b = knifeSpace(g);
  return smin(fork(a), knife(b), 0.001 + 0.04 * smoothstep(0.0, 0.5, curl()));
}

float disc(vec3 p) {
  float f = fill();
  float r = length(p.xy - vec2(0.0, 0.04 * (1.0 - f)));
  float inner = mix(0.44, 0.075, smoothstep(0.4, 1.0, f));
  float outer = mix(0.7, 0.62, smoothstep(0.1, 0.7, f));
  return plate(max(r - outer, inner - r), p.z, 0.014, 0.011);
}

float map(vec3 p) {
  vec3 g = group(p);
  float f = fill();
  float m = melt();
  if (m >= 1.0) return disc(g) * uScale;
  float d = cutlery(g);
  if (f > 0.0) d = mix(d, disc(g), m);
  return d * uScale;
}

float scratchHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float scratches(vec2 p) {
  float s = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float scale = 4.0 + fi * fi * 3.1;
    vec2 q = rot(fi * 2.39) * p * scale + vec2(fi * 17.31, fi * 5.77);
    vec2 id = floor(q);
    vec2 f = fract(q) - 0.5;
    float h = scratchHash(id + fi * 3.7);
    if (h < 0.62 + 0.06 * fi) continue;
    float h2 = scratchHash(id + 41.3);
    float h3 = scratchHash(id + 87.9);
    float h4 = scratchHash(id + 12.6);
    float len = mix(0.04, 0.45, h2 * h2);
    vec2 c = (vec2(h3, h4) - 0.5) * (0.9 - 2.0 * len);
    vec2 d = rot(h3 * 6.2832 + h * 11.0) * (f - c);
    d.y += (h4 - 0.5) * 0.6 * d.x * d.x;
    float w = mix(0.0025, 0.009, h4) * scale;
    float line = 1.0 - smoothstep(0.0, w, abs(d.y));
    float span = 1.0 - smoothstep(len * 0.6, len, abs(d.x));
    float taper = 1.0 - abs(d.x) / len * 0.6;
    s += line * span * taper * mix(0.35, 1.0, h2);
  }
  return min(s, 1.0);
}

vec3 spectral(float w) {
  return clamp(1.5 - abs(4.0 * w - vec3(3.0, 2.0, 1.0)), 0.0, 1.0);
}

float band(float x, float w) {
  return exp(-x * x / (w * w));
}

float glow(vec3 d) {
  vec2 m = uLight * 0.35;
  float t = uTime * 0.05;
  float c = 0.0;
  c += 2.2 * band(dot(d, normalize(vec3(0.85, 0.5, 0.0))) - 0.15 - m.x, 0.09);
  c += 1.6 * band(dot(d, normalize(vec3(-0.4, 0.9, 0.0))) + 0.35 - m.y + 0.1 * sin(t), 0.06);
  c += 1.2 * band(dot(d, normalize(vec3(0.95, -0.3, 0.0))) + 0.55 + 0.1 * sin(t * 1.3), 0.12);
  c += 3.5 * pow(max(dot(d, normalize(vec3(0.35 + m.x, 0.55 + m.y, 0.75))), 0.0), 60.0);
  c *= smoothstep(-0.6, 0.3, d.z);
  return c;
}

vec3 prism(vec3 l, vec3 n, vec3 V, float wobble) {
  float t = uTime * 0.2;
  n = normalize(n + wobble * sin(l.yzx * 3.4 + vec3(t, -t, t * 0.7) + 1.7 * sin(l.zxy * 1.4)));
  n = normalize(n - min(dot(n, V), 0.0) * V);
  float nv = max(dot(n, V), 0.0);
  vec3 R = reflect(-V, n);
  vec3 shift = normalize(n - R * dot(n, R) + 1e-4);
  float amt = 0.22 + 0.3 * pow(1.0 - nv, 1.5);
  vec3 col = vec3(0.0);
  vec3 total = vec3(0.0);
  for (int i = 0; i < 9; i++) {
    float w = float(i) / 8.0;
    vec3 c = spectral(w);
    col += glow(normalize(R + shift * (w - 0.5) * amt)) * c;
    total += c;
  }
  col /= total;
  float luma = dot(col, vec3(0.3, 0.5, 0.2));
  col = max(mix(vec3(luma), col, 1.6), 0.0) * vec3(1.15, 1.05, 1.4);
  col += vec3(0.01, 0.012, 0.02);
  float fres = pow(1.0 - nv, 3.0);
  col += fres * vec3(0.25, 0.35, 0.6);
  float sc = scratches(l.xy + l.z * 0.5);
  col += sc * (0.12 + 0.8 * glow(normalize(R + shift * 0.2))) * vec3(0.9, 0.95, 1.0);
  return col;
}

vec3 discCoat(vec3 l, vec3 pos, vec3 n, vec3 V) {
  float r = length(l.xy);
  vec3 radial = pos - n * dot(pos, n);
  radial /= length(radial) + 1e-4;
  float k = (r - 0.165) / 0.009;
  float lip = (r - 0.085) / 0.006;
  n = normalize(n + radial * (0.22 * (r - 0.38) + 0.8 * k * exp(-k * k) + 0.5 * lip * exp(-lip * lip)));
  vec3 col = prism(l, n, V, 0.04);
  float hub = (1.0 - smoothstep(0.15, 0.158, r)) * (1.0 - exp(-lip * lip));
  return col * mix(1.0, 0.3, hub);
}

vec3 coat(vec3 pos, vec3 n, vec3 V) {
  vec3 g = group(pos);
  float w = fill();
  if (w >= 1.0) return discCoat(g, pos, n, V);
  vec4 a = forkSpace(g);
  vec4 b = knifeSpace(g);
  vec3 l = mix(fork(a) < knife(b) ? a.xyz : b.xyz + 3.0, g, smoothstep(0.0, 0.2, curl()));
  vec3 col = uPrism > 0.5 ? prism(l, n, V, 0.3) : liquid(l, n, V, g.y * 0.3);
  if (w <= 0.0) return col;
  return mix(col, discCoat(g, pos, n, V), w);
}
`

export function createChromeCutlery(
  canvas: HTMLCanvasElement,
  palette: Palette = "flame",
  upright = false,
  morph?: () => number,
  drop = 0,
  prismCoat = false,
): ChromeScene | null {
  const march = createMarch(canvas, palette, SCENE)
  if (!march) return null
  const { gl, lens } = march
  const uAngle = march.uniform("uAngle")
  const uTilt = march.uniform("uTilt")
  const uMorph = march.uniform("uMorph")
  const uDrop = march.uniform("uDrop")
  const uPrism = march.uniform("uPrism")
  let progress = 0
  let lastTime: number | undefined

  return {
    resize(w, h) {
      lens.resize(w, h)
    },
    render(time, lightX, lightY) {
      const { width, height } = lens
      if (!width || !height) return
      const aspect = width / height
      const angle = upright ? 0 : axisAngle(aspect)
      const length = Math.min(
        1.7 / Math.abs(Math.cos(angle)),
        (1.7 * aspect) / Math.abs(Math.sin(angle)),
      )
      const target = Math.max(0, Math.min(1, morph?.() ?? 0))
      const follow = lastTime === undefined ? 1 : -Math.expm1(-16 * (time - lastTime))
      progress += (target - progress) * follow
      lastTime = time
      const m = Math.abs(target - progress) < 0.0001 ? target : progress
      const scale = length * 0.37 * Math.min(1, 0.6 + 0.4 * aspect)

      gl.useProgram(march.program)
      gl.uniform1f(uAngle, angle)
      gl.uniform1f(uTilt, upright ? 5 : 1)
      gl.uniform1f(uMorph, m)
      gl.uniform1f(uDrop, drop)
      gl.uniform1f(uPrism, prismCoat ? 1 : 0)
      march.draw(time, lightX, lightY, scale + (Math.min(scale, 1) - scale) * m)
      lens.present(time, angle, 0.3 * (1 - m), upright ? 0 : 1 - 0.6 * m)
    },
    dispose() {
      lens.dispose()
    },
  }
}
