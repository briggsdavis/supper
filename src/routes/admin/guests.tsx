import { useMutation, useQuery } from "convex/react"
import { useParams } from "react-router"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { Empty, Loading } from "../../components/ui.tsx"
import { longDate } from "../../lib.ts"

export default function AdminGuests() {
  const id = useParams().id as Id<"events">
  const event = useQuery(api.events.byId, { id })
  const guests = useQuery(api.events.guests, { id })
  const checkIn = useMutation(api.events.checkIn)
  if (event === undefined || guests === undefined) return <Loading />
  const seats = guests.reduce((n, g) => n + g.quantity, 0)
  const inside = guests.filter((g) => g.checkedIn).reduce((n, g) => n + g.quantity, 0)

  return (
    <div>
      <h1 className="font-display text-4xl text-paper">Guest list</h1>
      <p className="mt-2 text-neutral-400">
        {event && longDate(event.startsAt)} · {seats} seats sold · {inside} checked in
      </p>
      <div className="mt-8">
        {guests.length === 0 ? (
          <Empty>No tickets sold yet.</Empty>
        ) : (
          <ul className="divide-y divide-white/5">
            {guests.map((g) => (
              <li key={g._id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-paper">{g.name || g.email}</p>
                  {g.name && <p className="text-sm text-neutral-500">{g.email}</p>}
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-sm text-neutral-400">
                    {g.quantity} {g.quantity === 1 ? "seat" : "seats"}
                  </span>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={g.checkedIn}
                      onChange={(e) => checkIn({ orderId: g._id, checkedIn: e.target.checked })}
                      className="size-5 accent-[#f4efe6]"
                    />
                    In
                  </label>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
