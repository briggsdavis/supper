import { ConvexError } from "convex/values"

export const TZ = "America/New_York"

export const money = (cents: number) =>
  (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 ? 2 : 0,
  })

export const longDate = (ts: number) =>
  new Date(ts).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: TZ,
  })

export const shortDate = (ts: number) =>
  new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: TZ })

export const time = (ts: number) =>
  new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ })

export const weekday = (ts: number) =>
  new Date(ts).toLocaleDateString("en-US", { weekday: "short", timeZone: TZ })

export const TODAY = (() => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
})()

const offset = (ts: number) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(ts)
      .map((p) => [p.type, p.value]),
  )
  return (
    Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second) -
    ts
  )
}

export function fromZonedInput(value: string) {
  const [d, t] = value.split("T")
  const [y, m, day] = d.split("-").map(Number)
  const [h, min] = t.split(":").map(Number)
  const guess = Date.UTC(y, m - 1, day, h, min)
  const first = guess - offset(guess)
  return guess - offset(first)
}

export function toZonedInput(ts: number) {
  const z = new Date(ts + offset(ts))
  return z.toISOString().slice(0, 16)
}

export function youtubeId(url?: string) {
  if (!url) return null
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/,
  )
  return m ? m[1] : null
}

export function errorText(e: unknown) {
  if (e instanceof ConvexError) return String(e.data)
  console.error(e)
  return "Something went wrong. Try again."
}

export const NEXT_KEY = "supper:next"

export function host(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}
