import { useQuery } from "convex/react"
import { Link, useSearchParams } from "react-router"
import { api } from "../../convex/_generated/api"
import { Empty, Heading, Input, Loading, Page, Poster } from "../components/ui.tsx"

export default function Titles() {
  const [params, setParams] = useSearchParams()
  const search = params.get("q") ?? ""
  const titles = useQuery(api.titles.list, { search })

  return (
    <Page>
      <Heading>Eat the movie</Heading>
      <p className="mt-4 max-w-xl text-neutral-400">
        Find a movie or show and cook what's on screen.
      </p>
      <Input
        type="search"
        value={search}
        onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
        placeholder="Search movies and shows"
        className="mt-8 max-w-md"
        autoFocus
      />
      <div className="mt-10">
        {titles === undefined ? (
          <Loading />
        ) : titles.length === 0 ? (
          <Empty>
            {search
              ? `Nothing for "${search}" yet. Ask for it in the comments of any title.`
              : "No titles yet."}
          </Empty>
        ) : (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {titles.map((t) => (
              <Link key={t._id} to={`/titles/${t.slug}`} className="group">
                <Poster
                  url={t.posterUrl}
                  name={t.name}
                  className="transition group-hover:-translate-y-1"
                />
                <p className="mt-3 font-display text-lg text-paper">{t.name}</p>
                <p className="font-mono text-xs text-neutral-500">
                  {t.kind === "show" ? "Show" : "Movie"}
                  {t.year ? ` · ${t.year}` : ""}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Page>
  )
}
