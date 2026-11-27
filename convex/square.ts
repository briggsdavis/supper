import { ConvexError, v } from "convex/values"
import { internal } from "./_generated/api"
import { action, env, internalAction } from "./_generated/server"
import { SITE_URL } from "./email"

const API =
  env.SQUARE_ENV === "sandbox"
    ? "https://connect.squareupsandbox.com/v2"
    : "https://connect.squareup.com/v2"

type Money = { amount: number; currency: string }
type SquareOrder = {
  id: string
  state: "OPEN" | "COMPLETED" | "CANCELED" | "DRAFT"
  tenders?: { id: string; payment_id?: string }[]
  net_amount_due_money?: Money
}
type Payment = { id: string; status: string; order_id?: string }

async function square<T>(method: string, path: string, body?: unknown): Promise<T> {
  const key = env.SQUARE_ACCESS_TOKEN
  if (!key) throw new ConvexError("Payments aren't set up yet.")
  const res = await fetch(`${API}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Square-Version": "2025-10-16",
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) {
    console.error("Square error", json)
    throw new ConvexError("Payment provider error. Try again.")
  }
  return json as T
}

export const checkout = action({
  args: { eventId: v.id("events"), quantity: v.number() },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    if (!env.SQUARE_ACCESS_TOKEN || !env.SQUARE_LOCATION_ID)
      throw new ConvexError("Payments aren't set up yet.")
    const hold = await ctx.runMutation(internal.orders.reserve, args)
    try {
      const { payment_link: link } = await square<{
        payment_link: { id: string; url: string; order_id: string }
      }>("POST", "online-checkout/payment-links", {
        idempotency_key: hold.orderId,
        order: {
          location_id: env.SQUARE_LOCATION_ID,
          reference_id: hold.orderId,
          line_items: [
            {
              name: hold.name,
              quantity: String(args.quantity),
              base_price_money: { amount: hold.unitCents, currency: "USD" },
            },
          ],
        },
        checkout_options: {
          redirect_url: `${SITE_URL}/checkout/success?ref=${hold.orderId}`,
          ask_for_shipping_address: false,
        },
        ...(hold.email && { pre_populated_data: { buyer_email: hold.email } }),
      })
      await ctx.runMutation(internal.orders.attachPayment, {
        orderId: hold.orderId,
        squareOrderId: link.order_id,
        paymentLinkId: link.id,
      })
      return link.url
    } catch (e) {
      await ctx.runMutation(internal.orders.release, { orderId: hold.orderId })
      throw e
    }
  },
})

export const confirm = action({
  args: { ref: v.string() },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const squareOrderId: string | null = await ctx.runQuery(internal.orders.squareOrderIdFor, {
      ref: args.ref,
    })
    if (squareOrderId === null) return null
    const { order } = await square<{ order: SquareOrder }>("GET", `orders/${squareOrderId}`)
    for (const tender of order.tenders ?? []) {
      if (!tender.payment_id) continue
      const { payment } = await square<{ payment: Payment }>("GET", `payments/${tender.payment_id}`)
      if (payment.status === "COMPLETED") {
        await ctx.runMutation(internal.orders.markPaid, { squareOrderId, paymentId: payment.id })
        break
      }
    }
    return null
  },
})

export const deactivate = internalAction({
  args: { paymentLinkId: v.string() },
  returns: v.null(),
  handler: async (_ctx, args): Promise<null> => {
    try {
      await square("DELETE", `online-checkout/payment-links/${args.paymentLinkId}`)
    } catch (e) {
      console.warn("Could not delete payment link", args.paymentLinkId, e)
    }
    return null
  },
})
