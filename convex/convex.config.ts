import authEmail from "@convex-dev/auth/components/email/convex.config.js"
import auth from "@convex-dev/auth/convex.config.js"
import resend from "@convex-dev/resend/convex.config.js"
import { defineApp } from "convex/server"
import { v } from "convex/values"

const app = defineApp({
  env: {
    RESEND_API_KEY: v.optional(v.string()),
    SENDER_EMAIL: v.optional(v.string()),
    SENDER_NAME: v.optional(v.string()),
    SITE_URL: v.optional(v.string()),
    ADMIN_EMAILS: v.optional(v.string()),
    SQUARE_ACCESS_TOKEN: v.optional(v.string()),
    SQUARE_LOCATION_ID: v.optional(v.string()),
    SQUARE_WEBHOOK_SIGNATURE_KEY: v.optional(v.string()),
    SQUARE_ENV: v.optional(v.string()),
  },
})

app.use(auth)
app.use(authEmail)
app.use(resend)

export default app
