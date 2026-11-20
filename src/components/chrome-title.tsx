import { useEffect, useRef } from "react"
import { createChromeType } from "../effects/chrome-type.ts"

export default function ChromeTitle({
  text,
  className = "",
}: {
  text: string
  className?: string
}) {
  const hostRef = useRef<HTMLSpanElement>(null)
  const sceneRef = useRef<ReturnType<typeof createChromeType>>(null)
  const textRef = useRef(text)

  useEffect(() => {
    const canvas = document.createElement("canvas")
    canvas.className = "block h-full w-full mix-blend-screen"
    canvas.setAttribute("aria-hidden", "true")
    hostRef.current!.appendChild(canvas)
    const scene = createChromeType(canvas, "flame", 0, 40)
    if (!scene) {
      canvas.remove()
      return
    }
    sceneRef.current = scene
    scene.setText?.(textRef.current)

    const ro = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect()
      const dpr = Math.min(devicePixelRatio, 2)
      scene.resize(Math.round(r.width * dpr), Math.round(r.height * dpr))
      scene.render(0, 0, 0)
    })
    ro.observe(canvas)

    return () => {
      ro.disconnect()
      sceneRef.current = null
      scene.dispose()
      canvas.remove()
    }
  }, [])

  useEffect(() => {
    textRef.current = text
    sceneRef.current?.setText?.(text)
    sceneRef.current?.render(0, 0, 0)
  }, [text])

  return (
    <span ref={hostRef} className={`relative block ${className}`}>
      <span className="sr-only">{text}</span>
    </span>
  )
}
