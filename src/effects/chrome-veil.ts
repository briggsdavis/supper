import { axisAngle, createLens, HEAD, link, material, type ChromeScene } from "./chrome-lens.ts"

const NU = 256
const NV = 768

const SURFACE = `
uniform float uAngle;

const float LEN = 2.9;
const float WID = 1.0;

vec3 surface(vec2 g) {
  float t = uTime * 0.1;
  float v = g.y * LEN;
  float w = WID * (0.82 + 0.2 * sin(v * 1.3 + 0.6) + 0.1 * sin(v * 2.9 + 2.0 + t));
  vec3 q = vec3(g.x * w, v, 0.0);
  float tw = 0.8 * sin(v * 0.9 + t * 0.6 + 0.4) + 0.35 * sin(v * 2.1 - t * 0.4 + 2.0);
  q.xz = rot(tw) * q.xz;
  vec3 d = vec3(0.0, uTime * 0.045, 0.0);
  vec3 an = vec3(1.0, 0.55, 1.0);
  q += 0.5 * sin(((q - d) * an).yzx * 1.25 + vec3(0.3, 1.9, 4.1) + t * vec3(0.7, -0.5, 0.9));
  q += 0.32 * sin(((q - d) * an).zxy * 2.3 + vec3(2.1, 0.4, 5.2) + t * vec3(-0.9, 0.6, 0.8));
  q += 0.19 * sin(((q - d) * an).yzx * 4.3 + vec3(1.2, 3.3, 0.7) + t * vec3(1.1, 0.9, -1.3));
  q += 0.1 * sin(((q - d) * an).zxy * 8.1 + vec3(4.4, 2.2, 1.1) + t * vec3(-1.4, 1.2, 1.0));
  q += 0.05 * sin(((q - d) * an).yzx * 15.7 + vec3(0.9, 5.1, 2.6) + t * vec3(1.6, -1.1, 1.3));
  q.yz = rot(-0.45 + uLight.y * 0.05) * q.yz;
  q.xz = rot(uLight.x * 0.06) * q.xz;
  q.xy = rot(uAngle) * q.xy;
  return q;
}
`

const VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aGrid;
uniform float uAspect;
out vec2 vG;
${HEAD}
${SURFACE}
void main() {
  vec3 P = surface(aGrid);
  vG = aGrid;
  float w = CAM - P.z;
  gl_Position = vec4(P.x * CAM / uAspect, P.y * CAM, w - 0.2, w);
}`

const FRAG = `#version 300 es
precision highp float;
in vec2 vG;
out vec4 outColor;
uniform float uGain;
${HEAD}
${SURFACE}
${material("flame")}
void main() {
  vec3 P = surface(vG);
  vec3 du = surface(vG + vec2(0.002, 0.0)) - P;
  vec3 dv = surface(vG + vec2(0.0, 0.0006)) - P;
  vec3 n = normalize(cross(du, dv) + 1e-9);
  vec3 V = normalize(vec3(0.0, 0.0, CAM) - P);
  if (dot(n, V) < 0.0) n = -n;

  float t = uTime * 0.1;
  float v = vG.y * LEN;
  float thick = 1000.0 + 350.0 * sin(vG.x * 2.3 + v * 1.1 + t) + 200.0 * sin(v * 2.7 - vG.x * 3.4 - t * 1.3 + 1.0);
  thick += (uLight.x + uLight.y) * 60.0;
  float heat = 0.08 + vG.y * 0.55 + 0.12 * sin(vG.x * 2.1 + v * 0.7 - t);

  vec3 col = chrome(n, V, thick, heat, smoothstep(0.965, 1.0, abs(vG.x)));
  col *= smoothstep(1.0, 0.8, abs(vG.y));
  outColor = vec4(min(col, 12.0) * uGain, 1.0);
}`

export function createChromeVeil(canvas: HTMLCanvasElement): ChromeScene | null {
  const lens = createLens(canvas, "flame")
  if (!lens) return null
  const { gl } = lens
  const samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES) as number)

  const program = link(gl, VERT, FRAG)
  const u = (name: string) => gl.getUniformLocation(program, name)
  const U = {
    time: u("uTime"),
    angle: u("uAngle"),
    light: u("uLight"),
    aspect: u("uAspect"),
    gain: u("uGain"),
  }

  const grid = new Float32Array((NU + 1) * (NV + 1) * 2)
  for (let j = 0, k = 0; j <= NV; j++) {
    for (let i = 0; i <= NU; i++) {
      grid[k++] = (i / NU) * 2 - 1
      grid[k++] = (j / NV) * 2 - 1
    }
  }
  const index = new Uint32Array(NU * NV * 6)
  for (let j = 0, k = 0; j < NV; j++) {
    for (let i = 0; i < NU; i++) {
      const a = j * (NU + 1) + i
      const b = a + NU + 1
      index[k++] = a
      index[k++] = a + 1
      index[k++] = b
      index[k++] = a + 1
      index[k++] = b + 1
      index[k++] = b
    }
  }
  const mesh = gl.createVertexArray()
  gl.bindVertexArray(mesh)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, grid, gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index, gl.STATIC_DRAW)
  gl.bindVertexArray(null)

  const msaaFbo = gl.createFramebuffer()
  const msaaRb = gl.createRenderbuffer()

  return {
    resize(w, h) {
      if (!lens.resize(w, h)) return
      gl.bindRenderbuffer(gl.RENDERBUFFER, msaaRb)
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, lens.format, w, h)
      gl.bindFramebuffer(gl.FRAMEBUFFER, msaaFbo)
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, msaaRb)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    },
    render(time, lightX, lightY) {
      const { width, height } = lens
      if (!width || !height) return
      const aspect = width / height
      const angle = axisAngle(aspect)

      gl.bindFramebuffer(gl.FRAMEBUFFER, msaaFbo)
      gl.viewport(0, 0, width, height)
      gl.clearColor(0, 0, 0, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE)
      gl.useProgram(program)
      gl.uniform1f(U.time, time)
      gl.uniform1f(U.angle, angle)
      gl.uniform2f(U.light, lightX, lightY)
      gl.uniform1f(U.aspect, aspect)
      gl.uniform1f(U.gain, lens.gain)
      gl.bindVertexArray(mesh)
      gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_INT, 0)
      gl.bindVertexArray(null)
      gl.disable(gl.BLEND)

      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, msaaFbo)
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, lens.target)
      gl.blitFramebuffer(0, 0, width, height, 0, 0, width, height, gl.COLOR_BUFFER_BIT, gl.NEAREST)

      lens.present(time, angle, 0.05)
    },
    dispose() {
      lens.dispose()
    },
  }
}
