import type { FunctionReturnType } from "convex/server"
import type { api } from "../../convex/_generated/api"
import { money, shortDate, time, weekday } from "../lib.ts"
import { DetailLink } from "./detail-link.tsx"
import { Poster } from "./ui.tsx"

export type UpcomingEvent = FunctionReturnType<typeof api.events.upcoming>[number]

export default function EventCard({ event }: { event: UpcomingEvent }) {
  const left = event.capacity - event.sold
  const name = event.title?.name ?? "Dinner"
  return (
    <DetailLink
      section="events"
      slug={event.slug}
      preview={{ name, imageUrl: event.title?.posterUrl, description: event.title?.synopsis }}
      className="group flex items-center gap-5 sm:gap-7"
    >
      {(imageStyle) => (
        <>
          <Poster
            url={event.title?.posterUrl}
            name={name}
            style={imageStyle}
            className="w-[min(40vw,15rem)] shrink-0 text-base motion-safe:transition motion-safe:group-hover:-translate-y-1"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-3 py-1">
            <div>
              <h3 className="font-display text-2xl wrap-break-word text-paper">{name}</h3>
              <p className="mt-1 font-mono text-sm text-neutral-300">
                {weekday(event.startsAt)} {shortDate(event.startsAt)} · {time(event.startsAt)}
              </p>
              <p className="font-mono text-sm wrap-break-word text-neutral-500">{event.venue}</p>
            </div>
            <p className="font-mono text-sm">
              <span className="text-paper">{money(event.priceCents)}</span>
              <span className="text-neutral-500">
                {" · "}
                {left > 0 ? `${left} seats left` : "Sold out"}
              </span>
            </p>
          </div>
        </>
      )}
    </DetailLink>
  )
}
