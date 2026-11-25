import { createMetalMark } from "../effects/metal-mark.ts"
import ChromeCanvas from "./chrome-canvas.tsx"

export default function MetalMarkBackground() {
  return (
    <ChromeCanvas
      create={createMetalMark}
      className="pointer-events-none fixed inset-0 -z-10 m-auto h-[min(74svh,130vw)] w-[min(88vw,44rem)] opacity-70 max-sm:opacity-45"
    />
  )
}
