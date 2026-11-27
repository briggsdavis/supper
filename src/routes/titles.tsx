import { useQuery } from "convex/react"
import { useSearchParams } from "react-router"
import { api } from "../../convex/_generated/api"
import { DetailLink } from "../components/detail-link.tsx"
import Suggestions from "../components/suggestions.tsx"
import { Empty, Heading, Input, Loading, Page, Poster } from "../components/ui.tsx"

export default function Titles() {
  const [params, setParams] = useSearchParams()
  const search = params.get("q") ?? ""
  const titles = useQuery(api.titles.list, { search })

  return (
    <Page wide className="max-sm:px-4">
      <Heading>Eat the movie</Heading>
      <p className="mt-4 max-w-xl text-neutral-400">
        Find a movie or show and cook what's on screen.
      </p>
      <Input
        type="search"
        value={search}
        onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
        placeholder="Search movies and shows"
        aria-label="Search movies and shows"
        className="mt-8 max-w-md"
      />
      <div className="mt-10">
        {titles === undefined ? (
          <Loading />
        ) : titles.length === 0 ? (
          <Empty>
            {search ? `Nothing for "${search}" yet. Suggest it below.` : "No titles yet."}
          </Empty>
        ) : (
          <div className="grid grid-cols-2 gap-x-7 gap-y-10 sm:gap-x-9 sm:gap-y-12 md:grid-cols-3 xl:grid-cols-4">
            {titles.map((t) => (
              <DetailLink
                key={t._id}
                section="movies"
                slug={t.slug}
                preview={{ name: t.name, imageUrl: t.posterUrl, description: t.synopsis }}
                className="group"
              >
                {(posterStyle) => (
                  <>
                    <Poster
                      url={t.posterUrl}
                      name={t.name}
                      style={posterStyle}
                      className="motion-safe:transition motion-safe:group-hover:-translate-y-1"
                    />
                    <p className="mt-3 font-display text-lg text-paper">{t.name}</p>
                    <p className="font-mono text-xs text-neutral-500">
                      {t.kind === "show" ? "Show" : "Movie"}
                      {t.year ? ` · ${t.year}` : ""}
                    </p>
                  </>
                )}
              </DetailLink>
            ))}
          </div>
        )}
      </div>
      <div className="mt-16 max-w-2xl border-t border-white/10 pt-12">
        <Suggestions />
      </div>
    </Page>
  )
}
