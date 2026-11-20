import { axisAngle, type ChromeScene, type Palette } from "./chrome-lens.ts"
import { createMarch } from "./chrome-march.ts"

const SCENE = `
uniform float uAngle;
uniform float uTilt;

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

float handle(vec3 p, float top, float r) {
  vec2 q = vec2(length(vec2(p.x, p.z * 2.4)), p.y);
  return taper(q, vec2(0.0, -0.9), vec2(0.0, top), 0.088, r) / 2.4;
}

float bound(vec3 p) {
  return length(vec3(p.x, p.y - clamp(p.y, -0.9, 0.9), p.z)) - 0.24;
}

float fork(vec3 p) {
  float b = bound(p);
  if (b > 0.1) return b;
  float lift = max(p.y - 0.25, 0.0);
  p.z -= 0.24 * lift * lift + 1.4 * p.x * p.x * smoothstep(0.15, 0.5, p.y) - 0.03;
  vec2 q = vec2(abs(p.x), p.y);
  float d = roundBox(q - vec2(0.0, 0.46), vec2(0.158, 0.14), vec4(0.11));
  d = smin(d, taper(q, vec2(0.0, 0.05), vec2(0.0, 0.36), 0.03, 0.07), 0.12);
  float tines = min(
    taper(q, vec2(0.042, 0.5), vec2(0.039, 0.97), 0.031, 0.016),
    taper(q, vec2(0.126, 0.5), vec2(0.118, 0.95), 0.031, 0.016));
  d = smin(d, tines, 0.03);
  return smin(handle(p, 0.15, 0.034), plate(d, p.z, 0.016, 0.012), 0.05) * 0.85;
}

float knife(vec3 p) {
  float b = bound(p);
  if (b > 0.1) return b;
  vec2 q = p.xy;
  q.x -= 0.02 * sin(clamp(p.y, 0.0, 1.0) * 2.8);
  float d = roundBox(q - vec2(0.014, 0.59), vec2(0.082, 0.62), vec4(0.03));
  d = smax(d, min(length(q - vec2(-0.254, 0.734)) - 0.35, q.y - 0.734), 0.03);
  float h = mix(0.016, 0.007, smoothstep(-0.068, 0.096, q.x));
  return smin(handle(p, 0.0, 0.052), plate(d, p.z, h, h * 0.8), 0.05) * 0.85;
}

vec3 group(vec3 p) {
  p /= uScale;
  p.xy = rot(-uAngle) * p.xy;
  p.yz = rot(-0.3 - uLight.y * 0.06 * uTilt) * p.yz;
  p.xz = rot(-uLight.x * 0.08 * uTilt) * p.xz;
  p.y -= 0.15;
  return p;
}

vec3 forkSpace(vec3 g) {
  g.x += 0.27;
  g.y -= 0.03 * sin(uTime * 0.5);
  g.xz = rot(0.5 * sin(uTime * 0.31) + 0.15) * g.xz;
  return g;
}

vec3 knifeSpace(vec3 g) {
  g.x -= 0.27;
  g.y -= 0.03 * sin(uTime * 0.5 + 2.0);
  g.xz = rot(0.5 * sin(uTime * 0.27 + 1.7) - 0.2) * g.xz;
  g.x = -g.x;
  return g;
}

float map(vec3 p) {
  vec3 g = group(p);
  return min(fork(forkSpace(g)), knife(knifeSpace(g))) * uScale;
}

vec3 coat(vec3 pos, vec3 n, vec3 V) {
  vec3 g = group(pos);
  vec3 a = forkSpace(g);
  vec3 b = knifeSpace(g);
  return liquid(fork(a) < knife(b) ? a : b + 3.0, n, V, g.y * 0.3);
}
`

export function createChromeCutlery(
  canvas: HTMLCanvasElement,
  palette: Palette = "flame",
  upright = false,
): ChromeScene | null {
  const march = createMarch(canvas, palette, SCENE)
  if (!march) return null
  const { gl, lens } = march
  const uAngle = march.uniform("uAngle")
  const uTilt = march.uniform("uTilt")

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

      gl.useProgram(march.program)
      gl.uniform1f(uAngle, angle)
      gl.uniform1f(uTilt, upright ? 5 : 1)
      march.draw(time, lightX, lightY, length * 0.37 * Math.min(1, 0.6 + 0.4 * aspect))
      lens.present(time, angle, 0.3, upright ? 0 : 1)
    },
    dispose() {
      lens.dispose()
    },
  }
}
