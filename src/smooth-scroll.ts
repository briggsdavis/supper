import Lenis from "lenis"
import "lenis/dist/lenis.css"
import { useEffect } from "react"
import { useLocation } from "react-router"

let lenis: Lenis | null = null

// Site-wide smooth scrolling (wheel and trackpad). Skipped when the visitor prefers reduced motion.
export function useSmoothScroll() {
  const { key } = useLocation()

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    lenis = new Lenis({
      autoRaf: true,
      lerp: 0.1,
      // Leave dialogs, form fields and the home intro to the browser.
      prevent: (node) =>
        document.documentElement.classList.contains("supper-intro") ||
        !!node.closest?.("dialog[open], input, select, textarea, [contenteditable]"),
    })
    return () => {
      lenis?.destroy()
      lenis = null
    }
  }, [])

  // Route changes jump the scroll position; drop any glide still in flight.
  useEffect(() => {
    lenis?.stop()
    lenis?.start()
  }, [key])
}

export function smoothScrollTo(element: HTMLElement) {
  if (lenis) lenis.scrollTo(element)
  else element.scrollIntoView({ behavior: "instant" })
}
