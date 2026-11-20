import { createBrowserRouter } from "react-router"
import App from "./app.tsx"
import Account from "./routes/account.tsx"
import AdminEventForm from "./routes/admin/event-form.tsx"
import AdminEvents from "./routes/admin/events.tsx"
import AdminGuests from "./routes/admin/guests.tsx"
import AdminLayout from "./routes/admin/layout.tsx"
import AdminRecipeForm from "./routes/admin/recipe-form.tsx"
import AdminTitleForm from "./routes/admin/title-form.tsx"
import AdminTitles from "./routes/admin/titles.tsx"
import Chromatic from "./routes/chromatic.tsx"
import CheckoutSuccess from "./routes/checkout-success.tsx"
import ErrorPage from "./routes/error.tsx"
import Event from "./routes/event.tsx"
import Events from "./routes/events.tsx"
import Home from "./routes/home.tsx"
import Missing from "./routes/missing.tsx"
import Recipe from "./routes/recipe.tsx"
import SignIn from "./routes/sign-in.tsx"
import SignInWithLink from "./routes/sign-in-with-link.tsx"
import Title from "./routes/title.tsx"
import Titles from "./routes/titles.tsx"

export const router = createBrowserRouter([
  {
    path: "/",
    Component: App,
    ErrorBoundary: ErrorPage,
    children: [
      { index: true, Component: Home },
      { path: "events", Component: Events },
      { path: "events/:slug", Component: Event },
      { path: "titles", Component: Titles },
      { path: "titles/:slug", Component: Title },
      { path: "recipes/:slug", Component: Recipe },
      { path: "sign-in", Component: SignIn },
      { path: "sign-in-with-link", Component: SignInWithLink },
      { path: "account", Component: Account },
      { path: "checkout/success", Component: CheckoutSuccess },
      { path: "chromatic", Component: Chromatic },
      {
        path: "admin",
        Component: AdminLayout,
        children: [
          { index: true, Component: AdminEvents },
          { path: "events/new", Component: AdminEventForm },
          { path: "events/:id", Component: AdminEventForm },
          { path: "events/:id/guests", Component: AdminGuests },
          { path: "titles", Component: AdminTitles },
          { path: "titles/new", Component: AdminTitleForm },
          { path: "titles/:id", Component: AdminTitleForm },
          { path: "recipes/new", Component: AdminRecipeForm },
          { path: "recipes/:id", Component: AdminRecipeForm },
        ],
      },
      { path: "*", Component: Missing },
    ],
  },
])
