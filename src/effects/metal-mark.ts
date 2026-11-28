import { PRISM_COAT } from "./chrome-cutlery.ts"
import { link, type ChromeScene } from "./chrome-lens.ts"

type Point = readonly [x: number, y: number]

// The front face is traced from the reference, in counterclockwise order after
// converting the image coordinates to model coordinates.
const outline = [
  [97, 133, 65],
  [401, 323, 25],
  [401, 28, 64],
  [737, 233, 35],
  [737, 573, 66],
  [437, 376, 29],
  [437, 553, 24],
  [737, 733, 37],
  [737, 1055, 64],
  [437, 863, 30],
  [437, 1160, 65],
  [95, 935, 38],
  [95, 616, 64],
  [395, 812, 27],
  [395, 661, 23],
  [96, 472, 39],
] as const

const bevel = 0.032
const halfDepth = 0.078
const cornerSteps = 8
const bevelSteps = 4
const normalize = (x: number, y: number): Point => {
  const length = Math.hypot(x, y)
  return [x / length, y / length]
}
const cross = (a: Point, b: Point, c: Point) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])

function roundedOutline() {
  const corners = outline.toReversed().map(([x, y, radius]) => ({
    point: [(x - 416) / 340, (594 - y) / 340] as Point,
    radius: radius / 340,
  }))
  return corners.flatMap(({ point: [x, y], radius }, index) => {
    const prev = corners.at(index - 1)!.point
    const next = corners[(index + 1) % corners.length].point
    const from = normalize(prev[0] - x, prev[1] - y)
    const to = normalize(next[0] - x, next[1] - y)
    return Array.from({ length: cornerSteps + 1 }, (_, step): Point => {
      const t = step / cornerSteps
      const a = (1 - t) ** 2 * radius
      const b = t ** 2 * radius
      return [x + a * from[0] + b * to[0], y + a * from[1] + b * to[1]]
    })
  })
}

function triangulate(points: Point[]) {
  const indices = points.map((_, index) => index)
  const faces: number[] = []
  while (indices.length > 3) {
    const ear = indices.findIndex((center, i) => {
      const left = indices.at(i - 1)!
      const right = indices[(i + 1) % indices.length]
      const [a, b, c] = [points[left], points[center], points[right]]
      return (
        cross(a, b, c) > 1e-7 &&
        !indices.some((index) => {
          if (index === left || index === center || index === right) return false
          const p = points[index]
          return cross(a, b, p) >= 0 && cross(b, c, p) >= 0 && cross(c, a, p) >= 0
        })
      )
    })
    if (ear === -1) throw new Error("Could not triangulate the metal mark")
    faces.push(indices.at(ear - 1)!, indices[ear], indices[(ear + 1) % indices.length])
    indices.splice(ear, 1)
  }
  return faces.concat(indices)
}

function buildMesh() {
  const contour = roundedOutline()
  const size = contour.length
  const edges = contour.map(([x, y], i) => {
    const [nextX, nextY] = contour[(i + 1) % size]
    return normalize(nextY - y, x - nextX)
  })
  const joins = edges.map(([x, y], i) => {
    const previous = edges.at(i - 1)!
    const normal = normalize(x + previous[0], y + previous[1])
    return { normal, miter: 1 / (x * normal[0] + y * normal[1]) }
  })
  const vertices: number[] = []
  const front: Point[] = []
  const angles = Array.from({ length: bevelSteps + 1 }, (_, i) => (i * Math.PI) / (2 * bevelSteps))

  for (const side of [1, -1]) {
    for (const angle of side === 1 ? angles : angles.toReversed()) {
      const outward = Math.sin(angle)
      const facing = Math.cos(angle)
      const inset = bevel * (1 - outward)
      const z = side * (halfDepth - bevel + bevel * facing)
      contour.forEach(([x, y], i) => {
        const {
          normal: [nx, ny],
          miter,
        } = joins[i]
        const point: Point = [x - nx * miter * inset, y - ny * miter * inset]
        vertices.push(...point, z, nx * outward, ny * outward, side * facing)
        if (side === 1 && angle === 0) front.push(point)
      })
    }
  }
  const cap = triangulate(front)
  const indices = [...cap]
  const back = (angles.length * 2 - 1) * size
  for (let i = 0; i < cap.length; i += 3) {
    indices.push(back + cap[i + 2], back + cap[i + 1], back + cap[i])
  }
  for (let ring = 0; ring < angles.length * 2 - 1; ring++) {
    for (let i = 0; i < size; i++) {
      const a = ring * size + i
      const b = ring * size + ((i + 1) % size)
      indices.push(a, a + size, b, b, a + size, b + size)
    }
  }
  return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) }
}

const vertexShader = `#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
uniform vec2 uPose;
uniform float uAspect;
uniform float uFocal;
out vec3 vNormal;
out vec3 vPosition;
out vec3 vLocal;
out float vFace;

mat2 rotation(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, s, -s, c);
}

vec3 orient(vec3 p) {
  p.xz = rotation(uPose.x) * p.xz;
  p.yz = rotation(uPose.y) * p.yz;
  return p;
}

void main() {
  const float near = 0.5;
  const float far = 12.0;
  vLocal = aPosition;
  vFace = abs(aNormal.z);
  vPosition = orient(aPosition);
  vNormal = orient(aNormal);
  float depth = 5.6 - vPosition.z;
  float clipZ = ((far + near) * depth - 2.0 * near * far) / (far - near);
  gl_Position = vec4(vPosition.xy * vec2(1.0 / uAspect, 1.0) * uFocal, clipZ, depth);
}
`

const fragmentShader = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec3 vPosition;
in vec3 vLocal;
in float vFace;
uniform float uTime;
uniform vec2 uLight;
out vec4 outColor;

const float uLay = 0.0;

mat2 rot(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}
${PRISM_COAT}
void main() {
  vec3 n = normalize(vNormal);
  vec3 view = normalize(vec3(0.0, 0.0, 5.6) - vPosition);
  float face = smoothstep(0.85, 0.995, vFace);
  vec2 swell = vPosition.xy * vec2(0.7, 0.45) + 0.25 * sin(vLocal.yx * vec2(2.3, 1.7) + uTime * 0.15);
  n = normalize(n + face * vec3(swell, 0.0));
  vec3 col = prism(vLocal * 1.6, n, view, 0.3) * 1.25;
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

export function createMetalMark(canvas: HTMLCanvasElement): ChromeScene | null {
  const gl = canvas.getContext("webgl2", { antialias: true, powerPreference: "low-power" })
  if (!gl) return null

  const mesh = buildMesh()
  const program = link(gl, vertexShader, fragmentShader)!
  const vertices = gl.createBuffer()
  const indices = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vertices)
  gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW)
  for (const attribute of [0, 1]) {
    gl.enableVertexAttribArray(attribute)
    gl.vertexAttribPointer(attribute, 3, gl.FLOAT, false, 24, attribute * 12)
  }
  gl.enable(gl.DEPTH_TEST)
  gl.useProgram(program)
  const pose = gl.getUniformLocation(program, "uPose")
  const aspect = gl.getUniformLocation(program, "uAspect")
  const focal = gl.getUniformLocation(program, "uFocal")
  const uTime = gl.getUniformLocation(program, "uTime")
  const uLight = gl.getUniformLocation(program, "uLight")
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
  const restingAngle = 0.22
  const idleSpeed = 0.16
  let angle = restingAngle
  let speed = idleSpeed
  let previousScroll = window.scrollY
  let lastFrame = -Infinity
  let wasStill = false
  let pushX = 0
  let pushY = 0
  let aim = { x: 0, y: 0 }
  let tilt = { x: 0, y: 0 }
  let lastPointer: { x: number; y: number } | null = null
  let inside = false
  const zone = () => canvas.closest("footer") ?? canvas
  const onPointer = (event: PointerEvent) => {
    const box = zone().getBoundingClientRect()
    inside =
      event.clientX >= box.left &&
      event.clientX <= box.right &&
      event.clientY >= box.top &&
      event.clientY <= box.bottom
    if (!inside) {
      lastPointer = null
      aim = { x: 0, y: 0 }
      return
    }
    if (lastPointer) {
      pushX += event.clientX - lastPointer.x
      pushY += event.clientY - lastPointer.y
    }
    lastPointer = { x: event.clientX, y: event.clientY }
    const rect = canvas.getBoundingClientRect()
    const reach = Math.max(rect.width, rect.height) * 1.5
    aim = {
      x: Math.max(-1, Math.min(1, (event.clientX - rect.left - rect.width / 2) / reach)),
      y: Math.max(-1, Math.min(1, (event.clientY - rect.top - rect.height / 2) / reach)),
    }
  }
  const onLeave = () => {
    inside = false
    lastPointer = null
    aim = { x: 0, y: 0 }
  }
  window.addEventListener("pointermove", onPointer, { passive: true })
  document.documentElement.addEventListener("pointerleave", onLeave)
  let light = { x: 0, y: 0 }

  return {
    resize(width, height) {
      const scale = Math.min(1, 900 / Math.max(width, height))
      canvas.width = Math.max(1, Math.round(width * scale))
      canvas.height = Math.max(1, Math.round(height * scale))
      const ratio = canvas.width / canvas.height
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform1f(aspect, ratio)
      gl.uniform1f(focal, 5.6 * Math.min(0.52, ratio * 0.87))
      lastFrame = -Infinity
    },
    render(time, lightX, lightY) {
      const still = reducedMotion.matches
      const elapsed = time - lastFrame
      if (still === wasStill && (still ? Number.isFinite(lastFrame) : elapsed < 1 / 75)) return
      const scroll = window.scrollY
      // Ignore large gaps after a resize or returning to a hidden tab.
      if (!still && !wasStill && elapsed > 0 && elapsed < 0.15) {
        const scrollSpeed = Math.abs(scroll - previousScroll) / elapsed
        const fling = Math.max(-6, Math.min(6, (pushX + pushY * 0.35) * 0.012))
        speed += fling
        const floor = Math.sign(speed || 1) * (idleSpeed + Math.min(scrollSpeed / 1500, 1.25))
        speed = floor + (speed - floor) * Math.exp(-2.2 * elapsed)
        if (Math.abs(speed) < idleSpeed) speed = Math.sign(speed || 1) * idleSpeed
        angle = (angle + speed * elapsed) % (2 * Math.PI)
        const follow = -Math.expm1(-14 * elapsed)
        tilt = { x: tilt.x + (aim.x - tilt.x) * follow, y: tilt.y + (aim.y - tilt.y) * follow }
      } else {
        speed = idleSpeed
      }
      pushX = 0
      pushY = 0
      previousScroll = scroll
      lastFrame = time
      wasStill = still
      const yaw = still ? restingAngle : angle + tilt.x * 0.9
      const pitch = 0.1 + (still ? 0 : Math.sin(angle) * 0.075 + tilt.y * 0.8)
      gl.uniform2f(pose, yaw, pitch)
      gl.uniform1f(uTime, still ? 0 : time)
      const glow = -Math.expm1(-6 * Math.max(0, Math.min(elapsed, 0.1)))
      const target = inside ? { x: lightX, y: lightY } : { x: 0, y: 0 }
      light = {
        x: light.x + (target.x - light.x) * glow,
        y: light.y + (target.y - light.y) * glow,
      }
      gl.uniform2f(uLight, still ? 0 : light.x, still ? 0 : light.y)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0)
    },
    dispose() {
      window.removeEventListener("pointermove", onPointer)
      document.documentElement.removeEventListener("pointerleave", onLeave)
      gl.deleteBuffer(vertices)
      gl.deleteBuffer(indices)
      gl.deleteProgram(program)
    },
  }
}
