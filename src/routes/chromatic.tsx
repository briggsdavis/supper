import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react"
import { createChromeCutlery } from "../effects/chrome-cutlery.ts"
import type { ChromeScene } from "../effects/chrome-lens.ts"
import { createChromeType } from "../effects/chrome-type.ts"
import { createChromeVeil } from "../effects/chrome-veil.ts"

type Shape = "none" | "text" | "serif"

const FONT = `"SF Pro Display", "Helvetica Neue", Inter, system-ui, sans-serif`
const SERIF = `Didot, "Bodoni 72", "Bodoni MT", "Playfair Display", Georgia, serif`

const pointer = { x: 0, y: 0, t: -Infinity }
if (typeof window !== "undefined") {
  window.addEventListener(
    "pointermove",
    (e) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
      pointer.t = performance.now()
    },
    { passive: true },
  )
}

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uMask;
uniform vec2 uRes;
uniform vec2 uLight;
uniform float uTime;
uniform float uBlur;
uniform int uMode;

const float PI = 3.14159265;

vec3 bump3y(vec3 x, vec3 y0) { return clamp(1.0 - x * x - y0, 0.0, 1.0); }

vec3 spectral(float w) {
  float x = (w - 400.0) / 300.0;
  const vec3 c1 = vec3(3.54585104, 2.93225262, 2.41593945);
  const vec3 x1 = vec3(0.69549072, 0.49228336, 0.27699880);
  const vec3 y1 = vec3(0.02312639, 0.15225084, 0.52607955);
  const vec3 c2 = vec3(3.90307140, 3.21182957, 3.96587128);
  const vec3 x2 = vec3(0.11748627, 0.86755042, 0.66077860);
  const vec3 y2 = vec3(0.84897130, 0.88445281, 0.73949448);
  return bump3y(c1 * (x - x1), y1) + bump3y(c2 * (x - x2), y2);
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
vec2 hash2(vec2 p) {
  float a = hash(p);
  return vec2(a, hash(p + a + 17.0));
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    s += a * noise(p);
    p = p * 2.03 + 7.1;
    a *= 0.5;
  }
  return s;
}

vec3 grating(vec2 s, vec2 g, float d, float spread) {
  vec2 t = vec2(-g.y, g.x);
  float u = abs(dot(s, g)) * d;
  float w = exp(-pow(dot(s, t), 2.0) * spread);
  vec3 c = vec3(0.0);
  for (int m = 1; m <= 6; m++) c += spectral(u / float(m));
  return c * w;
}

vec3 thinFilm(float thickness, float cosT) {
  vec3 c = vec3(0.0);
  vec3 norm = vec3(0.0);
  for (int i = 0; i < 12; i++) {
    float lam = 400.0 + 300.0 * (float(i) + 0.5) / 12.0;
    float phase = 4.0 * PI * 1.33 * thickness * cosT / lam;
    vec3 s = spectral(lam);
    c += s * (0.5 - 0.5 * cos(phase));
    norm += s;
  }
  return c / norm * 2.0;
}

vec3 env(vec3 r) {
  float y = r.y * 3.0;
  vec3 sky = mix(vec3(0.85, 0.88, 0.95), vec3(0.18, 0.2, 0.28), smoothstep(0.0, 1.0, y));
  vec3 ground = mix(vec3(0.08, 0.07, 0.07), vec3(0.45, 0.42, 0.4), smoothstep(-1.0, 0.0, y));
  vec3 c = y > 0.0 ? sky : ground;
  c += (1.0 - smoothstep(0.0, 0.2, abs(y - 0.03))) * 0.6;
  return c;
}

mat2 rot(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}
float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

float gA1;
float gA2;
float gB1;
float gB2;

vec3 toA(vec3 p) {
  p -= vec3(-0.5, -0.05, 0.0);
  p.yz = rot(gA1) * p.yz;
  p.xy = rot(gA2) * p.xy;
  return p;
}
vec3 toB(vec3 p) {
  p -= vec3(1.05, 0.45, -0.7);
  p.xz = rot(gB1) * p.xz;
  p.yz = rot(gB2) * p.yz;
  return p;
}
float map(vec3 p) {
  return min(sdTorus(toA(p), vec2(0.78, 0.24)), sdTorus(toB(p), vec2(0.5, 0.14)));
}
vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.001, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)));
}

float strip(float x, float w) { return 1.0 - smoothstep(w * 0.6, w, abs(x)); }

vec3 studio(vec3 d) {
  vec3 key = normalize(vec3(uLight.x * 0.5, uLight.y * 0.5 + 0.4, 0.8));
  vec3 c = vec3(0.0);
  c += smoothstep(0.9, 0.96, dot(d, key)) * 5.0;
  c += strip(d.x - 0.55 + 0.25 * d.y, 0.07) * smoothstep(-0.5, 0.5, d.y) * 3.0;
  c += strip(d.x + 0.4 - 0.3 * d.y, 0.05) * 3.0 * step(d.z, 0.2);
  c += strip(d.y - 0.35 + 0.2 * d.x, 0.04) * 2.5 * step(d.z, 0.0);
  c += strip(d.x - 0.1 + 0.6 * d.y, 0.03) * 2.0 * step(d.z, -0.3);
  c += strip(d.y + 0.5, 0.08) * 1.5;
  c += vec3(0.15, 0.3, 0.8) * max(-d.y, 0.0) * 0.25;
  c += vec3(1.0, 0.5, 0.2) * pow(max(dot(d, normalize(vec3(0.7, -0.3, 0.2))), 0.0), 16.0) * 1.5;
  return c;
}

mat2 gLR;

float liquid(vec3 p) {
  float t = uTime * 0.25;
  vec3 q = p;
  q.xy = gLR * q.xy;
  q.xz = rot(q.y * 1.1 + t * 0.6) * q.xz;
  q += 0.5 * sin(q.yzx * 1.6 + vec3(t, t * 1.3, t * 0.7));
  q += 0.24 * sin(q.zxy * 3.3 + vec3(t * 1.7, t, t * 1.1) + 1.3);
  q += 0.1 * sin(q.yzx * 6.7 + t * 2.0);
  q += 0.035 * sin(q.zxy * 13.0 - t * 2.5);
  float sheet = abs(q.z + 0.3 * sin(q.y * 1.3 + t)) - 0.07;
  float bound = length(q / vec3(0.95, 2.1, 1.1)) - 1.0;
  return max(sheet, bound) * 0.33;
}

vec3 liquidEnv(vec3 d) {
  vec3 key = normalize(vec3(uLight.x * 0.5, uLight.y * 0.5 + 0.3, 0.8));
  float c = 0.16;
  c += smoothstep(0.55, 0.95, dot(d, key)) * 2.8;
  c += smoothstep(0.2, 1.0, d.y) * 1.3;
  c += strip(d.x - 0.6, 0.25) * 1.1;
  c += strip(d.x + 0.7 + 0.2 * d.y, 0.15) * 0.9;
  c += strip(d.y + 0.35 - 0.3 * d.x, 0.06) * 0.8;
  c *= smoothstep(-0.9, -0.1, d.y) * 0.6 + 0.4;
  return vec3(c);
}

vec3 metalEnv(vec3 d) {
  vec3 c = studio(d);
  c += mix(vec3(0.06, 0.06, 0.07), vec3(0.75, 0.78, 0.85), smoothstep(-0.6, 0.7, d.y));
  c += (1.0 - smoothstep(0.0, 0.08, abs(d.y + 0.05))) * 0.8;
  return c;
}

float ringAngle(vec3 p) {
  vec3 qa = toA(p);
  vec3 qb = toB(p);
  if (sdTorus(qa, vec2(0.78, 0.24)) < sdTorus(qb, vec2(0.5, 0.14))) return atan(qa.y, length(qa.xz) - 0.78);
  return atan(qb.y, length(qb.xz) - 0.5);
}

vec3 ringTangent(vec3 p, vec3 n) {
  float e = 0.002;
  float f0 = ringAngle(p);
  vec3 g = vec3(ringAngle(p + vec3(e, 0.0, 0.0)) - f0, ringAngle(p + vec3(0.0, e, 0.0)) - f0, ringAngle(p + vec3(0.0, 0.0, e)) - f0);
  g -= 6.2831853 * floor(g / 6.2831853 + 0.5);
  g -= n * dot(g, n);
  return normalize(g + 1e-6);
}

vec3 grating3(vec3 s, vec3 T, vec3 B, float d, float spread) {
  float u = abs(dot(s, T)) * d;
  float w = exp(-pow(dot(s, B), 2.0) * spread);
  vec3 c = vec3(0.0);
  for (int m = 1; m <= 6; m++) c += spectral(u / float(m));
  return c * w;
}

vec3 backdrop(vec2 q) {
  float k = (q.x * 0.8 + q.y * 0.5) * 2.2 + uTime * 0.15;
  float bars = strip(fract(k) - 0.5, 0.06) * 2.5;
  vec2 sl = q - uLight;
  float spot = exp(-dot(sl, sl) * 8.0) * 2.0;
  vec3 c = vec3(bars + spot);
  c += vec3(0.2, 0.45, 1.0) * (1.0 - smoothstep(-1.0, 0.2, q.y)) * 0.6;
  vec2 w = q - vec2(1.2, 0.8);
  c += vec3(1.0, 0.5, 0.2) * exp(-dot(w, w) * 1.5) * 1.2;
  return c;
}

float scratches(vec2 x) {
  vec2 ip = floor(x);
  vec2 fp = fract(x);
  float s = 0.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 o = vec2(float(i), float(j));
      vec2 id = ip + o;
      vec2 rel = fp - o - hash2(id);
      float ang = hash(id + 5.3) * PI;
      vec2 dir = vec2(cos(ang), sin(ang));
      float len = 0.3 + 0.7 * hash(id + 2.1);
      float t = clamp(dot(rel, dir), -len, len);
      float dist = length(rel - dir * t);
      s += (1.0 - smoothstep(0.0, 0.015, dist)) * step(0.55, hash(id + 8.8));
    }
  }
  return s;
}

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 p = (vUv * 2.0 - 1.0) * vec2(aspect, 1.0);
  vec4 m = texture(uMask, vUv);

  if (uMode == 9) {
    float t = uTime * 0.25;
    gLR = rot(0.55 + uLight.x * 0.08);
    vec3 ro = vec3(0.0, 0.0, 3.2);
    vec3 rd = normalize(vec3(p, -2.0));
    rd.yz = rot(uLight.y * 0.06) * rd.yz;
    float dist = 0.0;
    float dmin = 9.0;
    bool hit = false;
    for (int i = 0; i < 160; i++) {
      float d = liquid(ro + rd * dist);
      dmin = min(dmin, d);
      if (d < 0.0012 * dist) {
        hit = true;
        break;
      }
      dist += d;
      if (dist > 7.0) break;
    }
    vec3 col = vec3(0.0);
    if (hit) {
      vec3 pos = ro + rd * dist;
      vec2 k = vec2(1.0, -1.0) * 0.0015;
      vec3 n = normalize(k.xyy * liquid(pos + k.xyy) + k.yyx * liquid(pos + k.yyx) + k.yxy * liquid(pos + k.yxy) + k.xxx * liquid(pos + k.xxx));
      vec3 v = -rd;
      vec3 r = reflect(rd, n);
      float nv = max(dot(n, v), 0.0);
      vec3 shift = normalize(n - r * dot(n, r) + 1e-4);
      float amt = 0.12 + 0.5 * pow(1.0 - nv, 2.0);
      float thick = 330.0 + 180.0 * sin(dot(pos, vec3(2.3, 3.1, 1.7)) + t * 2.0) + 110.0 * sin(dot(pos, vec3(-5.1, 2.2, 4.0)) - t * 3.0);
      thick += (uLight.x + uLight.y) * 60.0;
      float cosT = sqrt(1.0 - (1.0 - nv * nv) / 1.8);
      vec3 acc = vec3(0.0);
      vec3 norm = vec3(0.0);
      for (int i = 0; i < 10; i++) {
        float lam = 400.0 + 300.0 * (float(i) + 0.5) / 10.0;
        vec3 ri = normalize(r + shift * (lam - 550.0) / 150.0 * amt);
        float film = 0.5 - 0.5 * cos(4.0 * PI * 1.33 * thick * cosT / lam);
        vec3 sp = spectral(lam);
        acc += sp * liquidEnv(ri) * mix(1.0, film * 2.0, 0.8);
        norm += sp;
      }
      col = acc / norm;
      col += pow(1.0 - nv, 4.0) * 0.9;
    } else {
      col += vec3(1.0, 0.45, 0.18) * exp(-dmin * 160.0) * 0.6;
      col += vec3(0.25, 0.45, 1.0) * exp(-dmin * 320.0) * 0.4;
    }
    col = 1.0 - exp(-col * 1.25);
    outColor = vec4(col, 1.0);
    return;
  }

  if (uMode == 0 || (uMode >= 6 && uMode <= 8)) {
    gA1 = 1.15 + sin(uTime * 0.21) * 0.25 + uLight.y * 0.15;
    gA2 = 0.45 + uTime * 0.12;
    gB1 = uTime * 0.17 + uLight.x * 0.2;
    gB2 = 1.3 + sin(uTime * 0.13) * 0.4;
    vec3 ro = vec3(0.0, 0.0, 3.4);
    vec3 rd = normalize(vec3(p, -2.4));
    float t = 0.0;
    bool hit = false;
    for (int i = 0; i < 100; i++) {
      float d = map(ro + rd * t);
      if (d < 0.001) {
        hit = true;
        break;
      }
      t += d;
      if (t > 8.0) break;
    }
    vec3 col = studio(rd) * 0.02;
    if (hit) {
      vec3 pos = ro + rd * t;
      vec3 n = calcNormal(pos);
      if (uMode == 0) {
      vec3 rin = refract(rd, n, 1.0 / 1.5);
      vec3 q = pos - n * 0.004;
      float s = 0.01;
      for (int i = 0; i < 48; i++) {
        float d = -map(q + rin * s);
        if (d < 0.001) break;
        s += max(d, 0.004);
      }
      vec3 n2 = calcNormal(q + rin * s);
      vec3 acc = vec3(0.0);
      vec3 norm = vec3(0.0);
      for (int i = 0; i < 8; i++) {
        float lam = 400.0 + 300.0 * (float(i) + 0.5) / 8.0;
        float ior = 1.5 + 0.22 * (550.0 - lam) / 150.0;
        vec3 o = refract(rin, -n2, ior);
        if (dot(o, o) < 0.001) o = reflect(rin, -n2);
        vec3 sp = spectral(lam);
        acc += sp * studio(o);
        norm += sp;
      }
      vec3 refr = acc / norm;
      float fres = 0.04 + 0.96 * pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
      vec3 refl = studio(reflect(rd, n));
      col = refr * 0.95 + refl * fres;
      } else {
        vec3 v = -rd;
        vec3 r = reflect(rd, n);
        float nv = max(dot(n, v), 0.0);
        vec3 F0 = vec3(0.92, 0.93, 0.95);
        vec3 F = F0 + (1.0 - F0) * pow(1.0 - nv, 5.0);
        if (uMode == 6) {
          vec3 shift = normalize(n - r * dot(n, r) + 1e-4);
          float amt = 0.15 + 0.6 * pow(1.0 - nv, 2.0);
          vec3 acc = vec3(0.0);
          vec3 norm = vec3(0.0);
          for (int i = 0; i < 8; i++) {
            float lam = 400.0 + 300.0 * (float(i) + 0.5) / 8.0;
            vec3 ri = normalize(r + shift * (lam - 550.0) / 150.0 * amt);
            vec3 sp = spectral(lam);
            acc += sp * metalEnv(ri);
            norm += sp;
          }
          col = acc / norm * F;
        } else if (uMode == 7) {
          col = metalEnv(r) * F * 0.7;
          vec3 T = ringTangent(pos, n);
          vec3 B = cross(n, T);
          vec3 key = normalize(vec3(uLight.x * 0.5, uLight.y * 0.5 + 0.4, 0.8));
          vec3 l2 = normalize(vec3(-0.6, 0.5, 0.6));
          col += grating3(key + v, T, B, 1600.0, 1.5) * 2.0;
          col += grating3(l2 + v, T, B, 1600.0, 1.5) * 1.3;
        } else {
          float thick = 250.0 + 500.0 * fbm(pos.xy * 2.0 + pos.z + uTime * 0.03);
          thick += (uLight.x * 0.5 + uLight.y * 0.3) * 120.0;
          float cosT = sqrt(1.0 - (1.0 - nv * nv) / 2.2);
          vec3 film = thinFilm(thick, cosT);
          col = metalEnv(r) * mix(F, film, 0.85) + film * 0.06;
        }
      }
      float sc = min(scratches(pos.xy * 3.5 + pos.z) + scratches(pos.yz * 5.0 + 3.0) * 0.6, 1.0);
      col += sc * 0.35 * (0.3 + dot(col, vec3(0.33)));
    }
    col = 1.0 - exp(-col * 1.3);
    outColor = vec4(col, 1.0);
    return;
  }

  if (uMode == 2) {
    vec2 dir = (p - uLight * 0.6) * 0.03 + vec2(0.01, -0.004);
    vec2 duv = dir / vec2(aspect, 1.0) * 0.5;
    vec3 acc = vec3(0.0);
    vec3 norm = vec3(0.0);
    for (int i = 0; i < 10; i++) {
      float f = float(i) / 9.0;
      vec2 uv = vUv + duv * (f * 2.0 - 1.0);
      float ink = texture(uMask, uv).r;
      float ghost = texture(uMask, uv + duv * 2.5).g;
      vec3 sp = spectral(400.0 + 300.0 * f);
      acc += sp * (1.0 - ink * 0.9 - ghost * 0.12);
      norm += sp;
    }
    vec3 paper = vec3(0.8, 0.8, 0.79) * (1.05 - 0.28 * length(p / vec2(aspect, 1.0)));
    paper += fbm(p * 3.0) * 0.05;
    vec3 col = paper * acc / norm;
    col += (hash(vUv * uRes + fract(uTime * 7.0) * 100.0) - 0.5) * 0.07;
    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    return;
  }

  vec2 px = 1.0 / uRes;
  float o = max(1.0, uBlur * 0.4);
  float gx = texture(uMask, vUv + vec2(o * px.x, 0.0)).g - texture(uMask, vUv - vec2(o * px.x, 0.0)).g;
  float gy = texture(uMask, vUv + vec2(0.0, o * px.y)).g - texture(uMask, vUv - vec2(0.0, o * px.y)).g;
  vec2 grad = vec2(gx, gy) / (2.0 * o) * uBlur;

  if (uMode == 1) {
    vec3 bgc = backdrop(p) * 0.18;
    if (m.r < 0.002) {
      outColor = vec4(1.0 - exp(-bgc), 1.0);
      return;
    }
    vec3 ng = normalize(vec3(-grad * 4.0, 1.0));
    vec3 rd = normalize(vec3(p * 0.12, -1.0));
    vec3 acc = vec3(0.0);
    vec3 norm = vec3(0.0);
    for (int i = 0; i < 8; i++) {
      float lam = 400.0 + 300.0 * (float(i) + 0.5) / 8.0;
      float ior = 1.5 + 0.25 * (550.0 - lam) / 150.0;
      vec3 dir = refract(rd, ng, 1.0 / ior);
      vec3 sp = spectral(lam);
      acc += sp * backdrop(p + dir.xy * (0.9 + 0.6 * m.g));
      norm += sp;
    }
    vec3 refr = acc / norm;
    float fres = 0.04 + 0.96 * pow(1.0 - ng.z, 5.0);
    vec3 glass = refr * 0.8 + studio(reflect(rd, ng)) * (0.06 + fres);
    vec3 col = mix(bgc, glass, m.r);
    outColor = vec4(1.0 - exp(-col * 1.2), 1.0);
    return;
  }

  float a = m.r;
  if (a < 0.002) {
    outColor = vec4(0.0);
    return;
  }
  vec3 n = normalize(vec3(-grad * 2.5, 1.0));

  vec3 P = vec3(p, 0.0);
  vec3 L = vec3(uLight, 1.4);
  vec3 E = vec3(0.0, 0.0, 3.0);
  vec3 l = normalize(L - P);
  vec3 v = normalize(E - P);
  vec3 h = normalize(l + v);
  vec3 r = reflect(-v, n);
  float spec = pow(max(dot(n, h), 0.0), 80.0);
  vec3 col;

  if (uMode == 3) {
    vec2 g = normalize(p - vec2(-aspect * 0.2, -1.8));
    vec2 s = l.xy + v.xy + n.xy * 1.2;
    vec3 d = grating(s, g, 1600.0, 2.5);
    col = env(r) * 0.45 + d * 0.85 + spec;
  } else if (uMode == 4) {
    vec2 q = p * 14.0;
    vec2 ip = floor(q);
    vec2 fp = fract(q);
    float md = 9.0;
    vec2 id = vec2(0.0);
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 off = vec2(float(i), float(j));
        vec2 dd = off + hash2(ip + off) - fp;
        float dist = dot(dd, dd);
        if (dist < md) {
          md = dist;
          id = ip + off;
        }
      }
    }
    float ang = hash(id) * PI;
    vec2 g = vec2(cos(ang), sin(ang));
    vec2 tilt = (hash2(id + 3.1) - 0.5) * 0.6;
    vec2 s = l.xy + v.xy + n.xy * 0.8 + tilt;
    vec3 d = grating(s, g, 900.0 + 1200.0 * hash(id + 9.0), 1.5);
    vec3 nc = normalize(vec3(tilt * 1.5 + n.xy, 1.0));
    float glint = pow(max(dot(nc, h), 0.0), 300.0);
    col = vec3(0.5, 0.52, 0.56) * 0.3 + env(r) * 0.25 + d * 0.8 + glint * 1.6 + spec * 0.4;
  } else {
    float t = uTime;
    vec2 w = p * 1.3 + vec2(fbm(p * 1.5 + t * 0.05), fbm(p * 1.5 - t * 0.04 + 4.0)) * 1.5;
    float thick = 220.0 + 650.0 * fbm(w + t * 0.03);
    thick += dot(n.xy, l.xy) * 250.0;
    thick += (uLight.x * 0.5 + uLight.y * 0.3) * 120.0;
    float nv = dot(n, v);
    float cosT = sqrt(1.0 - (1.0 - nv * nv) / 1.77);
    vec3 film = thinFilm(thick, cosT);
    col = film * (0.25 + 0.9 * env(r)) + spec * 0.8;
  }

  outColor = vec4(clamp(col, 0.0, 1.0) * a, a);
}`

function buildMask(w: number, h: number, shape: Shape, text: string) {
  const a = document.createElement("canvas")
  a.width = w
  a.height = h
  const ctx = a.getContext("2d")!
  let blur = 1

  if (shape !== "none") {
    const font = shape === "serif" ? `700 {size}px ${SERIF}` : `900 {size}px ${FONT}`
    ctx.font = font.replace("{size}", "100")
    const width = ctx.measureText(text || " ").width || 1
    const size = Math.min((100 * w * 0.88) / width, h * (shape === "serif" ? 0.8 : 0.62))
    ctx.font = font.replace("{size}", String(size))
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillStyle = "#fff"
    ctx.fillText(text, w / 2, h / 2 + size * 0.04)
    blur = size * 0.05
  }

  const b = document.createElement("canvas")
  b.width = w
  b.height = h
  const bctx = b.getContext("2d")!
  bctx.filter = `blur(${blur}px)`
  bctx.drawImage(a, 0, 0)

  const A = ctx.getImageData(0, 0, w, h).data
  const B = bctx.getImageData(0, 0, w, h).data
  const out = new ImageData(w, h)
  for (let i = 0; i < A.length; i += 4) {
    out.data[i] = A[i + 3]
    out.data[i + 1] = B[i + 3]
    out.data[i + 2] = A[i]
    out.data[i + 3] = 255
  }
  return { image: out, blur }
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(s) ?? "shader error")
  return s
}

function ShaderPanel({ mode, shape, text }: { mode: number; shape: Shape; text: string }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const textRef = useRef(text)
  const uploadRef = useRef(() => {})
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const host = hostRef.current!
    const canvas = document.createElement("canvas")
    canvas.className = "block h-full w-full"
    host.appendChild(canvas)
    const gl = canvas.getContext("webgl2", { premultipliedAlpha: true })
    if (!gl) {
      setFailed(true)
      canvas.remove()
      return
    }

    const prog = gl.createProgram()
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    gl.useProgram(prog)

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, "aPos")
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    const u = (name: string) => gl.getUniformLocation(prog, name)
    const uRes = u("uRes")
    const uLight = u("uLight")
    const uTime = u("uTime")
    const uBlur = u("uBlur")
    gl.uniform1i(u("uMask"), 0)
    gl.uniform1i(u("uMode"), mode)

    let blur = 1
    const upload = () => {
      const { width: w, height: h } = canvas
      if (!w || !h) return
      const mask = buildMask(w, h, shape, textRef.current)
      blur = mask.blur
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mask.image)
    }
    uploadRef.current = upload

    const ro = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect()
      const dpr = Math.min(devicePixelRatio, mode === 0 || mode >= 6 ? 1 : 2)
      canvas.width = Math.round(r.width * dpr)
      canvas.height = Math.round(r.height * dpr)
      gl.viewport(0, 0, canvas.width, canvas.height)
      upload()
    })
    ro.observe(canvas)

    let visible = true
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
    })
    io.observe(canvas)

    const light = { x: 0.5, y: 0.6 }
    const start = performance.now()
    let raf = 0
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (!visible || !canvas.width) return
      const rect = canvas.getBoundingClientRect()
      const aspect = rect.width / rect.height
      const t = (now - start) / 1000
      let tx: number
      let ty: number
      if (now - pointer.t < 2500) {
        tx = ((pointer.x - rect.left) / rect.width) * 2 - 1
        tx *= aspect
        ty = -(((pointer.y - rect.top) / rect.height) * 2 - 1)
      } else {
        tx = Math.cos(t * 0.6) * aspect * 0.8
        ty = Math.sin(t * 0.9) * 0.7
      }
      light.x += (tx - light.x) * 0.1
      light.y += (ty - light.y) * 0.1
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform2f(uLight, light.x, light.y)
      gl.uniform1f(uTime, t)
      gl.uniform1f(uBlur, blur)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      gl.getExtension("WEBGL_lose_context")?.loseContext()
      canvas.remove()
    }
  }, [mode, shape])

  useEffect(() => {
    textRef.current = text
    uploadRef.current()
  }, [text])

  return (
    <div ref={hostRef} className="absolute inset-0">
      {failed && (
        <p className="grid h-full place-items-center text-sm text-neutral-500">
          WebGL2 unavailable
        </p>
      )}
    </div>
  )
}

const createOilCutlery = (canvas: HTMLCanvasElement) => createChromeCutlery(canvas, "oil")

function ChromePanel({
  create,
  text = "",
}: {
  create: (canvas: HTMLCanvasElement) => ChromeScene | null
  text?: string
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<ChromeScene | null>(null)
  const textRef = useRef(text)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const host = hostRef.current!
    const canvas = document.createElement("canvas")
    canvas.className = "block h-full w-full"
    host.appendChild(canvas)
    const veil = create(canvas)
    if (!veil) {
      setFailed(true)
      canvas.remove()
      return
    }
    sceneRef.current = veil
    veil.setText?.(textRef.current)

    const ro = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect()
      const dpr = Math.min(devicePixelRatio, 2)
      veil.resize(Math.round(r.width * dpr), Math.round(r.height * dpr))
    })
    ro.observe(canvas)

    let visible = true
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
    })
    io.observe(canvas)

    const light = { x: 0.3, y: 0.3 }
    const start = performance.now()
    let raf = 0
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (!visible) return
      const rect = canvas.getBoundingClientRect()
      const aspect = rect.width / rect.height
      const t = (now - start) / 1000
      let tx: number
      let ty: number
      if (now - pointer.t < 2500) {
        tx = (((pointer.x - rect.left) / rect.width) * 2 - 1) * aspect
        ty = -(((pointer.y - rect.top) / rect.height) * 2 - 1)
      } else {
        tx = Math.cos(t * 0.3) * aspect * 0.5
        ty = Math.sin(t * 0.45) * 0.5
      }
      light.x += (tx - light.x) * 0.06
      light.y += (ty - light.y) * 0.06
      veil.render(t, light.x, light.y)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      sceneRef.current = null
      veil.dispose()
      canvas.remove()
    }
  }, [create])

  useEffect(() => {
    textRef.current = text
    sceneRef.current?.setText?.(text)
  }, [text])

  return (
    <div ref={hostRef} className="absolute inset-0">
      {failed && (
        <p className="grid h-full place-items-center text-sm text-neutral-500">
          WebGL2 unavailable
        </p>
      )}
    </div>
  )
}

const CSS = `
.foil-card {
  --px: 50%; --py: 50%; --rx: 0deg; --ry: 0deg;
  transform: rotateY(var(--rx)) rotateX(var(--ry));
  transition: transform 0.25s ease-out;
  background: linear-gradient(160deg, #3a3f4a, #14161b 60%, #262a33);
}
.foil-holo {
  background-image:
    repeating-linear-gradient(115deg, #ff7773 0%, #ffed5f 7%, #a8ff5f 14%, #83fff7 21%, #7894ff 28%, #d875ff 35%, #ff7773 42%),
    repeating-linear-gradient(-45deg, #0e152e 0%, hsl(180 10% 60%) 3.8%, hsl(180 29% 66%) 4.5%, hsl(180 10% 60%) 5.2%, #0e152e 10%, #0e152e 12%);
  background-size: 400% 400%, 300% 300%;
  background-position: var(--px) var(--py), calc(100% - var(--px)) calc(100% - var(--py));
  background-blend-mode: exclusion;
  mix-blend-mode: color-dodge;
  filter: brightness(0.75) contrast(1.5) saturate(1.3);
}
.foil-glare {
  background: radial-gradient(farthest-corner circle at var(--px) var(--py), rgb(255 255 255 / 0.8) 8%, rgb(255 255 255 / 0.35) 22%, rgb(0 0 0 / 0.5) 90%);
  mix-blend-mode: overlay;
}
.foil-text {
  background-image:
    repeating-linear-gradient(115deg, #c9ced8 0%, #ff8a8a 6%, #ffe97a 10%, #8affb4 14%, #7ac8ff 18%, #c58aff 22%, #e8eaee 28%, #8b919c 36%, #c9ced8 42%);
  background-size: 300% 300%;
  background-position: var(--px) var(--py);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
`

function SplitDemo({ text }: { text: string }) {
  const red = useRef<SVGFEOffsetElement>(null)
  const blue = useRef<SVGFEOffsetElement>(null)
  const set = (x: number, y: number) => {
    red.current?.setAttribute("dx", String(x))
    red.current?.setAttribute("dy", String(y))
    blue.current?.setAttribute("dx", String(-x))
    blue.current?.setAttribute("dy", String(-y))
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    set(x * 24, y * 24)
  }
  return (
    <div
      onPointerMove={move}
      onPointerLeave={() => set(4, 1)}
      className="absolute inset-0 @container"
    >
      <svg className="absolute size-0">
        <filter
          id="ca-split"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feColorMatrix
            in="SourceGraphic"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="r"
          />
          <feOffset ref={red} in="r" dx="4" dy="1" result="ro" />
          <feColorMatrix
            in="SourceGraphic"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="g"
          />
          <feColorMatrix
            in="SourceGraphic"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            result="b"
          />
          <feOffset ref={blue} in="b" dx="-4" dy="-1" result="bo" />
          <feBlend in="ro" in2="g" mode="screen" result="rg" />
          <feBlend in="rg" in2="bo" mode="screen" />
        </filter>
      </svg>
      <div className="flex h-full flex-col items-center justify-center gap-5 [filter:url(#ca-split)]">
        <h2 className="font-serif text-[15cqw] leading-none font-bold text-white italic">{text}</h2>
        <p className="text-[2.2cqw] tracking-[0.4em] text-white/80 uppercase">Dinner and a show</p>
        <div className="flex items-center gap-4">
          <button className="rounded-full border-2 border-white px-6 py-2.5 text-sm font-semibold text-white">
            Reserve a seat
          </button>
          <div className="size-11 rounded-full border-2 border-white" />
          <div className="size-11 rounded-lg bg-white" />
        </div>
      </div>
    </div>
  )
}

function FoilCardDemo({ text }: { text: string }) {
  const card = useRef<HTMLDivElement>(null)
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = card.current!
    const r = el.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
    el.style.setProperty("--px", `${x * 100}%`)
    el.style.setProperty("--py", `${y * 100}%`)
    el.style.setProperty("--rx", `${(x - 0.5) * 28}deg`)
    el.style.setProperty("--ry", `${(0.5 - y) * 28}deg`)
  }
  const leave = () => {
    const el = card.current!
    for (const k of ["--px", "--py", "--rx", "--ry"]) el.style.removeProperty(k)
  }
  return (
    <div
      onPointerMove={move}
      onPointerLeave={leave}
      className="absolute inset-0 grid place-items-center [perspective:900px]"
    >
      <div
        ref={card}
        className="foil-card relative aspect-[5/7] w-[38%] overflow-hidden rounded-2xl shadow-2xl shadow-black/60 @container"
      >
        <div className="absolute inset-0 flex flex-col justify-between p-[7cqw]">
          <span className="foil-text text-[7cqw] font-bold tracking-[0.3em] uppercase">Scenes</span>
          <span className="foil-text text-[22cqw] leading-none font-black break-words">{text}</span>
          <span className="foil-text text-[6cqw] font-semibold tracking-widest">No. 001</span>
        </div>
        <div className="foil-holo pointer-events-none absolute inset-0" />
        <div className="foil-glare pointer-events-none absolute inset-0" />
      </div>
    </div>
  )
}

function Panel({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60">
      <div className="relative aspect-[16/10] bg-[radial-gradient(ellipse_at_center,#1c1d22,#0a0a0c)]">
        {children}
      </div>
      <div className="flex gap-4 border-t border-white/5 px-5 py-4 text-sm">
        <span className="font-mono text-neutral-500 [counter-increment:panel] before:content-[counter(panel,decimal-leading-zero)]" />
        <div>
          <div className="font-medium text-white">{title}</div>
          <div className="text-neutral-500">{note}</div>
        </div>
      </div>
    </section>
  )
}

export default function Chromatic() {
  const [text, setText] = useState("Supper")
  return (
    <div className="min-h-screen bg-neutral-950 px-6 py-10 text-neutral-300">
      <style>{CSS}</style>
      <header className="mx-auto mb-8 flex max-w-6xl flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Chromatic</h1>
          <p className="text-sm text-neutral-500">
            Chromatic experiments: dispersion, chrome, lens split, diffraction, thin film. Move your
            pointer to move the light.
          </p>
        </div>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-56 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none focus:border-white/30"
        />
      </header>
      <div className="mx-auto grid max-w-6xl gap-4 [counter-reset:panel] lg:grid-cols-2">
        <Panel
          title="Chrome veil"
          note="A folded glass sheet with a thin-film coating, lens blur and warm halation. Pointer moves the light and tilts the sheet."
        >
          <ChromePanel create={createChromeVeil} />
        </Panel>
        <Panel
          title="Chrome cutlery"
          note="A fork and knife in the same flame-coated liquid glass. Pointer moves the light and tilts the pair."
        >
          <ChromePanel create={createChromeCutlery} />
        </Panel>
        <Panel
          title="Oil slick cutlery"
          note="The same fork and knife under a classic oil film: magenta, blue, teal and gold."
        >
          <ChromePanel create={createOilCutlery} />
        </Panel>
        <Panel
          title="Chrome type"
          note="Your text as inflated liquid glass in the veil's flame film. Pointer moves the light and turns the word."
        >
          <ChromePanel create={createChromeType} text={text} />
        </Panel>
        <Panel
          title="Liquid chrome"
          note="Flowing silver sheet with a holographic film and spectral reflections. Edges fringe orange and blue."
        >
          <ShaderPanel mode={9} shape="none" text={text} />
        </Panel>
        <Panel
          title="Glass rings"
          note="Raymarched glass with per-wavelength refraction and surface scratches."
        >
          <ShaderPanel mode={0} shape="none" text={text} />
        </Panel>
        <Panel
          title="Spectral chrome"
          note="Mirror silver where each wavelength reflects at a slightly different angle. Strongest at the rims."
        >
          <ShaderPanel mode={6} shape="none" text={text} />
        </Panel>
        <Panel
          title="Holo chrome"
          note="Silver with fine lathe grooves that diffract the lights into rainbow bands, like a CD."
        >
          <ShaderPanel mode={7} shape="none" text={text} />
        </Panel>
        <Panel
          title="Anodized chrome"
          note="Silver under a thin oxide film, like heat-tinted titanium or a bismuth crystal."
        >
          <ShaderPanel mode={8} shape="none" text={text} />
        </Panel>
        <Panel
          title="Glass type"
          note="Letters as beveled glass, dispersing a striped light box behind them."
        >
          <ShaderPanel mode={1} shape="text" text={text} />
        </Panel>
        <Panel
          title="Lens split"
          note="Ink on paper, smeared across the spectrum like a cheap lens. Pointer sets the axis."
        >
          <ShaderPanel mode={2} shape="serif" text={text} />
        </Panel>
        <Panel
          title="Split filter"
          note="SVG filter that splits RGB on any DOM element. Pointer sets the offset."
        >
          <SplitDemo text={text} />
        </Panel>
        <Panel
          title="Pressed disc"
          note="Letters cut from a CD: 1.6µm diffraction grating with a chrome bevel."
        >
          <ShaderPanel mode={3} shape="text" text={text} />
        </Panel>
        <Panel
          title="Holo foil"
          note="Voronoi facets, each with its own grating angle. Glitter sticker vibe."
        >
          <ShaderPanel mode={4} shape="text" text={text} />
        </Panel>
        <Panel
          title="Oil slick"
          note="Thin-film interference over chrome, like soap bubbles or petrol."
        >
          <ShaderPanel mode={5} shape="text" text={text} />
        </Panel>
        <Panel
          title="Foil card"
          note="Pure CSS layered gradients with color-dodge and tilt. Hover the card."
        >
          <FoilCardDemo text={text} />
        </Panel>
      </div>
    </div>
  )
}
