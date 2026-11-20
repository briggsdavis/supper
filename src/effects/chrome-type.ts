import type { ChromeScene, Palette } from "./chrome-lens.ts"
import { createMarch } from "./chrome-march.ts"

const FONT = `"SF Pro Display", "Helvetica Neue", Inter, system-ui, sans-serif`
const FONT_SIZE = 160
const SPREAD = 0.22
const SOFT = 0.02
const MAX_WIDTH = 1536
const INF = 1e20

const SCENE = `
uniform sampler2D uText;
uniform vec2 uSize;

const float ROUND = 0.085;
const float FLAT = 1.5;

vec4 cubic(float v) {
  vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
  vec4 s = n * n * n;
  float x = s.x;
  float y = s.y - 4.0 * s.x;
  float z = s.z - 4.0 * s.y + 6.0 * s.x;
  return vec4(x, y, z, 6.0 - x - y - z) / 6.0;
}

float field(vec2 uv) {
  vec2 size = vec2(textureSize(uText, 0));
  vec2 st = uv * size - 0.5;
  vec2 f = fract(st);
  st -= f;
  vec4 xc = cubic(f.x);
  vec4 yc = cubic(f.y);
  vec4 s = vec4(xc.xz + xc.yw, yc.xz + yc.yw);
  vec4 o = (st.xxyy + vec2(-0.5, 1.5).xyxy + vec4(xc.yw, yc.yw) / s) / size.xxyy;
  float sx = s.x / (s.x + s.y);
  float sy = s.z / (s.z + s.w);
  return mix(
    mix(textureLod(uText, o.yw, 0.0).r, textureLod(uText, o.xw, 0.0).r, sx),
    mix(textureLod(uText, o.yz, 0.0).r, textureLod(uText, o.xz, 0.0).r, sx), sy);
}

vec3 local(vec3 p) {
  p /= uScale;
  p.yz = rot(0.12 * sin(uTime * 0.23) - uLight.y * 0.12) * p.yz;
  p.xz = rot(0.38 * sin(uTime * 0.3) + uLight.x * 0.1) * p.xz;
  return p;
}

float map(vec3 p) {
  vec3 l = local(p);
  float b = length(max(abs(l) - vec3(uSize, ROUND / FLAT), 0.0));
  if (b > 0.1) return b * uScale;
  float d = field(clamp(l.xy / uSize * 0.5 + 0.5, 0.0, 1.0)) + length(max(abs(l.xy) - uSize, 0.0));
  return plate(d, l.z * FLAT, ROUND, ROUND) / FLAT * 0.8 * uScale;
}

vec3 coat(vec3 pos, vec3 n, vec3 V) {
  vec3 l = local(pos);
  return liquid(l, n, V, l.y * 0.7);
}
`

function edt1d(
  grid: Float64Array,
  offset: number,
  stride: number,
  length: number,
  f: Float64Array,
  v: Uint16Array,
  z: Float64Array,
) {
  v[0] = 0
  z[0] = -INF
  z[1] = INF
  f[0] = grid[offset]
  for (let q = 1, k = 0, s = 0; q < length; q++) {
    f[q] = grid[offset + q * stride]
    const q2 = q * q
    do {
      const r = v[k]
      s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2
    } while (s <= z[k] && --k > -1)
    k++
    v[k] = q
    z[k] = s
    z[k + 1] = INF
  }
  for (let q = 0, k = 0; q < length; q++) {
    while (z[k + 1] < q) k++
    const r = v[k]
    grid[offset + q * stride] = f[r] + (q - r) * (q - r)
  }
}

function edt(grid: Float64Array, width: number, height: number) {
  const size = Math.max(width, height)
  const f = new Float64Array(size)
  const v = new Uint16Array(size)
  const z = new Float64Array(size + 1)
  for (let x = 0; x < width; x++) edt1d(grid, x, width, height, f, v, z)
  for (let y = 0; y < height; y++) edt1d(grid, y * width, 1, width, f, v, z)
}

function soften(src: Float32Array, width: number, height: number, stride: number, sigma: number) {
  const radius = Math.ceil(sigma * 2.5)
  const kernel = Array.from({ length: radius * 2 + 1 }, (_, i) =>
    Math.exp(-((i - radius) ** 2) / (2 * sigma * sigma)),
  )
  const total = kernel.reduce((a, b) => a + b, 0)
  const out = new Float32Array(src.length)
  const length = stride === 1 ? width : height
  for (let i = 0; i < src.length; i++) {
    const pos = stride === 1 ? i % width : Math.floor(i / width)
    let sum = 0
    for (let k = -radius; k <= radius; k++) {
      const q = Math.min(length - 1, Math.max(0, pos + k))
      sum += src[i + (q - pos) * stride] * kernel[k + radius]
    }
    out[i] = sum / total
  }
  return out
}

function buildField(text: string) {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!
  const font = (size: number) => `900 ${size}px ${FONT}`
  ctx.font = font(FONT_SIZE)
  const wide = ctx.measureText(text || " ").width
  const size = Math.min(FONT_SIZE, (FONT_SIZE * (MAX_WIDTH * 0.8)) / Math.max(wide, 1))
  ctx.font = font(size)
  const m = ctx.measureText(text || " ")
  const pad = Math.ceil(size * SPREAD)
  const left = Math.ceil(m.actualBoundingBoxLeft)
  const ascent = Math.ceil(Math.max(m.actualBoundingBoxAscent, size * 0.3))
  const width = left + Math.ceil(m.actualBoundingBoxRight) + pad * 2
  const height = ascent + Math.ceil(m.actualBoundingBoxDescent) + pad * 2
  canvas.width = width
  canvas.height = height
  ctx.font = font(size)
  ctx.fillStyle = "#fff"
  ctx.fillText(text, pad + left, pad + ascent)
  const alpha = ctx.getImageData(0, 0, width, height).data

  const outer = new Float64Array(width * height)
  const inner = new Float64Array(width * height)
  for (let i = 0; i < outer.length; i++) {
    const a = alpha[i * 4 + 3] / 255
    outer[i] = a === 1 ? 0 : a === 0 ? INF : Math.max(0, 0.5 - a) ** 2
    inner[i] = a === 1 ? INF : a === 0 ? 0 : Math.max(0, a - 0.5) ** 2
  }
  edt(outer, width, height)
  edt(inner, width, height)

  const sharp = new Float32Array(width * height)
  for (let y = 0; y < height; y++) {
    const row = (height - 1 - y) * width
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const d = (Math.sqrt(outer[i]) - Math.sqrt(inner[i])) / size
      sharp[row + x] = Math.max(-SPREAD, Math.min(SPREAD, d))
    }
  }
  const data = soften(
    soften(sharp, width, height, 1, size * SOFT),
    width,
    height,
    width,
    size * SOFT,
  )
  return { data, width, height, halfWidth: width / size / 2, halfHeight: height / size / 2 }
}

export function createChromeType(
  canvas: HTMLCanvasElement,
  palette: Palette = "flame",
  depth = 0.6,
  cam = 3.2,
): ChromeScene | null {
  const march = createMarch(canvas, palette, SCENE, cam)
  if (!march) return null
  const { gl, lens } = march
  const uText = march.uniform("uText")
  const uSize = march.uniform("uSize")

  const tex = gl.createTexture()
  gl.activeTexture(gl.TEXTURE2)
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.activeTexture(gl.TEXTURE0)

  let halfWidth = 1
  let halfHeight = 0.5

  const setText = (text: string) => {
    const field = buildField(text)
    halfWidth = field.halfWidth
    halfHeight = field.halfHeight
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R16F,
      field.width,
      field.height,
      0,
      gl.RED,
      gl.FLOAT,
      field.data,
    )
    gl.activeTexture(gl.TEXTURE0)
  }
  setText("")

  return {
    resize(w, h) {
      lens.resize(w, h)
    },
    render(time, lightX, lightY) {
      const { width, height } = lens
      if (!width || !height) return
      const aspect = width / height

      gl.useProgram(march.program)
      gl.uniform1i(uText, 2)
      gl.uniform2f(uSize, halfWidth, halfHeight)
      march.draw(time, lightX, lightY, Math.min((0.86 * aspect) / halfWidth, 0.8 / halfHeight))
      lens.present(time, Math.PI / 2, 0, depth)
    },
    setText,
    dispose() {
      lens.dispose()
    },
  }
}
