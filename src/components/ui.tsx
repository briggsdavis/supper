import type {
  ButtonHTMLAttributes,
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react"
import { Link, type LinkProps } from "react-router"

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ")

const BTN = {
  primary: "bg-paper text-neutral-950 hover:bg-white",
  ghost: "border border-white/15 text-paper hover:border-white/40",
  danger: "border border-red-400/30 text-red-300 hover:border-red-400/70",
}

type Variant = keyof typeof BTN
const btn = (variant: Variant, className?: string) =>
  cx(
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
    BTN[variant],
    className,
  )

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={btn(variant, className)} {...props} />
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: LinkProps & { variant?: Variant }) {
  return <Link className={btn(variant, className)} {...props} />
}

const FIELD =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-paper outline-none placeholder:text-neutral-600 focus:border-white/40"

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(FIELD, className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(FIELD, "min-h-28", className)} {...props} />
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(FIELD, "appearance-none", className)} {...props} />
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm text-neutral-400">{label}</span>
      {children}
      {hint && <span className="block text-xs text-neutral-500">{hint}</span>}
    </label>
  )
}

export function Page({
  children,
  className,
  wide,
}: {
  children: ReactNode
  className?: string
  wide?: boolean
}) {
  return (
    <div className={cx("mx-auto w-full px-6 py-12", wide ? "max-w-7xl" : "max-w-6xl", className)}>
      {children}
    </div>
  )
}

export function Heading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h1 className={cx("font-display text-5xl leading-none text-paper md:text-6xl", className)}>
      {children}
    </h1>
  )
}

export function Poster({
  url,
  name,
  className,
  style,
}: {
  url: string | null | undefined
  name: string
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      className={cx(
        "relative aspect-[2/3] overflow-hidden rounded-media bg-neutral-900",
        className,
      )}
      style={style}
    >
      {url ? (
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full place-items-center bg-[radial-gradient(ellipse_at_top,#26232a,#0c0b0d)] p-4 text-center font-display text-2xl text-paper/80">
          {name}
        </div>
      )}
    </div>
  )
}

export function Loading() {
  return <p className="py-24 text-center text-sm text-neutral-500">Loading</p>
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-neutral-500">
      {children}
    </p>
  )
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
    >
      {children}
    </p>
  )
}

export function NotFound({ what = "page" }: { what?: string }) {
  return (
    <Page className="py-32 text-center">
      <Heading>Lost the reel</Heading>
      <p className="mt-4 text-neutral-400">We couldn't find that {what}.</p>
      <ButtonLink to="/" variant="ghost" className="mt-8">
        Back home
      </ButtonLink>
    </Page>
  )
}
