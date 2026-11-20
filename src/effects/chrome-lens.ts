export const HEAD = `
uniform float uTime;
uniform vec2 uLight;

const float PI = 3.14159265;
const float CAM = 3.2;

mat2 rot(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}
`

export type Palette = "flame" | "oil"

const PALETTES: Record<
  Palette,
  { glsl: string; halo: [number, number, number]; glow: [number, number, number] }
> = {
  flame: {
    halo: [1, 0.4, 0.12],
    glow: [0.35, 0.6, 1],
    glsl: `
const vec3 SPLIT_LOW = vec3(0.05, 0.3, 0.7);
const vec3 SPLIT_MID = vec3(0.25, 0.3, 0.25);
const vec3 SPLIT_HIGH = vec3(0.7, 0.4, 0.05);
const float FILM_MIX = 0.7;

vec3 flame(float x) {
  vec3 c = mix(vec3(0.07, 0.4, 1.6), vec3(1.05, 1.0, 0.92), smoothstep(0.0, 0.4, x));
  return mix(c, vec3(1.5, 0.55, 0.07), smoothstep(0.6, 1.0, x));
}

vec3 film(float thick, float cosT, float heat) {
  return flame(0.5 + heat - 0.5 * cos(4.0 * PI * thick * cosT / 540.0)) * 1.2;
}

vec3 rimTint(float heat) { return flame(0.5 + heat * 1.8); }
`,
  },
  oil: {
    halo: [0.75, 0.35, 1],
    glow: [0.25, 0.9, 0.75],
    glsl: `
const vec3 SPLIT_LOW = vec3(0.0, 0.15, 0.85);
const vec3 SPLIT_MID = vec3(0.15, 0.7, 0.15);
const vec3 SPLIT_HIGH = vec3(0.85, 0.15, 0.0);
const float FILM_MIX = 0.88;

vec3 film(float thick, float cosT, float heat) {
  float path = (thick * 0.42 + heat * 160.0) * cosT;
  return (0.5 - 0.5 * cos(4.0 * PI * path / vec3(620.0, 535.0, 455.0))) * 1.45;
}

vec3 rimTint(float heat) {
  return 0.75 + 0.45 * cos(6.2831853 * (heat * 1.3 + vec3(0.0, 0.33, 0.67)));
}
`,
  },
}

export const material = (palette: Palette) => `
${PALETTES[palette].glsl}
float strip(float x, float w) { return 1.0 - smoothstep(w * 0.4, w, abs(x)); }

float env(vec3 d) {
  vec3 key = normalize(vec3(uLight.x * 0.5 - 0.2, uLight.y * 0.5 + 0.45, 0.85));
  float c = 0.2;
  c += 4.0 * smoothstep(0.8, 0.97, dot(d, key));
  c += 1.6 * smoothstep(0.45, 0.95, dot(d, normalize(vec3(0.9, 0.1, 0.35))));
  c += 1.3 * strip(d.x + 0.75 - 0.2 * d.y, 0.16);
  c += 1.0 * strip(d.y + 0.55 + 0.25 * d.x, 0.1);
  c += 0.6 * smoothstep(-0.3, 1.0, d.y);
  return c;
}

vec3 chrome(vec3 n, vec3 V, float thick, float heat, float edge) {
  float nv = dot(n, V);
  vec3 r = reflect(-V, n);
  vec3 shift = normalize(n - r * dot(n, r) + 1e-4);
  float amt = 0.05 + 0.3 * pow(1.0 - nv, 2.0);
  float cosT = sqrt(1.0 - (1.0 - nv * nv) / 1.3);
  vec3 rim = rimTint(heat);

  vec3 refl = env(r) * SPLIT_MID;
  refl += env(normalize(r - shift * amt)) * SPLIT_LOW;
  refl += env(normalize(r + shift * amt)) * SPLIT_HIGH;
  vec3 col = refl * mix(vec3(1.0), film(thick, cosT, heat), FILM_MIX);
  float fres = pow(1.0 - nv, 4.0);
  col *= 0.6 + 0.4 * fres;
  col += fres * 0.5 * mix(vec3(1.0), rim, 0.75);
  col += edge * 1.5 * mix(vec3(1.0), rim, 0.6);
  return col;
}
`

export const QUAD_VERT = `#version 300 es
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

const LENS = `
uniform vec2 uRes;
uniform vec2 uAxis;
uniform float uFocus;
uniform float uDepth;

float blurRadius(vec2 uv) {
  vec2 p = (uv * 2.0 - 1.0) * vec2(uRes.x / uRes.y, 1.0);
  return uRes.y * 0.028 * uDepth * smoothstep(0.5, 1.9, abs(dot(p, uAxis) - uFocus));
}
`

const BLUR_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uScene;
${LENS}
void main() {
  float rad = blurRadius(vUv);
  if (rad < 0.5) {
    outColor = textureLod(uScene, vUv, 0.0);
    return;
  }
  float lod = max(0.0, log2(rad * 0.22));
  vec3 acc = vec3(0.0);
  const int N = 64;
  for (int i = 0; i < N; i++) {
    float a = float(i) * 2.39996323;
    vec2 off = vec2(cos(a), sin(a)) * sqrt((float(i) + 0.5) / float(N)) * rad;
    acc += textureLod(uScene, vUv + off / uRes, lod).rgb;
  }
  outColor = vec4(acc / float(N), 1.0);
}`

const POST_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uScene;
uniform sampler2D uBlur;
uniform float uTime;
uniform float uGain;
uniform vec3 uHalo;
uniform vec3 uGlow;
${LENS}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec3 soft(float lod) {
  vec2 o = exp2(lod) * 0.5 / uRes;
  return 0.25 * (textureLod(uScene, vUv + o, lod).rgb + textureLod(uScene, vUv - o, lod).rgb
    + textureLod(uScene, vUv + vec2(o.x, -o.y), lod).rgb + textureLod(uScene, vUv + vec2(-o.x, o.y), lod).rgb);
}

void main() {
  float ca = uRes.y * 0.0018 + blurRadius(vUv) * 0.35;
  vec2 caDir = normalize(vec2(1.0, 0.25)) * 2.0 * ca / uRes;
  vec3 acc = vec3(0.0);
  vec3 wsum = vec3(0.0);
  const int N = 12;
  for (int i = 0; i < N; i++) {
    float k = (float(i) + 0.5) / float(N);
    vec3 w = clamp(vec3(1.5 - 3.0 * k, 1.5 - abs(3.0 * k - 1.5), 3.0 * k - 1.5), 0.0, 1.0);
    acc += texture(uBlur, vUv + caDir * (k - 0.5)).rgb * w;
    wsum += w;
  }
  vec3 col = acc / wsum;

  col += (soft(2.5) + soft(3.5)) * uHalo * 0.05;
  col += (soft(5.0) + soft(6.5)) * uGlow * 0.03;

  col /= uGain;
  col = 1.0 - exp(-col * 1.15);
  col = mix(col, col * col * (3.0 - 2.0 * col), 0.35);
  col += (hash(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * 0.025;
  outColor = vec4(col, 1.0);
}`

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(s) ?? "shader error")
  return s
}

export function link(gl: WebGL2RenderingContext, vert: string, frag: string) {
  const p = gl.createProgram()
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vert))
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, frag))
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(p) ?? "link error")
  return p
}

export type ChromeScene = {
  resize(width: number, height: number): void
  render(time: number, lightX: number, lightY: number): void
  setText?(text: string): void
  dispose(): void
}

export function axisAngle(aspect: number) {
  return -Math.atan(aspect * 0.9)
}

export function createLens(canvas: HTMLCanvasElement, palette: Palette) {
  const gl = canvas.getContext("webgl2", {
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  })
  if (!gl) return null

  const hdr = !!gl.getExtension("EXT_color_buffer_float")
  const format = hdr ? gl.RGBA16F : gl.RGBA8
  const gain = hdr ? 1 : 1 / 6

  const blur = link(gl, QUAD_VERT, BLUR_FRAG)
  const post = link(gl, QUAD_VERT, POST_FRAG)
  const bu = (name: string) => gl.getUniformLocation(blur, name)
  const pu = (name: string) => gl.getUniformLocation(post, name)
  const bU = {
    scene: bu("uScene"),
    res: bu("uRes"),
    axis: bu("uAxis"),
    focus: bu("uFocus"),
    depth: bu("uDepth"),
  }
  const pU = {
    scene: pu("uScene"),
    blur: pu("uBlur"),
    res: pu("uRes"),
    axis: pu("uAxis"),
    focus: pu("uFocus"),
    depth: pu("uDepth"),
    time: pu("uTime"),
    gain: pu("uGain"),
  }
  gl.useProgram(post)
  gl.uniform3fv(pu("uHalo"), PALETTES[palette].halo)
  gl.uniform3fv(pu("uGlow"), PALETTES[palette].glow)

  const quad = gl.createVertexArray()
  gl.bindVertexArray(quad)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  gl.bindVertexArray(null)

  const texture = (min: number) => {
    const t = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, min)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return t
  }
  const target = gl.createFramebuffer()
  const blurFbo = gl.createFramebuffer()
  const sceneTex = texture(gl.LINEAR_MIPMAP_LINEAR)
  const blurTex = texture(gl.LINEAR)
  const attach = (fbo: WebGLFramebuffer, t: WebGLTexture, w: number, h: number) => {
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      format,
      w,
      h,
      0,
      gl.RGBA,
      hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE,
      null,
    )
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0)
  }

  let width = 0
  let height = 0

  return {
    gl,
    format,
    gain,
    target,
    get width() {
      return width
    },
    get height() {
      return height
    },
    resize(w: number, h: number) {
      if (w === width && h === height) return false
      width = w
      height = h
      canvas.width = w
      canvas.height = h
      if (!w || !h) return false
      attach(target, sceneTex, w, h)
      attach(blurFbo, blurTex, w, h)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      return true
    },
    drawQuad() {
      gl.bindVertexArray(quad)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      gl.bindVertexArray(null)
    },
    present(time: number, angle: number, focus: number, depth = 1) {
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, sceneTex)
      gl.generateMipmap(gl.TEXTURE_2D)
      gl.bindVertexArray(quad)

      gl.bindFramebuffer(gl.FRAMEBUFFER, blurFbo)
      gl.useProgram(blur)
      gl.uniform1i(bU.scene, 0)
      gl.uniform2f(bU.res, width, height)
      gl.uniform2f(bU.axis, Math.sin(angle), Math.cos(angle))
      gl.uniform1f(bU.focus, focus)
      gl.uniform1f(bU.depth, depth)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, blurTex)
      gl.activeTexture(gl.TEXTURE0)
      gl.useProgram(post)
      gl.uniform1i(pU.scene, 0)
      gl.uniform1i(pU.blur, 1)
      gl.uniform2f(pU.res, width, height)
      gl.uniform2f(pU.axis, Math.sin(angle), Math.cos(angle))
      gl.uniform1f(pU.focus, focus)
      gl.uniform1f(pU.depth, depth)
      gl.uniform1f(pU.time, time)
      gl.uniform1f(pU.gain, gain)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      gl.bindVertexArray(null)
    },
    dispose() {
      gl.getExtension("WEBGL_lose_context")?.loseContext()
    },
  }
}
