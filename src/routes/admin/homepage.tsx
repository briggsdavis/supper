import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { api } from "../../../convex/_generated/api"
import { Alert, Loading } from "../../components/ui.tsx"
import { errorText } from "../../lib.ts"

export default function AdminHomepage() {
  const visible = useQuery(api.siteSettings.homepageContent)
  const setHomepageContent = useMutation(api.siteSettings.setHomepageContent)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(visible: boolean) {
    setSaving(true)
    setError(null)
    try {
      await setHomepageContent({ visible })
    } catch (error) {
      setError(errorText(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-display text-4xl text-paper">Homepage</h1>
      {visible === undefined ? (
        <Loading />
      ) : (
        <div className="space-y-3 rounded-2xl border border-white/10 p-5">
          <label className="flex items-center justify-between gap-4 text-paper">
            Show homepage content
            <input
              aria-describedby="homepage-visibility-description"
              checked={visible}
              className="peer sr-only"
              disabled={saving}
              onChange={(event) => void save(event.currentTarget.checked)}
              role="switch"
              type="checkbox"
            />
            <span
              aria-hidden="true"
              className="relative h-6 w-11 shrink-0 rounded-full bg-neutral-700 transition-colors after:absolute after:top-1 after:left-1 after:size-4 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-paper peer-checked:after:translate-x-5 peer-checked:after:bg-neutral-950 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-paper peer-disabled:opacity-50"
            />
          </label>
          <p id="homepage-visibility-description" className="text-sm text-neutral-400">
            Turn off to show only the hero and footer.
          </p>
          <p role="status" className="text-sm text-neutral-400">
            {saving ? "Saving…" : visible ? "Homepage content is visible." : "Homepage content is hidden."}
          </p>
          {error && <Alert>{error}</Alert>}
        </div>
      )}
    </div>
  )
}
