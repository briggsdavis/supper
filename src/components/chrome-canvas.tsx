import { useEffect, useRef } from "react"
import type { ChromeScene } from "../effects/chrome-lens.ts"

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

const clamp = (v: number) => Math.max(-1, Math.min(1, v))

export default function ChromeCanvas({
  create,
  className = "",
}: {
  create: (canvas: HTMLCanvasElement) => ChromeScene | null
  className?: string
}) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = document.createElement("canvas")
    canvas.className = "block h-full w-full mix-blend-screen"
    canvas.setAttribute("aria-hidden", "true")
    hostRef.current!.appendChild(canvas)
    const scene = create(canvas)
    if (!scene) {
      canvas.remove()
      return
    }

    const ro = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect()
      const dpr = Math.min(devicePixelRatio, 2)
      scene.resize(Math.round(r.width * dpr), Math.round(r.height * dpr))
    })
    ro.observe(canvas)

    let visible = true
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
    })
    io.observe(canvas)

    const light = { x: 0, y: 0 }
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
        tx = clamp(((pointer.x - rect.left) / rect.width) * 2 - 1) * aspect
        ty = clamp(-(((pointer.y - rect.top) / rect.height) * 2 - 1))
      } else {
        tx = Math.cos(t * 0.3) * aspect * 0.5
        ty = Math.sin(t * 0.45) * 0.5
      }
      light.x += (tx - light.x) * 0.06
      light.y += (ty - light.y) * 0.06
      scene.render(t, light.x, light.y)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      scene.dispose()
      canvas.remove()
    }
  }, [create])

  return <div ref={hostRef} className={className} />
}
