import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import EventCard from "../components/event-card.tsx"
import { Empty, Heading, Loading, Page } from "../components/ui.tsx"
import { TODAY } from "../lib.ts"

export default function Events() {
  const events = useQuery(api.events.upcoming, { after: TODAY })
  return (
    <Page wide>
      <Heading>Dinners</Heading>
      <div className="mt-10">
        {events === undefined ? (
          <Loading />
        ) : events.length === 0 ? (
          <Empty>No dinners on the calendar yet. Check back soon.</Empty>
        ) : (
          <div className="grid gap-x-12 gap-y-12 lg:grid-cols-2">
            {events.map((e) => (
              <EventCard key={e._id} event={e} />
            ))}
          </div>
        )}
      </div>
    </Page>
  )
}
