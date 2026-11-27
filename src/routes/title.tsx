import { useQuery } from "convex/react"
import type { FunctionReturnType } from "convex/server"
import { Link, useLocation, useParams, useSearchParams } from "react-router"
import { api } from "../../convex/_generated/api"
import { DetailLink, detailColumns, useDetailImage } from "../components/detail-link.tsx"
import DinnerTickets, { DinnerFacts } from "../components/dinner-tickets.tsx"
import Suggestions from "../components/suggestions.tsx"
import { Empty, Field, Loading, NotFound, Page, Poster, Select } from "../components/ui.tsx"
import { longDate, time, youtubeId } from "../lib.ts"

export default function Title() {
  const { slug = "" } = useParams()
  const { state } = useLocation()
  const [params, setParams] = useSearchParams()
  const { preview, imageStyle, headingRef } = useDetailImage("movies", slug)
  const title = useQuery(api.titles.get, { slug })

  if (title === null) return <NotFound what="title" />
  const movie = title
    ? { name: title.name, description: title.synopsis, imageUrl: title.posterUrl }
    : preview
  if (!movie) return <Loading />

  const upcoming = title?.events
    .filter((event) => event.startsAt > Date.now())
    .sort((a, b) => a.startsAt - b.startsAt)
  const dinner = upcoming?.find((event) => event.slug === params.get("dinner")) ?? upcoming?.[0]

  return (
    <Page wide>
      <div className={detailColumns} data-detail-transition={imageStyle ? true : undefined}>
        <Poster
          url={movie.imageUrl}
          name={movie.name}
          style={imageStyle}
          className="w-full max-w-120"
        />
        <div className="min-w-0">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-5xl leading-none tracking-tight text-paper focus:outline-none md:text-7xl"
          >
            {movie.name}
          </h1>
          {movie.description && (
            <p className="mt-5 max-w-2xl text-lg text-neutral-300">{movie.description}</p>
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
                          {longDate(event.startsAt)} · {time(event.startsAt)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              )}
              <DinnerFacts dinner={dinner} />
              <DinnerTickets key={dinner._id} dinner={dinner} />
              <Link
                to={`/dinners/${dinner.slug}`}
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
                const imageUrl =
                  r.imageUrl ?? (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : null)
                return (
                  <DetailLink
                    key={r._id}
                    section="recipes"
                    slug={r.slug}
                    preview={{ name: r.name, imageUrl, description: r.summary }}
                    className="group overflow-hidden rounded-media border border-white/10 transition hover:border-white/30"
                  >
                    {(imageStyle) => (
                      <>
                        {imageUrl && (
                          <img
                            src={imageUrl}
                            alt=""
                            style={imageStyle}
                            className="aspect-video w-full rounded-media object-cover opacity-80 transition group-hover:opacity-100"
                          />
                        )}
                        <div className="p-5">
                          <h3 className="font-display text-2xl text-paper">{r.name}</h3>
                          <p className="mt-1 text-sm text-neutral-400">{r.summary}</p>
                        </div>
                      </>
                    )}
                  </DetailLink>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <div className="mt-16 max-w-2xl border-t border-white/10 pt-12">
        <Suggestions movie={title.name} />
      </div>
    </>
  )
}
