import { useEffect, useRef } from "react"
import ChromeCanvas from "../components/chrome-canvas.tsx"
import { createChromeMorph, type MorphKind } from "../effects/chrome-morphs.ts"

const variants: { kind: MorphKind; name: string; note: string }[] = [
  {
    kind: "sweep",
    name: "Clock sweep",
    note: "Fork and knife cross at the hub and turn like clock hands. Each one drags a quarter of the disc behind it.",
  },
  {
    kind: "pool",
    name: "Melt",
    note: "The pair softens and drains into a puddle that spreads, flattens and sets hard as a disc.",
  },
  {
    kind: "flip",
    name: "Coin flip",
    note: "The pair is tossed toward you, tumbles end over end, and lands as the disc.",
  },
]

const scenes = variants.map(({ kind }) => {
  const morph = { value: 0 }
  return {
    morph,
    create: (canvas: HTMLCanvasElement) => createChromeMorph(canvas, kind, () => morph.value),
  }
})

function Variant({ index }: { index: number }) {
  const ref = useRef<HTMLElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const { name, note } = variants[index]
  const { morph, create } = scenes[index]

  useEffect(() => {
    const section = ref.current
    if (!section) return
    const update = () => {
      const rect = section.getBoundingClientRect()
      const travel = Math.max(1, rect.height - window.innerHeight)
      const p = Math.max(0, Math.min(1, (-rect.top / travel - 0.08) / 0.8))
      morph.value = p
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`
    }
    update()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [morph])

  return (
    <section ref={ref} className="relative h-[420svh]">
      <div className="sticky top-0 h-svh overflow-hidden">
        <ChromeCanvas create={create} className="absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 px-[max(6.1vw,1.25rem)] pb-10 max-md:px-3">
          <p className="font-mono text-xs tracking-[0.06em] text-neutral-500">
            {index + 1} / {variants.length}
          </p>
          <h2 className="mt-2 font-display text-4xl text-paper">{name}</h2>
          <p className="mt-2 max-w-sm text-sm text-neutral-400">{note}</p>
          <div className="mt-6 h-px w-full max-w-sm bg-white/15">
            <div ref={barRef} className="h-px origin-left scale-x-0 bg-paper" />
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Morphs() {
  return (
    <div className="-mt-28 md:-mt-20">
      {variants.map((variant, index) => (
        <Variant key={variant.kind} index={index} />
      ))}
    </div>
  )
}
