# Setup

## Environment (Convex)

Set with `bun x convex env set NAME value`.

| Name                    | Needed for                                                         |
| ----------------------- | ------------------------------------------------------------------ |
| `SITE_URL`              | Links in emails and Stripe redirects. Dev: `http://localhost:5173` |
| `RESEND_API_KEY`        | Sign-in links, ticket confirmations, new-dinner alerts             |
| `SENDER_EMAIL`          | From address on a Resend-verified domain                           |
| `SENDER_NAME`           | Optional. Defaults to "Scenes and Supper"                          |
| `ADMIN_EMAILS`          | Comma-separated emails that can use `/admin`                       |
| `STRIPE_SECRET_KEY`     | Ticket checkout                                                    |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook at `<CONVEX_SITE_URL>/stripe`                       |

Stripe webhook events: `checkout.session.completed`, `checkout.session.expired`,
`checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`.

## Sample data

`bun x convex run seed:run` adds three titles with Babish recipes and a sample dinner.

## How tickets work

1. Buying reserves seats and opens Stripe Checkout.
2. Seats are held for about 30 minutes, then released if unpaid.
3. Payment is confirmed by the webhook, and also when the buyer lands on `/checkout/success`.
4. Paid orders get a confirmation email and show in `/account` and the admin guest list.

Event times are Eastern.
