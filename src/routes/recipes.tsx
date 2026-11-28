import { useQuery } from "convex/react"
import { useSearchParams } from "react-router"
import { api } from "../../convex/_generated/api"
import { DetailLink } from "../components/detail-link.tsx"
import { Empty, Heading, Input, Loading, Page } from "../components/ui.tsx"
import { youtubeId } from "../lib.ts"

const COURSES = ["To start", "Main", "Dessert", "Drink"]

export default function Recipes() {
  const [params, setParams] = useSearchParams()
  const search = params.get("q") ?? ""
  const course = params.get("course") ?? ""
  const recipes = useQuery(api.recipes.list)

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true, preventScrollReset: true })
  }

  const courses = recipes
    ? [
        ...COURSES.filter((c) => recipes.some((r) => r.course === c)),
        ...new Set(recipes.map((r) => r.course).filter((c) => c && !COURSES.includes(c))),
      ]
    : []
  const q = search.trim().toLowerCase()
  const shown = recipes?.filter(
    (r) =>
      (!course || r.course === course) &&
      (!q ||
        [r.name, r.summary, r.title?.name, ...r.ingredients].some((s) =>
          s?.toLowerCase().includes(q),
        )),
  )

  return (
    <Page wide className="max-sm:px-4">
      <Heading>Recipes</Heading>
      <p className="mt-4 max-w-xl text-neutral-400">
        Every dish from every dinner. Cook it at home.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Input
          type="search"
          value={search}
          onChange={(e) => update("q", e.target.value)}
          placeholder="Search dishes, ingredients or movies"
          aria-label="Search recipes"
          className="max-w-md"
        />
        {courses.length > 1 && (
          <div role="group" aria-label="Filter by course" className="flex flex-wrap gap-2">
            {["", ...courses].map((c) => (
              <button
                key={c || "all"}
                type="button"
                aria-pressed={course === c}
                onClick={() => update("course", c ?? "")}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  course === c
                    ? "border-paper bg-paper text-neutral-950"
                    : "border-white/15 text-paper hover:border-white/40"
                }`}
              >
                {c || "All"}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-10">
        {shown === undefined ? (
          <Loading />
        ) : shown.length === 0 ? (
          <Empty>{search || course ? "No recipes match that." : "No recipes yet."}</Empty>
        ) : (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((r) => {
              const yt = youtubeId(r.videoUrl)
              const imageUrl =
                r.imageUrl ?? (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : null)
              return (
                <DetailLink
                  key={r._id}
                  section="recipes"
                  slug={r.slug}
                  preview={{ name: r.name, imageUrl, description: r.summary }}
                  className="group"
                >
                  {(imageStyle) => (
                    <>
                      <div className="aspect-video overflow-hidden rounded-media bg-neutral-900">
                        {imageUrl && (
                          <img
                            src={imageUrl}
                            alt=""
                            style={imageStyle}
                            loading="lazy"
                            className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100 motion-safe:group-hover:scale-[1.03]"
                          />
                        )}
                      </div>
                      <p className="mt-3 font-mono text-xs text-neutral-500">
                        {[r.course, r.title?.name].filter(Boolean).join(" · ")}
                      </p>
                      <h2 className="mt-1 font-display text-2xl text-paper">{r.name}</h2>
                      <p className="mt-1 line-clamp-2 text-sm text-neutral-400">{r.summary}</p>
                    </>
                  )}
                </DetailLink>
              )
            })}
          </div>
        )}
      </div>
    </Page>
  )
}
