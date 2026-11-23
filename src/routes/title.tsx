import { useQuery } from "convex/react"
import type { FunctionReturnType } from "convex/server"
import { useEffect, useRef } from "react"
import { Link, useLocation, useParams, useSearchParams, useViewTransitionState } from "react-router"
import { api } from "../../convex/_generated/api"
import Comments from "../components/comments.tsx"
import DinnerTickets, { DinnerFacts } from "../components/dinner-tickets.tsx"
import { moviePosterTransition, type MoviePreview } from "../components/movie-link.tsx"
import { Empty, Field, Loading, NotFound, Page, Poster, Select } from "../components/ui.tsx"
import { longDate, time, youtubeId } from "../lib.ts"

export default function Title() {
  const { slug = "" } = useParams()
  const { state } = useLocation()
  const [params, setParams] = useSearchParams()
  const transitioning = useViewTransitionState(`/titles/${slug}`)
  const heading = useRef<HTMLHeadingElement>(null)
  const title = useQuery(api.titles.get, { slug })
  const preview = state as MoviePreview | null
  const movie = title ?? (preview?.slug === slug ? preview : null)

  useEffect(() => {
    if (preview?.slug === slug) heading.current?.focus({ preventScroll: true })
  }, [preview, slug])

  if (title === null) return <NotFound what="title" />
  if (!movie) return <Loading />

  const upcoming = title?.events
    .filter((event) => event.startsAt > Date.now())
    .sort((a, b) => a.startsAt - b.startsAt)
  const dinner = upcoming?.find((event) => event.slug === params.get("dinner")) ?? upcoming?.[0]

  return (
    <Page>
      <div
        className="grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.85fr)] md:gap-12"
        data-movie-transition={transitioning || undefined}
      >
        <Poster
          url={movie.posterUrl}
          name={movie.name}
          style={transitioning ? moviePosterTransition : undefined}
          className="w-full max-w-56 md:max-w-none"
        />
        <div className="min-w-0">
          <h1
            ref={heading}
            tabIndex={-1}
            className="font-display text-5xl leading-none tracking-tight text-paper focus:outline-none md:text-7xl"
          >
            {movie.name}
          </h1>
          <p className="mt-3 font-mono text-sm text-muted">
            {movie.kind === "show" ? "Show" : "Movie"}
            {movie.year ? ` · ${movie.year}` : ""}
          </p>
          {movie.synopsis && (
            <p className="mt-5 max-w-2xl text-lg text-neutral-300">{movie.synopsis}</p>
          )}
          {dinner && upcoming ? (
            <>
              {upcoming.length > 1 && (
                <div className="mt-6 max-w-sm">
                  <Field label="Choose a screening">
                    <Select
                      value={dinner.slug}
                      onChange={(event) => {
                        const next = new URLSearchParams(params)
                        next.set("dinner", event.target.value)
                        next.delete("tickets")
                        setParams(next, { replace: true, preventScrollReset: true, state })
                      }}
                    >
                      {upcoming.map((event) => (
                        <option key={event._id} value={event.slug}>
                          {longDate(event.startsAt)} · {time(event.startsAt)} · {event.venue}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              )}
              <DinnerFacts dinner={dinner} />
              {dinner.note && <p className="mt-4 text-sm text-muted">{dinner.note}</p>}
              <DinnerTickets key={dinner._id} dinner={dinner} />
              <Link
                to={`/events/${dinner.slug}`}
                className="mt-5 inline-block text-sm text-muted underline underline-offset-4 hover:text-paper"
              >
                View dinner details
              </Link>
            </>
          ) : (
            <p role="status" className="mt-6 text-sm text-muted">
              {title ? "No upcoming screenings." : "Loading screenings…"}
            </p>
          )}
        </div>
      </div>

      {title && <TitleRecipes title={title} />}
    </Page>
  )
}

function TitleRecipes({
  title,
}: {
  title: NonNullable<FunctionReturnType<typeof api.titles.get>>
}) {
  return (
    <>
      <section className="mt-16 border-t border-white/10 pt-12">
        <h2 className="font-display text-3xl text-paper">Recipes</h2>
        <div className="mt-6">
          {title.recipes.length === 0 ? (
            <Empty>No recipes for this one yet.</Empty>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {title.recipes.map((r) => {
                const yt = youtubeId(r.videoUrl)
                return (
                  <Link
                    key={r._id}
                    to={`/recipes/${r.slug}`}
                    className="group overflow-hidden rounded-media border border-white/10 transition hover:border-white/30"
                  >
                    {yt && (
                      <img
                        src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`}
                        alt=""
                        className="aspect-video w-full rounded-media object-cover opacity-80 transition group-hover:opacity-100"
                      />
                    )}
                    <div className="p-5">
                      <h3 className="font-display text-2xl text-paper">{r.name}</h3>
                      <p className="mt-1 text-sm text-neutral-400">{r.summary}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <div className="mt-16 max-w-2xl border-t border-white/10 pt-12">
        <Comments target={{ titleId: title._id }} prompt="What should we cook from this?" />
      </div>
    </>
  )
}
