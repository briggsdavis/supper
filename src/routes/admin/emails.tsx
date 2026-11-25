import { usePaginatedQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Button, Empty, Heading, Loading } from "../../components/ui.tsx"
import { shortDate } from "../../lib.ts"

export default function Emails() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.promotions.listSignups,
    {},
    { initialNumItems: 30 },
  )
  return (
    <section className="space-y-6">
      <Heading className="text-4xl md:text-5xl">Emails</Heading>
      {status === "LoadingFirstPage" ? (
        <Loading />
      ) : results.length ? (
        <div className="overflow-x-auto border-y border-line">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Popup email signups</caption>
            <thead className="border-b border-line text-muted">
              <tr>
                <th scope="col" className="p-3">
                  Email
                </th>
                <th scope="col" className="p-3">
                  Popup
                </th>
                <th scope="col" className="p-3">
                  Signed up
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {results.map((signup) => (
                <tr key={signup._id}>
                  <td className="p-3 text-paper">{signup.email}</td>
                  <td className="p-3 text-muted">{signup.popupTitle}</td>
                  <td className="p-3 whitespace-nowrap text-muted">
                    <time dateTime={new Date(signup._creationTime).toISOString()}>
                      {shortDate(signup._creationTime)}
                    </time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>No popup email signups yet.</Empty>
      )}
      {(status === "CanLoadMore" || status === "LoadingMore") && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => loadMore(30)}
          disabled={status === "LoadingMore"}
        >
          {status === "LoadingMore" ? "Loading…" : "Load more"}
        </Button>
      )}
    </section>
  )
}
