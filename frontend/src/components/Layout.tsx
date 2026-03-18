import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main
        style={{ backgroundColor: 'var(--color-bg)' }}
        className="flex-1 overflow-y-auto p-8"
      >
        <Outlet />
      </main>
    </div>
  )
}
