import { useQuery } from "convex/react"
import type { FunctionReturnType } from "convex/server"
import { Link, useParams } from "react-router"
import { api } from "../../convex/_generated/api"
import { detailColumns, useDetailImage } from "../components/detail-link.tsx"
import { Loading, NotFound, Page } from "../components/ui.tsx"
import { host, youtubeId } from "../lib.ts"

export default function Recipe() {
  const { slug = "" } = useParams()
  const { preview, imageStyle, headingRef } = useDetailImage("recipes", slug)
  const recipe = useQuery(api.recipes.get, { slug })
  if (recipe === null) return <NotFound what="recipe" />
  if (!recipe && !preview) return <Loading />
  const yt = youtubeId(recipe?.videoUrl)
  const imageUrl =
    recipe?.imageUrl ??
    preview?.imageUrl ??
    (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : null)

  return (
    <Page wide>
      <div
        className={imageUrl ? detailColumns : undefined}
        data-detail-transition={imageStyle ? true : undefined}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            style={imageStyle}
            className="aspect-video w-full rounded-media bg-neutral-900 object-cover"
          />
        )}
        <div className="min-w-0">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-5xl leading-none tracking-tight text-paper focus:outline-none md:text-7xl"
          >
            {recipe?.name ?? preview?.name}
          </h1>
          {recipe?.title && (
            <Link
              to={`/movies/${recipe.title.slug}`}
              className="mt-3 inline-block font-mono text-sm text-neutral-400 hover:text-paper"
            >
              From {recipe.title.name}
            </Link>
          )}
          <p className="mt-5 max-w-2xl text-lg text-neutral-300">
            {recipe?.summary ?? preview?.description}
          </p>
        </div>
      </div>
      {recipe && <RecipeInstructions recipe={recipe} />}
    </Page>
  )
}

function RecipeInstructions({
  recipe,
}: {
  recipe: NonNullable<FunctionReturnType<typeof api.recipes.get>>
}) {
  const yt = youtubeId(recipe.videoUrl)

  return (
    <>
      {yt ? (
        <div className="mt-12 aspect-video max-w-4xl overflow-hidden rounded-media border border-white/10">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${yt}`}
            title={recipe.name}
            className="h-full w-full"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        recipe.videoUrl && (
          <a
            href={recipe.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-block text-paper underline underline-offset-4"
          >
            Watch the video
          </a>
        )
      )}

      <div className="mt-12 grid gap-12 md:grid-cols-[1fr_1.6fr]">
        <section>
          <h2 className="font-display text-3xl text-paper">Ingredients</h2>
          <ul className="mt-4 space-y-2">
            {recipe.ingredients.map((i, n) => (
              <li key={n} className="border-b border-white/5 pb-2 text-neutral-200">
                {i}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="font-display text-3xl text-paper">Steps</h2>
          <ol className="mt-4 space-y-5">
            {recipe.steps.map((s, n) => (
              <li key={n} className="flex gap-4">
                <span className="font-mono text-2xl text-neutral-500">{n + 1}</span>
                <p className="pt-1 text-neutral-200">{s}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {recipe.sourceUrl && (
        <p className="mt-12 font-mono text-sm text-neutral-500">
          Source:{" "}
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 hover:text-paper"
          >
            {host(recipe.sourceUrl)}
          </a>
        </p>
      )}
    </>
  )
}
