import { createBrowserRouter } from "react-router"
import App from "./app.tsx"
import ErrorPage from "./routes/error.tsx"
import Home from "./routes/home.tsx"

export const router = createBrowserRouter([
  {
    path: "/",
    Component: App,
    ErrorBoundary: ErrorPage,
    children: [{ index: true, Component: Home }],
  },
])
