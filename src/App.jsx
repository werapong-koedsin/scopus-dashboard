import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import AllPublications from './pages/AllPublications'
import ByYear from './pages/ByYear'
import ByAuthor from './pages/ByAuthor'
import Analytics from './pages/Analytics'

export default function App() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 min-w-0 p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <Routes>
            <Route index          element={<Dashboard />} />
            <Route path="all"     element={<AllPublications />} />
            <Route path="by-year" element={<ByYear />} />
            <Route path="by-author" element={<ByAuthor />} />
            <Route path="analytics" element={<Analytics />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
