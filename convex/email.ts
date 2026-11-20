import { Resend } from "@convex-dev/resend"
import { components } from "./_generated/api"
import { env, type MutationCtx } from "./_generated/server"

export const SITE_URL = env.SITE_URL ?? "http://localhost:5173"
export const FROM = `${env.SENDER_NAME ?? "Scenes and Supper"} <${env.SENDER_EMAIL ?? "hello@scenesandsupper.com"}>`

const resend = new Resend(components.resend, { apiKey: env.RESEND_API_KEY ?? "", testMode: false })

export async function sendEmail(
  ctx: MutationCtx,
  to: string,
  subject: string,
  text: string,
  key: string,
) {
  if (!env.RESEND_API_KEY) {
    console.warn(`RESEND_API_KEY is not set. Skipped "${subject}" to ${to}.`)
    return
  }
  await resend.sendEmail(ctx, { from: FROM, to, subject, text, idempotencyKey: key })
}
