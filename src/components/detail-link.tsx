import { useConvex } from "convex/react"
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react"
import { Link, useLocation, useViewTransitionState, type LinkProps } from "react-router"
import { api } from "../../convex/_generated/api"
import { setMorphSource } from "../route-motion.ts"

type DetailSection = "titles" | "events" | "recipes"

type Preview = {
  name: string
  imageUrl?: string | null
  description?: string
}

const queries = {
  titles: api.titles.get,
  events: api.events.get,
  recipes: api.recipes.get,
}

export const detailColumns =
  "grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-12"

function useImageTransition(path: string): CSSProperties | undefined {
  const active = useViewTransitionState(path)
  if (!active) return undefined
  return {
    viewTransitionName: `supper-image${path.replaceAll("/", "-")}`,
    viewTransitionClass: "supper-detail-image",
  }
}

export function useDetailImage(section: DetailSection, slug: string) {
  const path = `/${section}/${slug}`
  const { state } = useLocation()
  const imageStyle = useImageTransition(path)
  const candidate = state as (Preview & { path: string }) | null
  const preview = candidate?.path === path ? candidate : null
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (preview) headingRef.current?.focus({ preventScroll: true })
  }, [preview])
  return { preview, imageStyle, headingRef }
}

export function DetailLink({
  section,
  slug,
  preview,
  children,
  onClick,
  onFocus,
  onPointerEnter,
  ...props
}: Omit<LinkProps, "to" | "state" | "children" | "viewTransition"> & {
  section: DetailSection
  slug: string
  preview: Preview
  children: (style: CSSProperties | undefined) => ReactNode
}) {
  const path = `/${section}/${slug}`
  const imageStyle = useImageTransition(path)
  const convex = useConvex()
  const prewarm = () => convex.prewarmQuery({ query: queries[section], args: { slug } })

  return (
    <Link
      {...props}
      to={path}
      state={{ ...preview, path }}
      viewTransition
      data-detail-transition={imageStyle ? true : undefined}
      onClick={(event) => {
        onClick?.(event)
        setMorphSource(path, event.currentTarget)
      }}
      onFocus={(event) => {
        onFocus?.(event)
        prewarm()
      }}
      onPointerEnter={(event) => {
        onPointerEnter?.(event)
        if (event.pointerType === "mouse") prewarm()
      }}
    >
      {children(imageStyle)}
    </Link>
  )
}
