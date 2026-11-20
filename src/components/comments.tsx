import { useConvexAuth, useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { Link, useLocation } from "react-router"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import { errorText, shortDate } from "../lib.ts"
import { Alert, Button, Textarea } from "./ui.tsx"

type Target = { titleId: Id<"titles"> } | { eventId: Id<"events"> }

export default function Comments({ target, prompt }: { target: Target; prompt: string }) {
  const comments = useQuery(api.comments.list, { target })
  const add = useMutation(api.comments.add)
  const remove = useMutation(api.comments.remove)
  const { isAuthenticated } = useConvexAuth()
  const location = useLocation()
  const [body, setBody] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  return (
    <section className="space-y-6">
      <h2 className="font-display text-3xl text-paper">{prompt}</h2>
      {isAuthenticated ? (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setError(null)
            try {
              await add({ target, body })
              setBody("")
            } catch (err) {
              setError(errorText(err))
            } finally {
              setBusy(false)
            }
          }}
        >
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What scene should we eat next?"
            maxLength={1000}
            required
          />
          {error && <Alert>{error}</Alert>}
          <Button disabled={busy || !body.trim()}>Post</Button>
        </form>
      ) : (
        <p className="text-neutral-400">
          <Link
            to={`/sign-in?next=${encodeURIComponent(location.pathname)}`}
            className="text-paper underline underline-offset-4"
          >
            Sign in
          </Link>{" "}
          to join the conversation.
        </p>
      )}
      <ul className="divide-y divide-white/5">
        {comments?.map((c) => (
          <li key={c._id} className="py-4">
            <div className="flex items-baseline justify-between gap-4 text-xs text-neutral-500">
              <span className="font-medium text-neutral-300">{c.author}</span>
              <span className="flex gap-3">
                {shortDate(c._creationTime)}
                {c.canDelete && (
                  <button className="hover:text-red-300" onClick={() => remove({ id: c._id })}>
                    Delete
                  </button>
                )}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-line text-neutral-200">{c.body}</p>
          </li>
        ))}
        {comments?.length === 0 && (
          <li className="py-4 text-neutral-500">No comments yet. Be the first.</li>
        )}
      </ul>
    </section>
  )
}
