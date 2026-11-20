import { Link, Outlet } from "react-router"

export default function App() {
  return (
    <div>
      <nav>
        <Link to="/">Home</Link>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
