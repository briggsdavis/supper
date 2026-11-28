import { useQuery } from "convex/react"
import type { FunctionReturnType } from "convex/server"
import { useParams } from "react-router"
import { api } from "../../convex/_generated/api"
import { DetailLink, useDetailImage } from "../components/detail-link.tsx"
import MovieMosaic from "../components/movie-mosaic.tsx"
import Suggestions from "../components/suggestions.tsx"
import { Empty, Loading, NotFound, Page, Poster } from "../components/ui.tsx"
import { youtubeId } from "../lib.ts"

export default function Title() {
  const { slug = "" } = useParams()
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

  return (
    <Page wide>
      <div
        className="grid gap-3 md:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]"
        data-detail-transition={imageStyle ? true : undefined}
      >
        <Poster url={movie.imageUrl} name={movie.name} style={imageStyle} className="w-full" />
        <div className="relative aspect-[4/5] md:aspect-auto">
          <div className="absolute inset-0">
            <MovieMosaic
              name={movie.name}
              description={movie.description}
              dinners={upcoming}
              media={title?.media ?? []}
              headingRef={headingRef}
            />
          </div>
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
