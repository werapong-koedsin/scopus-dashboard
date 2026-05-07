import { useMemo } from 'react'
import { useSheetData } from '../hooks/useSheetData'
import { Spinner, MockBanner } from '../components/ui'
import { Q_COLORS } from '../components/ui'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell
} from 'recharts'

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-3 text-xs">
      {label && <p className="font-bold text-slate-700 mb-1.5 font-display">{label}</p>}
      {payload.map((p,i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-2 h-2 rounded-sm" style={{ background: p.fill||p.stroke }} />
            {p.name}
          </span>
          <span className="font-bold text-slate-800">{typeof p.value==='number'?p.value.toLocaleString():p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const { publications, authors, loading, usingMock } = useSheetData()

  const citationsPerYear = useMemo(() => {
    const map = {}
    publications.forEach(p => {
      if (!p.year) return
      map[p.year] = (map[p.year]||0) + p.citations
    })
    return Object.entries(map).map(([year,citations])=>({ year:parseInt(year), citations })).sort((a,b)=>a.year-b.year)
  }, [publications])

  const topJournals = useMemo(() => {
    const map = {}
    publications.forEach(p => {
      if (!p.journal) return
      if (!map[p.journal]) map[p.journal] = { journal:p.journal, count:0, q:p.quartile }
      map[p.journal].count++
    })
    return Object.values(map).sort((a,b)=>b.count-a.count).slice(0,12)
  }, [publications])

  const topCited = useMemo(() =>
    [...publications].sort((a,b)=>b.citations-a.citations).slice(0,10)
  , [publications])

  const docTypePie = useMemo(() => {
    const map = {}
    publications.forEach(p => { const t=p.docType||'Other'; map[t]=(map[t]||0)+1 })
    return Object.entries(map).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value)
  }, [publications])

  const PIE_COLORS = ['#0EA5E9','#059669','#D97706','#7C3AED','#DC2626','#0284C7']

  const authorCitationsBar = useMemo(() =>
    [...authors].sort((a,b)=>b.citations-a.citations).slice(0,10).map(a=>({
      name: a.nameEn?.split(' ').pop() || a.name.split(' ').pop(),
      fullName: a.name, citations: a.citations, hIndex: a.hIndex,
    }))
  , [authors])

  if (loading) return <Spinner />

  return (
    <div className="space-y-5 fade-up">
      {usingMock && <MockBanner />}

      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 font-display">สถิติ & กราฟ</h1>
        <p className="text-slate-400 text-sm mt-0.5">วิเคราะห์ผลงานวิจัยเชิงลึก</p>
      </div>

      {/* Citations over time */}
      <div className="card p-5">
        <h3 className="font-bold text-slate-800 font-display mb-4">Citations สะสมรายปี</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={citationsPerYear} margin={{ top:4, right:8, left:-16, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize:11, fill:'#94a3b8' }} />
            <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} />
            <Tooltip content={<Tip />} />
            <Line type="monotone" dataKey="citations" name="Citations"
              stroke="#0EA5E9" strokeWidth={2.5} dot={{ r:4, fill:'#0EA5E9', strokeWidth:0 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Author citations + Doc type */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-bold text-slate-800 font-display mb-4">Citations รายนักวิจัย (Top 10)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={authorCitationsBar} margin={{ top:4, right:4, left:-16, bottom:36 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize:10, fill:'#94a3b8' }} angle={-30} textAnchor="end" />
              <YAxis tick={{ fontSize:10, fill:'#94a3b8' }} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload
                return (
                  <div className="bg-white rounded-xl shadow border border-slate-100 p-3 text-xs">
                    <p className="font-bold text-slate-800 mb-1">{d.fullName}</p>
                    <p>Citations: <b>{d.citations.toLocaleString()}</b></p>
                    <p>H-index: <b>{d.hIndex}</b></p>
                  </div>
                )
              }} />
              <Bar dataKey="citations" fill="#0EA5E9" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-bold text-slate-800 font-display mb-4">ประเภทบทความ</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={docTypePie} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={65} innerRadius={35} paddingAngle={2}>
                {docTypePie.map((e,i) => <Cell key={e.name} fill={PIE_COLORS[i%PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v,n) => [v + ' papers', n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {docTypePie.map((d,i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PIE_COLORS[i%PIE_COLORS.length] }} />
                  <span className="text-slate-600">{d.name}</span>
                </span>
                <span className="font-bold text-slate-700">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top journals */}
      <div className="card p-5">
        <h3 className="font-bold text-slate-800 font-display mb-4">วารสารที่ตีพิมพ์บ่อยที่สุด (Top 12)</h3>
        <div className="space-y-2">
          {topJournals.map((j, i) => {
            const pct = Math.round(j.count / topJournals[0].count * 100)
            const qColor = Q_COLORS[j.q] || Q_COLORS.Unknown
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-slate-300 w-4 text-right shrink-0 font-display font-bold">#{i+1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-slate-700 truncate max-w-[65%]">{j.journal}</span>
                    <span className="text-xs font-bold text-slate-500 shrink-0 ml-2">{j.count} papers</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width:`${pct}%`, background:qColor }} />
                  </div>
                </div>
                <span className="text-xs font-bold shrink-0 px-1.5 py-0.5 rounded"
                  style={{ background:qColor+'22', color:qColor }}>{j.q}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top cited */}
      <div className="card p-5">
        <h3 className="font-bold text-slate-800 font-display mb-4">บทความที่ถูกอ้างอิงมากที่สุด (Top 10)</h3>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th className="text-center w-8">#</th>
                <th style={{ width:'50%' }}>ชื่อบทความ</th>
                <th>ผู้แต่ง</th>
                <th className="text-center">ปี</th>
                <th className="text-center">Q</th>
                <th className="text-center">Cited</th>
              </tr>
            </thead>
            <tbody>
              {topCited.map((pub, i) => (
                <tr key={pub.id}>
                  <td className="text-center font-extrabold text-slate-300 font-display">{i+1}</td>
                  <td><p className="text-xs font-medium text-slate-800 leading-snug line-clamp-2">{pub.title}</p></td>
                  <td><p className="text-xs text-slate-400 line-clamp-1">{pub.authors}</p></td>
                  <td className="text-center text-xs font-bold text-slate-600 font-display">{pub.year}</td>
                  <td className="text-center"><span className="text-xs font-bold" style={{ color:Q_COLORS[pub.quartile] }}>{pub.quartile}</span></td>
                  <td className="text-center">
                    <span className="font-extrabold text-slate-800 font-display text-sm">{pub.citations}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
