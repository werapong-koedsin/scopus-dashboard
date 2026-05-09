import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend
} from 'recharts'
import { useSheetData } from '../hooks/useSheetData'
import { StatCard, QuartilePill, Spinner, MockBanner } from '../components/ui'
import { Q_COLORS } from '../components/ui'
import { FACULTY_CONFIG } from '../config'
import { ArrowRight, RefreshCw } from 'lucide-react'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-3 text-xs">
      <p className="font-bold text-slate-700 mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-2 h-2 rounded-sm" style={{ background: p.fill }} />
            {p.name}
          </span>
          <span className="font-bold text-slate-800">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── format วันที่เป็นภาษาไทย ─────────────────────────────
function formatDateTH(date) {
  return date.toLocaleDateString('th-TH', {
    day:   'numeric',
    month: 'long',
    year:  'numeric',
  })
}

export default function DashboardPage() {
  const { publications, authors, loading, usingMock } = useSheetData()

  const today    = new Date()
  const endYear  = today.getFullYear()
  const startYear = FACULTY_CONFIG.startYear || 2020

  const stats = useMemo(() => {
    if (!publications.length) return null
    const q1            = publications.filter(p => p.quartile === 'Q1').length
    const top10         = publications.filter(p => p.isTop10).length
    const totalCitations = publications.reduce((s, p) => s + p.citations, 0)
    return { total: publications.length, q1, top10, totalCitations, authors: authors.length }
  }, [publications, authors])

  const byYear = useMemo(() => {
    const map = {}
    publications.forEach(p => {
      if (!p.year) return
      if (!map[p.year]) map[p.year] = { year: p.year, Q1:0, Q2:0, Q3:0, Q4:0, Unknown:0 }
      map[p.year][p.quartile || 'Unknown']++
    })
    return Object.values(map).sort((a, b) => a.year - b.year)
  }, [publications])

  const byQuartile = useMemo(() => {
    const map = {}
    publications.forEach(p => {
      const q = p.quartile || 'Unknown'
      map[q] = (map[q] || 0) + 1
    })
    return Object.entries(map)
      .map(([q, count]) => ({ q, count }))
      .sort((a, b) =>
        ['Q1','Q2','Q3','Q4','Unknown'].indexOf(a.q) -
        ['Q1','Q2','Q3','Q4','Unknown'].indexOf(b.q)
      )
  }, [publications])

  const recentPubs = useMemo(() =>
    [...publications]
      .sort((a, b) => b.year - a.year || b.citations - a.citations)
      .slice(0, 5)
  , [publications])

  const topAuthors = useMemo(() =>
    [...authors].sort((a, b) => b.citations - a.citations).slice(0, 4)
  , [authors])

  if (loading) return <Spinner />

  return (
    <div className="space-y-6 fade-up">
      {usingMock && <MockBanner />}

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900
                         font-display leading-tight">
            Research Overview
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            ข้อมูลผลงานวิจัยจากฐานข้อมูล Scopus
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="font-semibold text-slate-500">
              ปี {startYear}–{endYear}
            </span>
          </p>
        </div>

        {/* Updated date badge */}
        <div className="flex items-center gap-2 bg-white border border-slate-200
                        rounded-xl px-3 py-2 self-start shrink-0 shadow-sm">
          <RefreshCw size={12} className="text-green-500" />
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
              อัปเดตล่าสุด
            </span>
            <span className="text-xs font-bold text-slate-700">
              {formatDateTH(today)}
            </span>
          </div>
        </div>
      </div>

      {/* ── KPI cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 fade-up fade-up-1">
        <StatCard
          value={stats?.total ?? 0}
          label="งานวิจัยทั้งหมด"
          sub={`ปี ${startYear}–${endYear}`}
          color="#0EA5E9" />
        <StatCard
          value={stats?.q1 ?? 0}
          label="Q1 Papers"
          sub={`${stats?.total ? Math.round(stats.q1/stats.total*100) : 0}% ของทั้งหมด`}
          color="#059669" />
        <StatCard
          value={stats?.top10 ?? 0}
          label="Top 10% Journals"
          color="#7C3AED" />
        <StatCard
          value={(stats?.totalCitations ?? 0).toLocaleString()}
          label="Total Citations"
          color="#D97706" />
        <StatCard
          value={stats?.authors ?? 0}
          label="นักวิจัย"
          color="#0284C7" />
      </div>

      {/* ── Charts ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 fade-up fade-up-2">

        {/* By year */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 font-display">งานวิจัยรายปี</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                ปี {startYear}–{endYear}
              </p>
            </div>
            <Link to="by-year"
              className="text-xs text-sky-500 hover:text-sky-700
                         flex items-center gap-1 font-semibold">
              ดูทั้งหมด <ArrowRight size={12} />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={byYear} margin={{ top:4, right:4, left:-20, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize:11, fill:'#94a3b8' }} />
              <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize:11 }} />
              {['Q1','Q2','Q3','Q4'].map(q => (
                <Bar key={q} dataKey={q} stackId="a" fill={Q_COLORS[q]}
                  radius={q==='Q4' ? [3,3,0,0] : [0,0,0,0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By quartile */}
        <div className="card p-5">
          <h3 className="font-bold text-slate-800 font-display mb-4">
            สัดส่วน Quartile
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={byQuartile} dataKey="count" nameKey="q"
                cx="50%" cy="50%" outerRadius={65} innerRadius={35} paddingAngle={2}>
                {byQuartile.map(e => <Cell key={e.q} fill={Q_COLORS[e.q]} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [v + ' papers', n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-3">
            {byQuartile.map(({ q, count }) => (
              <div key={q} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm"
                    style={{ background: Q_COLORS[q] }} />
                  <span className="text-slate-600 font-medium">{q}</span>
                </span>
                <span className="font-bold text-slate-700">
                  {count}
                  <span className="text-slate-400 font-normal ml-1">
                    ({stats?.total ? Math.round(count/stats.total*100) : 0}%)
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom row ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 fade-up fade-up-3">

        {/* Recent publications */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 font-display">งานวิจัยล่าสุด</h3>
            <Link to="all"
              className="text-xs text-sky-500 hover:text-sky-700
                         flex items-center gap-1 font-semibold">
              ดูทั้งหมด <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {recentPubs.map(pub => (
              <div key={pub.id}
                className="flex gap-3 items-start pb-3 border-b border-slate-50
                           last:border-0 last:pb-0">
                <span className="text-xl font-extrabold text-slate-100 font-display
                                 leading-none mt-0.5 w-10 shrink-0 text-right">
                  {pub.year}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800
                                leading-snug line-clamp-2">
                    {pub.title}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {pub.authors}
                  </p>
                  <div className="mt-1.5">
                    <QuartilePill q={pub.quartile} isTop10={pub.isTop10} />
                  </div>
                </div>
                <span className="shrink-0 text-xs font-bold text-slate-500
                                 bg-slate-100 px-1.5 py-0.5 rounded-lg">
                  ⌟{pub.citations}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top authors */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 font-display">นักวิจัย</h3>
            <Link to="by-author"
              className="text-xs text-sky-500 hover:text-sky-700
                         flex items-center gap-1 font-semibold">
              ดูทั้งหมด <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {topAuthors.map((a, i) => {
              const pubs = publications.filter(p => p.authorIds.includes(a.id))
              const q1   = pubs.filter(p => p.quartile === 'Q1').length
              return (
                <div key={a.id} className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-sky-100 text-sky-700
                                   text-xs font-extrabold flex items-center
                                   justify-center shrink-0 font-display">
                    {i+1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {a.nameEn || a.name}
                    </p>
                    <p className="text-xs text-slate-400">{a.position}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-extrabold text-slate-700 font-display">
                      {(a.citations || 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {pubs.length} papers · {q1} Q1
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Footer note ────────────────────────────────────── */}
      <p className="text-center text-[11px] text-slate-300 pb-2">
        ข้อมูลจาก Scopus · ปี {startYear}–{endYear} ·
        อัปเดต {formatDateTH(today)}
      </p>
    </div>
  )
}
