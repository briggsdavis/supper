import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useMe } from "../components/auth.tsx"
import ChromeCanvas from "../components/chrome-canvas.tsx"
import HomeSections, { HomeIntro, MovieScatter } from "../components/home-sections.tsx"
import { ButtonLink, Page } from "../components/ui.tsx"
import { createChromeCutlery } from "../effects/chrome-cutlery.ts"
import { createIntroChrome } from "../effects/intro-chrome.ts"

const morph = { value: 0 }
const createHeroCutlery = (canvas: HTMLCanvasElement) =>
  createChromeCutlery(canvas, "flame", false, () => morph.value, 0.14, true)

const ease = (t: number) => {
  const c = Math.min(1, Math.max(0, t))
  return c < 0.5 ? 4 * c * c * c : 1 - (-2 * c + 2) ** 3 / 2
}
const INTRO_END = 3.15

// First visit: a sheet of the hero's liquid chrome fills the screen, the hero miniature wipes
// open from the centre, holds, then expands to fill the viewport.
// index.html adds `supper-intro` before first paint (home, once per session, motion allowed).
function IntroChrome() {
  const ref = useRef<HTMLCanvasElement>(null)
  const [done, setDone] = useState(
    () =>
      typeof document === "undefined" ||
      !document.documentElement.classList.contains("supper-intro"),
  )

  useLayoutEffect(() => {
    const canvas = ref.current
    const root = document.documentElement
    const site = document.querySelector<HTMLElement>(".supper-site")
    if (!canvas || !site || !root.classList.contains("supper-intro")) return
    window.scrollTo(0, 0)
    let scene: ReturnType<typeof createIntroChrome> = null
    try {
      scene = createIntroChrome(canvas)
    } catch {}
    const start = performance.now()
    let raf = 0
    const clear = () => {
      site.style.removeProperty("clip-path")
      site.style.removeProperty("transform")
    }
    const frame = (now: number) => {
      const t = (now - start) / 1000
      const inset = 50 * (1 - ease((t - 0.3) / 0.8))
      const scale = 0.45 + 0.55 * ease((t - 2.1) / 1.0)
      site.style.clipPath = `inset(0 ${inset}% calc(100% - 100vh) ${inset}%)`
      site.style.transform = `scale(${scale})`
      scene?.render(t, ease(t / 0.6))
      if (t < INTRO_END) raf = requestAnimationFrame(frame)
      else {
        try {
          sessionStorage.setItem("supper-intro", "1")
        } catch {}
        canvas.style.display = "none"
        scene?.dispose()
        scene = null
        root.classList.remove("supper-intro")
        clear()
        setDone(true)
      }
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      scene?.dispose()
    }
  }, [])

  if (done) return null
  return createPortal(
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-1 h-full w-full"
    />,
    document.body,
  )
}

export default function Home() {
  const heroRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const hero = heroRef.current
    if (!hero) return
    const update = () => {
      const rect = hero.getBoundingClientRect()
      const travel = Math.max(1, rect.height - window.innerHeight)
      const p = Math.max(0, Math.min(1, -rect.top / travel))
      morph.value = p
      hero.style.setProperty("--morph", String(p * p * (3 - 2 * p)))
    }
    update()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [])

  return (
    <>
      <IntroChrome />
      <section ref={heroRef} className="relative" aria-labelledby="hero-title">
        <div
          className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black_65%,transparent)] mix-blend-screen"
          aria-hidden="true"
        >
          <div className="sticky top-0 h-svh overflow-hidden">
            <div className="absolute inset-0 md:left-1/3 md:translate-x-[calc(var(--morph,0)*-25%)]">
              <ChromeCanvas
                create={createHeroCutlery}
                className="absolute inset-0 scale-90 opacity-80"
              />
            </div>
          </div>
        </div>
        <div className="relative z-10 flex min-h-svh flex-col justify-end px-[max(6.1vw,1.25rem)] pt-24 pb-28 max-md:px-3">
          <h1 id="hero-title">
            <span className="sr-only">Scenes &amp; Supper</span>
            <img src="/wordmark.png" alt="" className="h-auto w-full max-w-[33.6rem]" />
          </h1>
          <p className="mt-10 max-w-md text-lg text-neutral-300">
            We screen a film and cook the food on screen. Every course lands with its scene.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/dinners">See upcoming dinners</ButtonLink>
            <ButtonLink to="/movies" variant="ghost">
              Browse movies
            </ButtonLink>
          </div>
        </div>
        <HomeIntro />
      </section>

      <MovieScatter />

      <HomeSections />
      <HomeListings />
    </>
  )
}

function HomeListings() {
  const { me } = useMe()

  if (me) return null
  return (
    <Page className="text-center">
      <h2 className="font-display text-4xl text-paper">Save a seat for the next one</h2>
      <p className="mx-auto mt-3 max-w-md text-neutral-400">
        Make an account and we'll email you when new dinners open.
      </p>
      <ButtonLink to="/sign-in" className="mt-6">
        Get alerts
      </ButtonLink>
    </Page>
  )
}
