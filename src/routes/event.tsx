import { useQuery } from "convex/react"
import { Link, useParams } from "react-router"
import { api } from "../../convex/_generated/api"
import Comments from "../components/comments.tsx"
import DinnerTickets, { DinnerFacts } from "../components/dinner-tickets.tsx"
import { Loading, NotFound, Page, Poster } from "../components/ui.tsx"

export default function Event() {
  const { slug = "" } = useParams()
  const event = useQuery(api.events.get, { slug })
  if (event === undefined) return <Loading />
  if (event === null) return <NotFound what="dinner" />

  const name = event.title?.name ?? "Dinner"

  return (
    <Page>
      {!event.published && (
        <p className="mb-6 rounded-xl bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
          Draft. Only admins can see this.
        </p>
      )}
      <div className="grid gap-10 md:grid-cols-[18rem_1fr]">
        <Poster url={event.title?.posterUrl} name={name} className="w-56 md:w-72" />
        <div>
          <h1 className="font-display text-6xl leading-none text-paper md:text-7xl">{name}</h1>
          {event.title?.year && (
            <p className="mt-2 font-mono text-neutral-500">{event.title.year}</p>
          )}
          <p className="mt-6 max-w-2xl text-lg text-neutral-300">{event.title?.synopsis}</p>
          {event.note && <p className="mt-4 max-w-2xl text-neutral-400">{event.note}</p>}
          <DinnerFacts dinner={event} />
          <DinnerTickets key={event._id} dinner={event} />
        </div>
      </div>

      {event.menu.length > 0 && (
        <section className="mt-16 border-t border-white/10 pt-12">
          <h2 className="font-display text-3xl text-paper">The menu</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {event.menu.map((c, i) => (
              <li key={i} className="rounded-2xl border border-white/10 p-6">
                <p className="font-display text-2xl text-paper">{c.dish}</p>
                <p className="mt-1 font-mono text-sm text-neutral-500">{c.course}</p>
              </li>
            ))}
          </ol>
          {event.title && (
            <Link
              to={`/titles/${event.title.slug}`}
              className="mt-6 inline-block text-sm text-neutral-400 underline-offset-4 hover:text-paper hover:underline"
            >
              Recipes from {name}
            </Link>
          )}
        </section>
      )}

      <div className="mt-16 max-w-2xl border-t border-white/10 pt-12">
        <Comments target={{ eventId: event._id }} prompt="What do you want to eat from this one?" />
      </div>
    </Page>
  )
}
