import { useConvex } from "convex/react"
import type { CSSProperties, ReactNode } from "react"
import { Link, useViewTransitionState, type LinkProps } from "react-router"
import { api } from "../../convex/_generated/api"

export type MoviePreview = {
  slug: string
  name: string
  posterUrl: string | null
  kind: "movie" | "show"
  year?: number
  synopsis: string
}

export const moviePosterTransition = { viewTransitionName: "supper-movie-poster" }

export function MovieLink({
  movie: { slug, name, posterUrl, kind, year, synopsis },
  children,
  onFocus,
  onPointerEnter,
  ...props
}: Omit<LinkProps, "to" | "state" | "children" | "viewTransition"> & {
  movie: MoviePreview
  children: (style: CSSProperties | undefined) => ReactNode
}) {
  const to = `/titles/${slug}`
  const transitioning = useViewTransitionState(to)
  const convex = useConvex()
  const movie: MoviePreview = { slug, name, posterUrl, kind, year, synopsis }
  const prewarm = () => convex.prewarmQuery({ query: api.titles.get, args: { slug } })

  return (
    <Link
      {...props}
      to={to}
      state={movie}
      viewTransition
      data-movie-transition={transitioning || undefined}
      onFocus={(event) => {
        onFocus?.(event)
        prewarm()
      }}
      onPointerEnter={(event) => {
        onPointerEnter?.(event)
        if (event.pointerType === "mouse") prewarm()
      }}
    >
      {children(transitioning ? moviePosterTransition : undefined)}
    </Link>
  )
}
