import { useConvexAuth, useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { Link, useLocation } from "react-router"
import { api } from "../../convex/_generated/api"
import { errorText, shortDate } from "../lib.ts"
import { Alert, Button, Field, Input, Textarea } from "./ui.tsx"

export default function Suggestions({ movie: initialMovie = "" }: { movie?: string }) {
  const suggestions = useQuery(api.suggestions.list)
  const add = useMutation(api.suggestions.add)
  const remove = useMutation(api.suggestions.remove)
  const { isAuthenticated } = useConvexAuth()
  const location = useLocation()
  const [movie, setMovie] = useState(initialMovie)
  const [food, setFood] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-display text-3xl text-paper">What should we eat next?</h2>
        <p className="mt-2 text-neutral-400">
          Pick any movie or show, even one we haven't done, and tell us what to cook from it.
        </p>
      </div>
      {isAuthenticated ? (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setError(null)
            try {
              await add({ movie, food })
              setMovie(initialMovie)
              setFood("")
            } catch (err) {
              setError(errorText(err))
            } finally {
              setBusy(false)
            }
          }}
        >
          <Field label="Movie or show">
            <Input
              value={movie}
              onChange={(e) => setMovie(e.target.value)}
              placeholder="Ratatouille"
              maxLength={200}
              required
            />
          </Field>
          <Field label="What should we cook?">
            <Textarea
              value={food}
              onChange={(e) => setFood(e.target.value)}
              placeholder="The ratatouille Remy makes for Ego"
              maxLength={1000}
              required
            />
          </Field>
          {error && <Alert>{error}</Alert>}
          <Button disabled={busy || !movie.trim() || !food.trim()}>Suggest</Button>
        </form>
      ) : (
        <p className="text-neutral-400">
          <Link
            to={`/sign-in?next=${encodeURIComponent(location.pathname)}`}
            className="text-paper underline underline-offset-4"
          >
            Sign in
          </Link>{" "}
          to suggest a movie.
        </p>
      )}
      <ul className="divide-y divide-white/5">
        {suggestions?.map((s) => (
          <li key={s._id} className="py-4">
            <div className="flex items-baseline justify-between gap-4 text-xs text-neutral-500">
              <span className="font-medium text-neutral-300">{s.author}</span>
              <span className="flex gap-3">
                {shortDate(s._creationTime)}
                {s.canDelete && (
                  <button className="hover:text-red-300" onClick={() => remove({ id: s._id })}>
                    Delete
                  </button>
                )}
              </span>
            </div>
            <p className="mt-1 font-display text-lg text-paper">{s.movie}</p>
            <p className="whitespace-pre-line text-neutral-200">{s.food}</p>
          </li>
        ))}
        {suggestions?.length === 0 && (
          <li className="py-4 text-neutral-500">No suggestions yet. Be the first.</li>
        )}
      </ul>
    </section>
  )
}
