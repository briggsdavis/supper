import { useEffect, useRef, type ReactNode } from "react"
import { Link } from "react-router"
import { createChromeCutlery } from "../effects/chrome-cutlery.ts"
import ChromeCanvas from "./chrome-canvas.tsx"

const createFooterDisc = (canvas: HTMLCanvasElement) =>
  createChromeCutlery(canvas, "flame", true, () => 1, 0, true, -0.95)
const createContactDisc = (canvas: HTMLCanvasElement) =>
  createChromeCutlery(canvas, "flame", true, () => 1, 0, true, -0.95, 0.12)

export const section = "px-[max(7vw,1.875rem)] max-sm:px-6.25"
export const sectionTitle = "leading-[1.01] tracking-[-0.075em]"
export const mono = "font-mono text-xs tracking-[0.06em]"

const button =
  "inline-flex min-h-12 cursor-pointer items-center justify-center gap-6 rounded-full border px-4.75 text-xs font-semibold whitespace-nowrap transition-colors duration-650 ease-site motion-reduce:transition-none"
export const outlineButton = `${button} border-line bg-[#151515] text-paper hover:border-paper hover:bg-paper hover:text-[#151515] focus-visible:border-paper focus-visible:bg-paper focus-visible:text-[#151515]`
export const solidButton = `${button} border-paper bg-paper text-[#151515] hover:border-line hover:bg-[#242323] hover:text-paper focus-visible:border-line focus-visible:bg-[#242323] focus-visible:text-paper aria-[current=page]:border-line aria-[current=page]:bg-[#242323] aria-[current=page]:text-paper`

export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (
      !element ||
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        element.classList.remove("supper-reveal-pending")
        observer.disconnect()
      },
      { threshold: 0.12 },
    )
    element.classList.add("supper-reveal-pending")
    observer.observe(element)
    return () => {
      observer.disconnect()
      element.classList.remove("supper-reveal-pending")
    }
  }, [])

  return (
    <div ref={ref} className={`supper-reveal ${className}`}>
      {children}
    </div>
  )
}

export function ChromeDisc({
  followPointer = false,
  className = "",
}: {
  followPointer?: boolean
  className?: string
}) {
  return (
    <div className={`pointer-events-none aspect-square ${className}`} aria-hidden="true">
      <ChromeCanvas
        create={followPointer ? createContactDisc : createFooterDisc}
        className="absolute inset-0"
        viewportPointer={followPointer}
      />
    </div>
  )
}

export function Brand({
  className = "",
  discClassName = "",
  wordmarkClassName = "",
  showMark = true,
  showWordmark = true,
}: {
  className?: string
  discClassName?: string
  wordmarkClassName?: string
  showMark?: boolean
  showWordmark?: boolean
}) {
  return (
    <Link
      className={`inline-flex w-max items-center gap-2.5 ${className}`}
      to="/"
      aria-label="Scenes & Supper"
    >
      {showMark && (
        <img src="/mark.png" alt="" className={`h-[1.375rem] w-auto flex-none ${discClassName}`} />
      )}
      {showWordmark && (
        <img src="/wordmark.png" alt="" className={`h-[0.9375rem] w-auto ${wordmarkClassName}`} />
      )}
    </Link>
  )
}

export function SiteFooter() {
  return (
    <footer
      data-route-root
      className={`${section} relative isolate grid min-h-[40.625rem] grid-rows-[1fr_auto] items-center overflow-hidden bg-[linear-gradient(180deg,transparent,#ffffff04_65%,#ffffff06)] pt-25 pb-7 text-paper max-sm:min-h-[36.875rem] max-sm:pt-20 max-sm:pb-5.5`}
    >
      <ChromeDisc className="absolute top-1/2 -right-[4vw] -z-1 w-[min(70vw,56rem)] -translate-y-1/2 max-sm:top-[12%] max-sm:-right-[24vw] max-sm:w-[90vw] max-sm:opacity-50" />
      <Reveal className="relative">
        <h2 className={`${sectionTitle} mb-6.5 text-5xl md:text-6xl lg:text-7xl`}>
          Make tonight
          <br /> a <em>little</em> more cinematic.
        </h2>
        <Link to="/contact" className={outlineButton}>
          Let’s plan a night
        </Link>
      </Reveal>
      <div className="relative flex min-h-14 items-center justify-between gap-5 max-sm:gap-2.5">
        <Brand showMark={false} wordmarkClassName="h-6 max-sm:h-4.5" />
        <a
          href="https://socialsatisfaction.agency"
          target="_blank"
          rel="noreferrer"
          className={`${mono} text-right text-muted hover:text-paper`}
        >
          Made by Social Satisfaction
        </a>
      </div>
    </footer>
  )
}
