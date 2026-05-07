import { useState, useMemo } from 'react'
import { useSheetData } from '../hooks/useSheetData'
import { QuartilePill, Spinner, MockBanner } from '../components/ui'
import { Q_COLORS } from '../components/ui'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ChevronDown, ChevronRight } from 'lucide-react'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-3 text-xs min-w-[140px]">
      <p className="font-bold text-slate-800 mb-2 font-display text-sm">{label}</p>
      {payload.map((p,i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-2 h-2 rounded-sm" style={{ background: p.fill }} />{p.name}
          </span>
          <span className="font-bold text-slate-800">{p.value}</span>
        </div>
      ))}
      <div className="border-t border-slate-100 mt-2 pt-2 flex justify-between">
        <span className="text-slate-400">รวม</span>
        <span className="font-bold text-slate-800">{payload.reduce((s,p) => s+p.value, 0)}</span>
      </div>
    </div>
  )
}

function YearSection({ year, pubs }) {
  const [open, setOpen] = useState(true)
  const q1 = pubs.filter(p => p.quartile==='Q1').length
  const citations = pubs.reduce((s,p) => s+p.citations, 0)

  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-extrabold text-slate-800 font-display">{year}</span>
          <div className="flex gap-2 text-xs">
            <span className="bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-semibold">
              {pubs.length} papers
            </span>
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
              {q1} Q1
            </span>
            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
              {citations.toLocaleString()} citations
            </span>
          </div>
        </div>
        {open ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-100">
          <table>
            <thead>
              <tr>
                <th style={{ width:'50%' }}>ชื่อบทความ</th>
                <th>ผู้แต่ง</th>
                <th>วารสาร</th>
                <th className="text-center">Quartile</th>
                <th className="text-center">Cited</th>
              </tr>
            </thead>
            <tbody>
              {pubs.sort((a,b) => b.citations-a.citations).map(pub => (
                <tr key={pub.id}>
                  <td>
                    <p className="text-sm font-medium text-slate-800 leading-snug line-clamp-2">{pub.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{pub.docType}</p>
                  </td>
                  <td><p className="text-xs text-slate-500 line-clamp-2">{pub.authors}</p></td>
                  <td><p className="text-xs text-slate-500 line-clamp-2">{pub.journal}</p></td>
                  <td className="text-center"><QuartilePill q={pub.quartile} isTop10={pub.isTop10} /></td>
                  <td className="text-center font-bold text-slate-700">{pub.citations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function ByYearPage() {
  const { publications, loading, usingMock } = useSheetData()

  const byYear = useMemo(() => {
    const map = {}
    publications.forEach(p => {
      if (!p.year) return
      if (!map[p.year]) map[p.year] = []
      map[p.year].push(p)
    })
    return Object.entries(map)
      .map(([year, pubs]) => ({ year: parseInt(year), pubs }))
      .sort((a, b) => b.year - a.year)
  }, [publications])

  const chartData = useMemo(() =>
    byYear.map(({ year, pubs }) => ({
      year,
      Q1: pubs.filter(p=>p.quartile==='Q1').length,
      Q2: pubs.filter(p=>p.quartile==='Q2').length,
      Q3: pubs.filter(p=>p.quartile==='Q3').length,
      Q4: pubs.filter(p=>p.quartile==='Q4').length,
    })).reverse()
  , [byYear])

  if (loading) return <Spinner />

  return (
    <div className="space-y-6 fade-up">
      {usingMock && <MockBanner />}

      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 font-display">งานวิจัยแยกรายปี</h1>
        <p className="text-slate-400 text-sm mt-0.5">ครอบคลุม {byYear.length} ปี · {publications.length} บทความ</p>
      </div>

      {/* Chart */}
      <div className="card p-5">
        <h3 className="font-bold text-slate-800 font-display mb-4">แนวโน้มผลงานวิจัยรายปี</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top:4, right:4, left:-20, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize:11, fill:'#94a3b8' }} />
            <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize:11 }} />
            {['Q1','Q2','Q3','Q4'].map(q => (
              <Bar key={q} dataKey={q} stackId="a" fill={Q_COLORS[q]}
                radius={q==='Q4'?[3,3,0,0]:[0,0,0,0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Year sections */}
      <div className="space-y-3">
        {byYear.map(({ year, pubs }) => (
          <YearSection key={year} year={year} pubs={pubs} />
        ))}
      </div>
    </div>
  )
}
