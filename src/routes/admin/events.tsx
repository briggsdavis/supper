import { useQuery } from "convex/react"
import { Link } from "react-router"
import { api } from "../../../convex/_generated/api"
import { ButtonLink, Empty, Loading } from "../../components/ui.tsx"
import { money, shortDate, time } from "../../lib.ts"

export default function AdminEvents() {
  const events = useQuery(api.events.all)
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl text-paper">Dinners</h1>
        <ButtonLink to="/admin/events/new">New dinner</ButtonLink>
      </div>
      <div className="mt-8">
        {events === undefined ? (
          <Loading />
        ) : events.length === 0 ? (
          <Empty>No dinners yet. Add a title first, then create a dinner.</Empty>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-neutral-500">
              <tr>
                <th className="py-3 font-normal">Date</th>
                <th className="font-normal">Title</th>
                <th className="font-normal">Price</th>
                <th className="font-normal">Sold</th>
                <th className="font-normal">Status</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {events.map((e) => (
                <tr key={e._id}>
                  <td className="py-3 text-neutral-300">
                    {shortDate(e.startsAt)} · {time(e.startsAt)}
                  </td>
                  <td className="text-paper">
                    <Link to={`/admin/events/${e._id}`} className="hover:underline">
                      {e.title?.name ?? "?"}
                    </Link>
                  </td>
                  <td>{money(e.priceCents)}</td>
                  <td>
                    {e.sold} / {e.capacity}
                  </td>
                  <td>
                    {e.published ? (
                      <span className="text-emerald-300">Live</span>
                    ) : (
                      <span className="text-neutral-500">Draft</span>
                    )}
                  </td>
                  <td className="space-x-4 text-right">
                    <Link
                      to={`/admin/events/${e._id}/guests`}
                      className="text-neutral-400 hover:text-paper"
                    >
                      Guests
                    </Link>
                    <Link to={`/events/${e.slug}`} className="text-neutral-400 hover:text-paper">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
