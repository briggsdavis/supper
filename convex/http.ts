import { httpRouter } from "convex/server"
import { internal } from "./_generated/api"
import { env, httpAction } from "./_generated/server"

const http = httpRouter()

async function verify(payload: string, header: string | null, key: string) {
  if (!header) return false
  const hmac = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign(
    "HMAC",
    hmac,
    new TextEncoder().encode(`${env.CONVEX_SITE_URL}/square${payload}`),
  )
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)))
  if (expected.length !== header.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ header.charCodeAt(i)
  return diff === 0
}

http.route({
  path: "/square",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const key = env.SQUARE_WEBHOOK_SIGNATURE_KEY
    if (!key) return new Response("Webhook not configured", { status: 500 })
    const payload = await req.text()
    if (!(await verify(payload, req.headers.get("x-square-hmacsha256-signature"), key))) {
      return new Response("Bad signature", { status: 400 })
    }
    const event = JSON.parse(payload) as {
      type?: string
      data?: { object?: { payment?: { id: string; status: string; order_id?: string } } }
    }
    const payment = event.data?.object?.payment
    if (
      (event.type === "payment.created" || event.type === "payment.updated") &&
      payment?.status === "COMPLETED" &&
      payment.order_id
    ) {
      await ctx.runMutation(internal.orders.markPaid, {
        squareOrderId: payment.order_id,
        paymentId: payment.id,
      })
    }
    return new Response(null, { status: 200 })
  }),
})

export default http
