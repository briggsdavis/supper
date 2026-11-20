import { Link, Outlet } from "react-router"

export default function App() {
  return (
    <div className="p-8">
      <nav className="mb-6 flex gap-4">
        <Link to="/">Home</Link>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
