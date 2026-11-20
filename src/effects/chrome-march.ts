import { createLens, HEAD, link, material, QUAD_VERT, type Palette } from "./chrome-lens.ts"

const SHAPES = `
float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}

float smax(float a, float b, float k) { return -smin(-a, -b, k); }

float plate(float d, float z, float h, float r) {
  vec2 w = vec2(d + r, abs(z) - h + r);
  return min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - r;
}

vec3 liquid(vec3 l, vec3 n, vec3 V, float heat) {
  float t = uTime * 0.25;
  vec3 flow = vec3(t, -t * 1.3, t * 0.7);
  n = normalize(n + 0.22 * sin(l.yzx * 7.0 + flow + 2.0 * sin(l.zxy * 3.1 + t * 0.5)) + 0.1 * sin(l.zxy * 15.0 - flow * 1.7));
  float thick = 1000.0 + 350.0 * sin(l.x * 3.0 + l.y * 1.6 + t) + 200.0 * sin(l.y * 2.7 - l.x * 4.0 - t * 1.3 + 1.0);
  thick += (uLight.x + uLight.y) * 60.0;
  heat += 0.12 * sin(l.x * 5.0 + l.y * 1.4 - t);
  n = normalize(n - min(dot(n, V), 0.0) * V);
  return chrome(n, V, thick, heat, 0.0);
}
`

const MARCH = `
vec3 normalAt(vec3 p) {
  vec2 k = vec2(1.0, -1.0) * 0.0008;
  return normalize(k.xyy * map(p + k.xyy) + k.yyx * map(p + k.yyx) + k.yxy * map(p + k.yxy) + k.xxx * map(p + k.xxx));
}

vec3 shade(vec3 pos, vec3 rd) {
  vec3 col = coat(pos, normalAt(pos), -rd);
  float s = 0.004;
  for (int i = 0; i < 24; i++) {
    float d = -map(pos + rd * s);
    if (d < 0.0005) break;
    s += max(d, 0.002);
  }
  vec3 back = pos + rd * s;
  return col + 0.35 * coat(back, -normalAt(back), -rd);
}

void main() {
  vec2 p = (vUv * 2.0 - 1.0) * vec2(uRes.x / uRes.y, 1.0);
  vec3 ro = vec3(0.0, 0.0, CAM);
  vec3 rd = normalize(vec3(p, -CAM));
  float px = 2.0 / (uRes.y * CAM);
  float t = 0.8;
  float prevD = 1e9;
  float prevT = t;
  float cover = 0.0;
  float edge = 0.0;
  bool hit = false;
  for (int i = 0; i < 140; i++) {
    float d = map(ro + rd * t);
    if (d < 0.25 * px * t) {
      hit = true;
      break;
    }
    if (cover == 0.0 && d > prevD && prevD < px * prevT) {
      cover = 1.0 - prevD / (px * prevT);
      edge = prevT;
    }
    prevD = d;
    prevT = t;
    t += d;
    if (t > CAM + 2.5) break;
  }
  vec3 col = vec3(0.0);
  if (hit) col = shade(ro + rd * t, rd);
  if (cover > 0.0) col = mix(col, shade(ro + rd * edge, rd), cover);
  outColor = vec4(min(col, 12.0) * uGain, 1.0);
}`

export function createMarch(canvas: HTMLCanvasElement, palette: Palette, scene: string, cam = 3.2) {
  const lens = createLens(canvas, palette)
  if (!lens) return null
  const { gl } = lens

  const program = link(
    gl,
    QUAD_VERT,
    `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform vec2 uRes;
uniform float uScale;
uniform float uGain;
${HEAD.replace("const float CAM = 3.2;", `const float CAM = ${cam.toFixed(2)};`)}
${material(palette)}
${SHAPES}
${scene}
${MARCH}`,
  )
  const uniform = (name: string) => gl.getUniformLocation(program, name)
  const U = {
    time: uniform("uTime"),
    light: uniform("uLight"),
    res: uniform("uRes"),
    scale: uniform("uScale"),
    gain: uniform("uGain"),
  }

  return {
    lens,
    gl,
    program,
    uniform,
    draw(time: number, lightX: number, lightY: number, scale: number) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, lens.target)
      gl.viewport(0, 0, lens.width, lens.height)
      gl.uniform1f(U.time, time)
      gl.uniform2f(U.light, lightX, lightY)
      gl.uniform2f(U.res, lens.width, lens.height)
      gl.uniform1f(U.scale, scale)
      gl.uniform1f(U.gain, lens.gain)
      lens.drawQuad()
    },
  }
}
