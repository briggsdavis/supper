import { HEAD, QUAD_VERT, link, material } from "./chrome-lens.ts"

const FRAG = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 uRes;
uniform float uFade;
${HEAD}
${material("flame")}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float surf(vec2 p, float t) {
  vec2 q = p;
  q += 0.35 * sin(q.yx * vec2(1.7, 2.1) + vec2(t * 0.6, -t * 0.5));
  q += 0.18 * sin(q.yx * vec2(3.3, 2.7) + vec2(-t * 0.9, t * 0.7) + 1.3);
  float h = 0.5 * sin(q.x * 2.2 + t * 0.4) * sin(q.y * 1.9 - t * 0.3);
  h += 0.22 * sin(length(q) * 5.0 - t * 1.4);
  h += 0.08 * sin(q.x * 7.0 - q.y * 5.0 + t);
  return h * 0.22;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y * 2.0;
  float t = uTime;
  float e = 1.5 / uRes.y;
  float h = surf(p, t);
  vec2 g = vec2(surf(p + vec2(e, 0.0), t) - h, surf(p + vec2(0.0, e), t) - h) / e;
  vec3 n = normalize(vec3(-g * 0.6, 1.0));
  vec3 V = vec3(0.0, 0.0, 1.0);

  float thick = 950.0 + 420.0 * h + 160.0 * sin(p.x * 1.3 - p.y * 0.9 + t * 0.3);
  float heat = 0.05 + 0.25 * sin(p.x * 0.9 + p.y * 0.6 + t * 0.25);
  vec3 col = chrome(n, V, thick, heat, 0.0);

  col = 1.0 - exp(-col * 0.95);
  col = mix(col, col * col * (3.0 - 2.0 * col), 0.35);
  col *= smoothstep(2.6, 0.6, length(p)) * 0.85 + 0.15;
  col *= uFade;
  col += (hash(gl_FragCoord.xy + fract(t) * 61.0) - 0.5) * 0.03;
  outColor = vec4(max(col, 0.0), 1.0);
}`

export function createIntroChrome(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl2", { antialias: false, premultipliedAlpha: true })
  if (!gl) return null
  const program = link(gl, QUAD_VERT, FRAG)
  const u = (name: string) => gl.getUniformLocation(program, name)
  const U = {
    res: u("uRes"),
    time: u("uTime"),
    light: u("uLight"),
    fade: u("uFade"),
  }
  const quad = gl.createVertexArray()
  gl.bindVertexArray(quad)
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  return {
    render(time: number, fade: number) {
      const dpr = Math.min(1.5, devicePixelRatio || 1)
      const w = Math.round(innerWidth * dpr)
      const h = Math.round(innerHeight * dpr)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      gl.viewport(0, 0, w, h)
      gl.useProgram(program)
      gl.uniform2f(U.res, w, h)
      gl.uniform1f(U.time, time)
      gl.uniform2f(U.light, 0, 0)
      gl.uniform1f(U.fade, fade)
      gl.bindVertexArray(quad)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },
    dispose() {
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
    },
  }
}
