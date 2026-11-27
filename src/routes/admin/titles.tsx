import { useQuery } from "convex/react"
import { Link } from "react-router"
import { api } from "../../../convex/_generated/api"
import { ButtonLink, Empty, Loading } from "../../components/ui.tsx"

export default function AdminTitles() {
  const titles = useQuery(api.titles.all)
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl text-paper">Titles</h1>
        <ButtonLink to="/admin/movies/new">New title</ButtonLink>
      </div>
      <div className="mt-8">
        {titles === undefined ? (
          <Loading />
        ) : titles.length === 0 ? (
          <Empty>No titles yet.</Empty>
        ) : (
          <ul className="divide-y divide-white/5">
            {titles.map((t) => (
              <li key={t._id} className="flex items-center justify-between py-3">
                <Link to={`/admin/movies/${t._id}`} className="text-paper hover:underline">
                  {t.name} <span className="text-neutral-500">{t.year}</span>
                </Link>
                <Link
                  to={`/movies/${t.slug}`}
                  className="text-sm text-neutral-400 hover:text-paper"
                >
                  View
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
