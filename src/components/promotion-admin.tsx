import type { ReactNode } from "react"
import { Link } from "react-router"
import { Alert, Button, ButtonLink, Empty, Heading, Input, Loading } from "./ui.tsx"

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const hex = value.trim().replace(/^#/, "")
  const swatch = /^[\da-f]{6}$/i.test(hex)
    ? "#" + hex
    : /^[\da-f]{3}$/i.test(hex)
      ? "#" + [...hex].map((digit) => digit.repeat(2)).join("")
      : "#000000"

  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm text-muted">{label}</legend>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={swatch}
          aria-label={`Choose ${label.toLowerCase()}`}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-line bg-neutral-900 p-1"
          onChange={(event) => onChange(event.target.value)}
        />
        <Input
          value={value}
          aria-label={`${label} hex code`}
          placeholder="#171717"
          className="max-w-38 font-mono"
          onChange={(event) => onChange(event.target.value)}
          pattern="#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})"
          required
        />
      </div>
    </fieldset>
  )
}

export function PromotionList({
  title,
  path,
  createLabel,
  empty,
  status,
  loadMore,
  children,
}: {
  title: string
  path: string
  createLabel: string
  empty: string
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted"
  loadMore: () => void
  children: ReactNode[]
}) {
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Heading className="text-4xl md:text-5xl">{title}</Heading>
        <ButtonLink to={`${path}/new`}>{createLabel}</ButtonLink>
      </div>
      {status === "LoadingFirstPage" ? (
        <Loading />
      ) : children.length ? (
        <ul className="divide-y divide-line border-y border-line">{children}</ul>
      ) : (
        <Empty>{empty}</Empty>
      )}
      {(status === "CanLoadMore" || status === "LoadingMore") && (
        <Button
          variant="ghost"
          type="button"
          disabled={status === "LoadingMore"}
          onClick={loadMore}
        >
          {status === "LoadingMore" ? "Loading…" : "Load more"}
        </Button>
      )}
    </section>
  )
}

export function PromotionRow({
  to,
  title,
  description,
  color,
  active,
}: {
  to: string
  title: string
  description?: string
  color: string
  active: boolean
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-4">
      <span
        aria-hidden="true"
        className="size-8 shrink-0 rounded-md border border-line"
        style={{ backgroundColor: color }}
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium wrap-break-word text-paper">{title}</p>
        {description && <p className="truncate text-sm text-muted">{description}</p>}
      </div>
      <span className={active ? "text-sm text-emerald-300" : "text-sm text-muted"}>
        {active ? "Active" : "Inactive"}
      </span>
      <Link
        to={to}
        aria-label={`Edit ${title}`}
        className="rounded-full border border-line px-3.5 py-1.5 text-sm text-paper hover:border-paper"
      >
        Edit
      </Link>
    </li>
  )
}

export function PromotionFormActions({
  path,
  error,
  busy,
  remove,
}: {
  path: string
  error: string | null
  busy: boolean
  remove?: () => void
}) {
  return (
    <>
      {error && <Alert>{error}</Alert>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Working…" : "Save"}
        </Button>
        <ButtonLink to={path} variant="ghost">
          Cancel
        </ButtonLink>
        {remove && (
          <Button type="button" variant="danger" disabled={busy} onClick={remove}>
            Delete
          </Button>
        )}
      </div>
    </>
  )
}

export function PromotionActive({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 border-t border-line pt-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 size-4 accent-paper"
      />
      <span>
        <span className="block font-medium text-paper">Active</span>
        <span className="text-sm text-muted">
          Saving as active replaces the currently active item of this type.
        </span>
      </span>
    </label>
  )
}
