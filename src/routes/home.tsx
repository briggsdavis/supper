import { useQuery } from "convex/react"
import { useEffect, useRef } from "react"
import { Link } from "react-router"
import { api } from "../../convex/_generated/api"
import { useMe } from "../components/auth.tsx"
import ChromeCanvas from "../components/chrome-canvas.tsx"
import EventCard from "../components/event-card.tsx"
import HomeSections, { HomeIntro } from "../components/home-sections.tsx"
import { ButtonLink, Page, Poster } from "../components/ui.tsx"
import { createChromeCutlery } from "../effects/chrome-cutlery.ts"
import { longDate, money, time, TODAY } from "../lib.ts"

const morph = { value: 0 }
const createHeroCutlery = (canvas: HTMLCanvasElement) =>
  createChromeCutlery(canvas, "flame", false, () => morph.value, 0.14, true)

export default function Home() {
  const showContent = useQuery(api.siteSettings.homepageContent) === true
  const heroRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const hero = heroRef.current
    if (!hero) return
    const update = () => {
      const rect = hero.getBoundingClientRect()
      const travel = Math.max(1, rect.height - window.innerHeight)
      const p = showContent ? Math.max(0, Math.min(1, -rect.top / travel)) : 0
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
  }, [showContent])

  return (
    <>
      <section ref={heroRef} className="relative" aria-labelledby="hero-title">
        <div className="supper-hero-art pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="sticky top-0 h-svh overflow-hidden">
            <div className="absolute inset-0 md:left-1/3 md:translate-x-[calc(var(--morph,0)*-25%)]">
              <ChromeCanvas
                create={createHeroCutlery}
                className="absolute inset-0 scale-90 opacity-80"
              />
            </div>
          </div>
        </div>
        <div className="relative z-10 mx-auto flex min-h-svh max-w-6xl flex-col justify-end px-6 pt-24 pb-16">
          <h1
            id="hero-title"
            className="font-display text-7xl leading-[0.9] font-medium tracking-[-0.075em] text-paper sm:text-8xl md:text-9xl"
          >
            Scenes
            <br />
            <em>&amp;</em> Supper
          </h1>
          <p className="mt-10 max-w-md text-lg text-neutral-300">
            We screen a film and cook the food on screen. Every course lands with its scene.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/events">See upcoming dinners</ButtonLink>
            <ButtonLink to="/titles" variant="ghost">
              Browse recipes
            </ButtonLink>
          </div>
        </div>
        {showContent && <HomeIntro />}
      </section>

      {showContent && (
        <>
          <HomeSections />
          <HomeListings />
        </>
      )}
    </>
  )
}

function HomeListings() {
  const events = useQuery(api.events.upcoming, { after: TODAY })
  const recipes = useQuery(api.recipes.latest)
  const { me } = useMe()
  const [next, ...rest] = events ?? []

  return (
    <>
      {next && (
        <Page>
          <h2 className="font-display text-3xl text-paper">Next dinner</h2>
          <Link
            to={`/events/${next.slug}`}
            className="group mt-6 grid gap-8 md:grid-cols-[16rem_1fr]"
          >
            <Poster
              url={next.title?.posterUrl}
              name={next.title?.name ?? "Dinner"}
              className="w-48 md:w-64"
            />
            <div className="flex flex-col justify-center">
              <h3 className="font-display text-5xl text-paper md:text-7xl">{next.title?.name}</h3>
              <p className="mt-3 font-mono text-base text-paper">
                {longDate(next.startsAt)} · {time(next.startsAt)}
              </p>
              <p className="mt-4 max-w-xl text-neutral-400">{next.title?.synopsis}</p>
              <ul className="mt-6 space-y-1 text-neutral-300">
                {next.menu.map((c, i) => (
                  <li key={i}>
                    <span className="text-neutral-500">{c.course}:</span> {c.dish}
                  </li>
                ))}
              </ul>
              <p className="mt-6 font-mono text-sm text-paper">
                {money(next.priceCents)} · {Math.max(0, next.capacity - next.sold)} seats left
              </p>
            </div>
          </Link>
        </Page>
      )}

      {rest.length > 0 && (
        <Page className="pt-0">
          <h2 className="font-display text-3xl text-paper">Also coming up</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {rest.slice(0, 4).map((e) => (
              <EventCard key={e._id} event={e} />
            ))}
          </div>
        </Page>
      )}

      {recipes && recipes.length > 0 && (
        <Page>
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-4xl text-paper">Cook the scene at home</h2>
            <Link to="/titles" className="text-sm text-neutral-400 hover:text-paper">
              All recipes
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((r) => (
              <Link
                key={r._id}
                to={`/recipes/${r.slug}`}
                className="rounded-2xl border border-white/10 p-6 transition hover:border-white/30"
              >
                <h3 className="font-display text-2xl text-paper">{r.name}</h3>
                <p className="text-sm text-neutral-500">From {r.title?.name}</p>
                <p className="mt-2 text-sm text-neutral-400">{r.summary}</p>
              </Link>
            ))}
          </div>
        </Page>
      )}

      {!me && (
        <Page className="text-center">
          <h2 className="font-display text-4xl text-paper">Save a seat for the next one</h2>
          <p className="mx-auto mt-3 max-w-md text-neutral-400">
            Make an account and we'll email you when new dinners open.
          </p>
          <ButtonLink to="/sign-in" className="mt-6">
            Get alerts
          </ButtonLink>
        </Page>
      )}
    </>
  )
}
