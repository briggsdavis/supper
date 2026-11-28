import { ArrowRight } from "@phosphor-icons/react"
import type { FunctionReturnType } from "convex/server"
import { useSyncExternalStore, type ReactNode, type Ref } from "react"
import { Link } from "react-router"
import type { api } from "../../convex/_generated/api"
import { shortDate, time, weekday } from "../lib.ts"

type Title = NonNullable<FunctionReturnType<typeof api.titles.get>>
type Dinner = Title["events"][number]
type Media = Title["media"][number]

type Tile = { key: string; weight: number; node: ReactNode }

const WEIGHTS = [1.3, 0.9, 1.1, 0.8, 1.2, 1, 0.85, 1.15]
const TILE = "min-h-0 flex-1 overflow-hidden rounded-media border border-white/10"

function useMedia(query: string) {
  return useSyncExternalStore(
    (notify) => {
      const media = window.matchMedia(query)
      media.addEventListener("change", notify)
      return () => media.removeEventListener("change", notify)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export default function MovieMosaic({
  name,
  description,
  dinners,
  media,
  headingRef,
}: {
  name: string
  description?: string
  dinners?: Dinner[]
  media: Media[]
  headingRef: Ref<HTMLHeadingElement>
}) {
  const wide = useMedia("(min-width: 64rem)")
  const still = useMedia("(prefers-reduced-motion: reduce)")
  const columns = wide ? 3 : 2
  const room = wide ? 10 : 6

  const tiles: Tile[] = [
    {
      key: "info",
      weight: 2.2,
      node: (
        <div className={`${TILE} @container flex flex-col justify-end bg-white/3 p-5`}>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-[min(3rem,15cqw)] leading-none tracking-tight text-paper focus:outline-none"
          >
            {name}
          </h1>
          {description && (
            <p className="mt-3 line-clamp-6 text-sm text-neutral-300 xl:text-base">{description}</p>
          )}
        </div>
      ),
    },
    { key: "dinners", weight: 1.5, node: <DinnersTile dinners={dinners} /> },
    ...media.slice(0, room).map((item, i) => ({
      key: item._id,
      weight: WEIGHTS[i % WEIGHTS.length],
      node: <MediaTile item={item} still={still} />,
    })),
  ]

  const stacks = Array.from({ length: Math.min(columns, tiles.length) }, () => ({
    weight: 0,
    tiles: [] as Tile[],
  }))
  for (const tile of tiles) {
    const stack = stacks.reduce((a, b) => (b.weight < a.weight ? b : a))
    stack.tiles.push(tile)
    stack.weight += tile.weight
  }

  return (
    <div className="flex h-full gap-3">
      {stacks.map((stack, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col gap-3">
          {stack.tiles.map((tile) => (
            <div
              key={tile.key}
              className="flex min-h-0 flex-col"
              style={{ flex: `${tile.weight} 1 0` }}
            >
              {tile.node}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function MediaTile({ item, still }: { item: Media; still: boolean }) {
  return (
    <div className={`${TILE} relative bg-neutral-900`}>
      {item.kind === "video" ? (
        <video
          src={item.url}
          autoPlay={!still}
          controls={still}
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <img
          src={item.url}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  )
}

function DinnersTile({ dinners }: { dinners?: Dinner[] }) {
  return (
    <section className={`${TILE} flex flex-col p-5`}>
      <h2 className="font-mono text-xs tracking-widest text-muted uppercase">Upcoming dinners</h2>
      {!dinners ? (
        <p role="status" className="mt-3 text-sm text-muted">
          Loading…
        </p>
      ) : dinners.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-400">Nothing scheduled yet.</p>
      ) : (
        <ul className="mt-2 min-h-0 flex-1 divide-y divide-white/10 overflow-y-auto">
          {dinners.map((dinner) => {
            const left = dinner.capacity - dinner.sold
            return (
              <li key={dinner._id}>
                <Link
                  to={`/dinners/${dinner.slug}`}
                  className="group flex items-center justify-between gap-3 py-2.5"
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-paper">
                      {weekday(dinner.startsAt)} {shortDate(dinner.startsAt)}
                    </span>
                    <span className="block font-mono text-xs text-neutral-500">
                      {time(dinner.startsAt)} · {left > 0 ? `${left} seats left` : "Sold out"}
                    </span>
                  </span>
                  <ArrowRight
                    size={18}
                    className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-paper"
                  />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
