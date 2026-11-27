import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router"
import { api } from "../../../convex/_generated/api"
import type { Doc, Id } from "../../../convex/_generated/dataModel"
import { Alert, Button, Field, Input, Loading, NotFound, Textarea } from "../../components/ui.tsx"
import { errorText } from "../../lib.ts"

export default function AdminRecipeForm() {
  const id = useParams().id as Id<"recipes"> | undefined
  const [params] = useSearchParams()
  const recipe = useQuery(api.recipes.byId, id ? { id } : "skip")
  if (id && recipe === undefined) return <Loading />
  const titleId = (recipe?.titleId ?? params.get("title")) as Id<"titles"> | null
  if (!titleId) return <NotFound what="recipe" />
  return <Form key={id ?? "new"} recipe={recipe ?? null} titleId={titleId} />
}

const lines = (s: string) => s.split("\n")

function Form({ recipe, titleId }: { recipe: Doc<"recipes"> | null; titleId: Id<"titles"> }) {
  const save = useMutation(api.recipes.save)
  const remove = useMutation(api.recipes.remove)
  const navigate = useNavigate()
  const [f, setF] = useState({
    name: recipe?.name ?? "",
    summary: recipe?.summary ?? "",
    videoUrl: recipe?.videoUrl ?? "",
    sourceUrl: recipe?.sourceUrl ?? "",
    ingredients: recipe?.ingredients.join("\n") ?? "",
    steps: recipe?.steps.join("\n") ?? "",
  })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (patch: Partial<typeof f>) => setF((old) => ({ ...old, ...patch }))
  const back = () => navigate(`/admin/movies/${titleId}`)

  return (
    <form
      className="max-w-2xl space-y-6"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        setError(null)
        try {
          await save({
            id: recipe?._id,
            titleId,
            name: f.name,
            summary: f.summary,
            videoUrl: f.videoUrl,
            sourceUrl: f.sourceUrl,
            ingredients: lines(f.ingredients),
            steps: lines(f.steps),
          })
          back()
        } catch (err) {
          setError(errorText(err))
          setBusy(false)
        }
      }}
    >
      <h1 className="font-display text-4xl text-paper">{recipe ? "Edit recipe" : "New recipe"}</h1>
      <Field label="Name">
        <Input value={f.name} onChange={(e) => set({ name: e.target.value })} required />
      </Field>
      <Field label="Summary">
        <Input value={f.summary} onChange={(e) => set({ summary: e.target.value })} />
      </Field>
      <Field label="Video URL" hint="YouTube links are embedded on the page.">
        <Input type="url" value={f.videoUrl} onChange={(e) => set({ videoUrl: e.target.value })} />
      </Field>
      <Field label="Source URL">
        <Input
          type="url"
          value={f.sourceUrl}
          onChange={(e) => set({ sourceUrl: e.target.value })}
        />
      </Field>
      <Field label="Ingredients" hint="One per line.">
        <Textarea
          value={f.ingredients}
          onChange={(e) => set({ ingredients: e.target.value })}
          className="min-h-40"
        />
      </Field>
      <Field label="Steps" hint="One per line.">
        <Textarea
          value={f.steps}
          onChange={(e) => set({ steps: e.target.value })}
          className="min-h-48"
        />
      </Field>
      {error && <Alert>{error}</Alert>}
      <div className="flex gap-3">
        <Button disabled={busy}>Save</Button>
        <Button type="button" variant="ghost" onClick={back}>
          Cancel
        </Button>
        {recipe && (
          <Button
            type="button"
            variant="danger"
            onClick={async () => {
              if (!confirm("Delete this recipe?")) return
              await remove({ id: recipe._id })
              back()
            }}
          >
            Delete
          </Button>
        )}
      </div>
    </form>
  )
}
