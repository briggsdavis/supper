import { useLayoutEffect, useRef, useState } from "react"
import { createMetalMark } from "../effects/metal-mark.ts"
import { claimMarkIntro, markIntro } from "../route-motion.ts"
import ChromeCanvas from "./chrome-canvas.tsx"

const createSpinningMetalMark = (canvas: HTMLCanvasElement) => createMetalMark(canvas, true)

export default function MetalMarkBackground() {
  const [intro] = useState(claimMarkIntro)
  const ref = useRef<HTMLDivElement>(null)

  // Blur and zoom in alongside the spin, before the page content arrives.
  useLayoutEffect(() => {
    if (!intro || !ref.current) return
    const animation = markIntro(ref.current)
    return () => animation.cancel()
  }, [intro])

  return (
    <div
      ref={ref}
      data-route-mark
      className="pointer-events-none fixed inset-0 -z-10 m-auto h-[min(74svh,130vw)] w-[min(88vw,44rem)]"
    >
      <ChromeCanvas
        create={intro ? createSpinningMetalMark : createMetalMark}
        className="h-full w-full opacity-70 max-sm:opacity-45"
      />
    </div>
  )
}
