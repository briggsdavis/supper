import { useEffect } from "react"
import { useLocation } from "react-router"

export function useWeightedScroll() {
  const { key } = useLocation()

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    let frame = 0
    let destination = 0
    let position = 0
    let lastFrame = 0

    const stop = () => {
      cancelAnimationFrame(frame)
      frame = 0
    }

    const animate = (now: number) => {
      if (Math.abs(window.scrollY - position) > 2) {
        stop()
        return
      }

      const remaining = destination - position
      const blend = 1 - Math.exp(-(now - lastFrame) / 85)
      const settled = Math.abs(remaining) < 1
      position = settled ? destination : position + remaining * blend
      window.scrollTo({ top: position, behavior: "instant" })
      lastFrame = now
      frame = settled ? 0 : requestAnimationFrame(animate)
    }

    const onWheel = (event: WheelEvent) => {
      const mode = event.deltaMode
      const { deltaX, deltaY, target } = event
      // Keep precise trackpad gestures and scrolling inside controls native.
      if (event.defaultPrevented || !event.cancelable || motion.matches || event.ctrlKey ||
          event.metaKey || event.shiftKey || event.altKey || deltaX !== 0 || deltaY === 0 ||
          (mode === 0 && (Math.abs(deltaY) < 40 || !Number.isInteger(deltaY)))) {
        stop()
        return
      }

      if (target instanceof Element && target.closest("input, select, textarea, [contenteditable]")) {
        stop()
        return
      }
      for (let element = target instanceof Element ? target : null;
           element && element !== document.body; element = element.parentElement) {
        if (element.scrollHeight > element.clientHeight &&
            /^(auto|scroll)$/.test(getComputedStyle(element).overflowY)) {
          stop()
          return
        }
      }

      const scrollHeight = document.scrollingElement?.scrollHeight ?? window.innerHeight
      const max = Math.max(0, scrollHeight - window.innerHeight)
      if (!max) return

      event.preventDefault()
      if (!frame) {
        position = window.scrollY
        destination = position
        lastFrame = performance.now()
        frame = requestAnimationFrame(animate)
      }

      const multiplier = mode === 1 ? 16 : mode === 2 ? window.innerHeight : 1
      destination = Math.min(max, Math.max(0, destination + deltaY * multiplier))
    }

    window.addEventListener("wheel", onWheel, { passive: false })
    window.addEventListener("pointerdown", stop, { passive: true })
    window.addEventListener("keydown", stop)
    motion.addEventListener("change", stop)
    return () => {
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("pointerdown", stop)
      window.removeEventListener("keydown", stop)
      motion.removeEventListener("change", stop)
      stop()
    }
  }, [key])
}
