import { useQuery } from "convex/react"
import { Link, useParams } from "react-router"
import { api } from "../../convex/_generated/api"
import Comments from "../components/comments.tsx"
import { Empty, Loading, NotFound, Page, Poster } from "../components/ui.tsx"
import { longDate, time, youtubeId } from "../lib.ts"

export default function Title() {
  const { slug = "" } = useParams()
  const title = useQuery(api.titles.get, { slug })
  if (title === undefined) return <Loading />
  if (title === null) return <NotFound what="title" />
  const upcoming = title.events.filter((e) => e.startsAt > Date.now())

  return (
    <Page>
      <div className="grid gap-10 md:grid-cols-[16rem_1fr]">
        <Poster url={title.posterUrl} name={title.name} className="w-48 md:w-64" />
        <div>
          <h1 className="font-display text-6xl leading-none text-paper md:text-7xl">
            {title.name}
          </h1>
          <p className="mt-2 font-mono text-neutral-500">
            {title.kind === "show" ? "Show" : "Movie"}
            {title.year ? ` · ${title.year}` : ""}
          </p>
          <p className="mt-6 max-w-2xl text-lg text-neutral-300">{title.synopsis}</p>
          {upcoming.map((e) => (
            <Link
              key={e._id}
              to={`/events/${e.slug}`}
              className="mt-6 flex max-w-md items-center justify-between rounded-2xl border border-white/15 px-5 py-4 hover:border-white/40"
            >
              <span className="font-mono text-sm text-paper">
                Dinner on {longDate(e.startsAt)} · {time(e.startsAt)}
              </span>
              <span className="text-sm text-paper">Tickets</span>
            </Link>
          ))}
        </div>
      </div>

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
                    className="group overflow-hidden rounded-2xl border border-white/10 transition hover:border-white/30"
                  >
                    {yt && (
                      <img
                        src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`}
                        alt=""
                        className="aspect-video w-full object-cover opacity-80 transition group-hover:opacity-100"
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
    </Page>
  )
}
