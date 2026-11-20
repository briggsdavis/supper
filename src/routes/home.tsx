import { useQuery } from "convex/react"
import { Link } from "react-router"
import { api } from "../../convex/_generated/api"
import { useMe } from "../components/auth.tsx"
import ChromeCanvas from "../components/chrome-canvas.tsx"
import EventCard from "../components/event-card.tsx"
import { ButtonLink, Page, Poster } from "../components/ui.tsx"
import { createChromeCutlery } from "../effects/chrome-cutlery.ts"
import { longDate, money, time, TODAY } from "../lib.ts"

export default function Home() {
  const events = useQuery(api.events.upcoming, { after: TODAY })
  const recipes = useQuery(api.recipes.latest)
  const { me } = useMe()
  const [next, ...rest] = events ?? []

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10 bg-black">
        <div className="pointer-events-none absolute inset-0 md:left-1/3">
          <ChromeCanvas create={createChromeCutlery} className="absolute inset-0 opacity-80" />
          <div className="crt absolute inset-0 [mask-image:radial-gradient(ellipse_at_60%_50%,black_35%,transparent_75%)]" />
        </div>
        <div className="relative mx-auto flex min-h-[calc(100svh-4rem)] max-w-6xl flex-col justify-end px-6 pt-24 pb-16">
          <h1 className="font-display text-7xl leading-[0.9] tracking-[-0.03em] text-paper sm:text-8xl md:text-9xl">
            Scenes
            <br />
            <span className="italic">&</span> Supper
          </h1>
          <p className="mt-6 max-w-md text-lg text-neutral-300">
            We screen a film and cook the food on screen. Every course lands with its scene.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/events">See upcoming dinners</ButtonLink>
            <ButtonLink to="/titles" variant="ghost">
              Browse recipes
            </ButtonLink>
          </div>
        </div>
      </section>

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
              <p className="mt-3 text-xl text-paper">
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
              <p className="mt-6 text-paper">
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
        <Page className="border-t border-white/10">
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
        <Page className="border-t border-white/10 text-center">
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
