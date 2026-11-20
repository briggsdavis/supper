import { Link } from "react-router"
import type { FunctionReturnType } from "convex/server"
import type { api } from "../../convex/_generated/api"
import { money, shortDate, time, weekday } from "../lib.ts"
import { Poster } from "./ui.tsx"

export type UpcomingEvent = FunctionReturnType<typeof api.events.upcoming>[number]

export default function EventCard({ event }: { event: UpcomingEvent }) {
  const left = event.capacity - event.sold
  const name = event.title?.name ?? "Dinner"
  return (
    <Link
      to={`/events/${event.slug}`}
      className="group flex gap-5 rounded-2xl border border-white/10 p-4 transition hover:border-white/30 hover:bg-white/[0.03]"
    >
      <Poster url={event.title?.posterUrl} name={name} className="w-24 shrink-0 text-base" />
      <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
        <div>
          <h3 className="font-display text-2xl text-paper">{name}</h3>
          <p className="mt-1 text-sm text-neutral-300">
            {weekday(event.startsAt)} {shortDate(event.startsAt)} · {time(event.startsAt)}
          </p>
          <p className="truncate text-sm text-neutral-500">{event.venue}</p>
        </div>
        <p className="text-sm">
          <span className="text-paper">{money(event.priceCents)}</span>
          <span className="text-neutral-500">
            {" "}
            · {left > 0 ? `${left} seats left` : "Sold out"}
          </span>
        </p>
      </div>
    </Link>
  )
}
