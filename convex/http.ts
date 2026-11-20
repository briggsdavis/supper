import { httpRouter } from "convex/server"
import { internal } from "./_generated/api"
import { env, httpAction } from "./_generated/server"

const http = httpRouter()

const hex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("")

async function verify(payload: string, header: string | null, secret: string) {
  if (!header) return false
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]))
  const t = Number(parts.t)
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = hex(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`)),
  )
  return header
    .split(",")
    .filter((p) => p.startsWith("v1="))
    .some((p) => p.slice(3) === sig)
}

http.route({
  path: "/stripe",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const secret = env.STRIPE_WEBHOOK_SECRET
    if (!secret) return new Response("Webhook not configured", { status: 500 })
    const payload = await req.text()
    if (!(await verify(payload, req.headers.get("stripe-signature"), secret))) {
      return new Response("Bad signature", { status: 400 })
    }
    const event: unknown = JSON.parse(payload)
    if (typeof event !== "object" || event === null || !("type" in event) || !("data" in event)) {
      return new Response("Bad event", { status: 400 })
    }
    const { type, data } = event as {
      type: string
      data: { object: { id: string; payment_status?: string; metadata?: { orderId?: string } } }
    }
    const session = data.object
    if (
      (type === "checkout.session.completed" ||
        type === "checkout.session.async_payment_succeeded") &&
      session.payment_status === "paid"
    ) {
      await ctx.runMutation(internal.orders.markPaid, {
        sessionId: session.id,
        orderId: session.metadata?.orderId,
      })
    } else if (
      type === "checkout.session.expired" ||
      type === "checkout.session.async_payment_failed"
    ) {
      await ctx.runMutation(internal.orders.releaseSession, { sessionId: session.id })
    }
    return new Response(null, { status: 200 })
  }),
})

export default http
