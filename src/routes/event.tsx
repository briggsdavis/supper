import { useQuery } from "convex/react"
import { Link, useParams } from "react-router"
import { api } from "../../convex/_generated/api"
import { detailColumns, useDetailImage } from "../components/detail-link.tsx"
import DinnerTickets, { DinnerFacts } from "../components/dinner-tickets.tsx"
import Suggestions from "../components/suggestions.tsx"
import { Loading, NotFound, Page, Poster } from "../components/ui.tsx"

export default function Event() {
  const { slug = "" } = useParams()
  const { preview, imageStyle, headingRef } = useDetailImage("dinners", slug)
  const event = useQuery(api.events.get, { slug })
  if (event === null) return <NotFound what="dinner" />
  if (!event && !preview) return <Loading />

  const name = event?.title?.name ?? preview?.name ?? "Dinner"
  const description = event?.title?.synopsis ?? preview?.description

  return (
    <Page wide>
      {event && !event.published && (
        <p className="mb-6 rounded-xl bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
          Draft. Only admins can see this.
        </p>
      )}
      <div className={detailColumns} data-detail-transition={imageStyle ? true : undefined}>
        <Poster
          url={event?.title?.posterUrl ?? preview?.imageUrl}
          name={name}
          style={imageStyle}
          className="w-full max-w-120"
        />
        <div className="min-w-0">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-5xl leading-none tracking-tight text-paper focus:outline-none md:text-7xl"
          >
            {name}
          </h1>
          {description && <p className="mt-5 max-w-2xl text-lg text-neutral-300">{description}</p>}
          {event && (
            <>
              <DinnerFacts dinner={event} />
              <DinnerTickets key={event._id} dinner={event} />
            </>
          )}
        </div>
      </div>

      {event && event.menu.length > 0 && (
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
              to={`/movies/${event.title.slug}`}
              className="mt-6 inline-block text-sm text-neutral-400 underline-offset-4 hover:text-paper hover:underline"
            >
              Recipes from {name}
            </Link>
          )}
        </section>
      )}

      {event && (
        <div className="mt-16 max-w-2xl border-t border-white/10 pt-12">
          <Suggestions movie={event.title?.name} />
        </div>
      )}
    </Page>
  )
}
