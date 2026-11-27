import { useEffect, useRef } from "react"
import { useMe } from "../components/auth.tsx"
import ChromeCanvas from "../components/chrome-canvas.tsx"
import HomeSections, { HomeIntro, MovieScatter } from "../components/home-sections.tsx"
import { ButtonLink, Page } from "../components/ui.tsx"
import { createChromeCutlery } from "../effects/chrome-cutlery.ts"

const morph = { value: 0 }
const createHeroCutlery = (canvas: HTMLCanvasElement) =>
  createChromeCutlery(canvas, "flame", false, () => morph.value, 0.14, true)

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
