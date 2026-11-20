import { ConvexError, v } from "convex/values"
import { internal } from "./_generated/api"
import { action, env } from "./_generated/server"
import { SITE_URL } from "./email"

type Session = {
  id: string
  url: string | null
  status: "open" | "complete" | "expired"
  payment_status: "paid" | "unpaid" | "no_payment_required"
  metadata: Record<string, string> | null
}

export async function stripe(path: string, body?: URLSearchParams): Promise<Session> {
  const key = env.STRIPE_SECRET_KEY
  if (!key) throw new ConvexError("Payments aren't set up yet.")
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      ...(body && { "Content-Type": "application/x-www-form-urlencoded" }),
    },
    body,
  })
  const json = await res.json()
  if (!res.ok) {
    console.error("Stripe error", json)
    throw new ConvexError("Payment provider error. Try again.")
  }
  return json as Session
}

export const checkout = action({
  args: { eventId: v.id("events"), quantity: v.number() },
  returns: v.string(),
  handler: async (ctx, args) => {
    if (!env.STRIPE_SECRET_KEY) throw new ConvexError("Payments aren't set up yet.")
    const hold = await ctx.runMutation(internal.orders.reserve, args)
    try {
      const body = new URLSearchParams({
        mode: "payment",
        "line_items[0][quantity]": String(args.quantity),
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][unit_amount]": String(hold.unitCents),
        "line_items[0][price_data][product_data][name]": hold.name,
        success_url: `${SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${SITE_URL}/events/${hold.slug}`,
        client_reference_id: hold.orderId,
        "metadata[orderId]": hold.orderId,
        expires_at: String(Math.floor(Date.now() / 1000) + 31 * 60),
      })
      if (hold.email) body.set("customer_email", hold.email)
      const session = await stripe("checkout/sessions", body)
      await ctx.runMutation(internal.orders.attachSession, {
        orderId: hold.orderId,
        sessionId: session.id,
      })
      if (!session.url) throw new ConvexError("Payment provider error. Try again.")
      return session.url
    } catch (e) {
      await ctx.runMutation(internal.orders.release, { orderId: hold.orderId })
      throw e
    }
  },
})

export const confirm = action({
  args: { sessionId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await stripe(`checkout/sessions/${encodeURIComponent(args.sessionId)}`)
    if (session.payment_status === "paid") {
      await ctx.runMutation(internal.orders.markPaid, { sessionId: session.id })
    }
    return null
  },
})
