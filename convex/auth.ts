import { setupEmailMagicLink } from "@convex-dev/auth/methods/email-magic-link/server"
import { setupConvexAuth } from "@convex-dev/auth/server"
import { components, internal } from "./_generated/api"
import { env } from "./_generated/server"
import { FROM, SITE_URL } from "./email"

const auth = setupConvexAuth({ component: components.auth })
export const { signOut, refreshSession, isAuthenticated } = auth

export const { sendEmailMagicLink, signInWithEmailMagicLink } = setupEmailMagicLink(auth, {
  component: components.authEmail,
  emailSender: {
    kind: "resend",
    sendEmail: components.resend.lib.sendEmail,
    apiKey: env.RESEND_API_KEY ?? "",
    from: FROM,
  },
  url: `${SITE_URL}/sign-in-with-link`,
}).attachUserCallbacks({
  createUser: internal.users.createUser,
})
