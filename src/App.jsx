import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import MobileNav from './components/MobileNav'
import Dashboard from './pages/Dashboard'
import AllPublications from './pages/AllPublications'
import ByYear from './pages/ByYear'
import ByAuthor from './pages/ByAuthor'
import Analytics from './pages/Analytics'

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* Sidebar — desktop only */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="w-64 bg-white h-full shadow-xl z-50">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3
                        bg-white border-b border-slate-100 sticky top-0 z-30 shadow-sm">
          <button onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6"  x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-extrabold text-slate-800 text-sm font-display">
            Research Dashboard
          </span>
          <div className="w-8" />
        </div>

        {/* Page */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-20 md:pb-6">
          <div className="max-w-5xl mx-auto">
            <Routes>
              <Route index            element={<Dashboard />} />
              <Route path="all"       element={<AllPublications />} />
              <Route path="by-year"   element={<ByYear />} />
              <Route path="by-author" element={<ByAuthor />} />
              <Route path="analytics" element={<Analytics />} />
            </Routes>
          </div>
        </main>

        {/* Mobile bottom nav */}
        <MobileNav />
      </div>
    </div>
  )
}
