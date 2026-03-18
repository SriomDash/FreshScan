import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import s from './DashboardPage.module.css'

const COLORS = ['#FF0800','#FFE135','#2E8B57','#6F2DA8','#98FB98','#FF8243','#FFA500','#C0392B','#FC5A8D','#FF6347']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className={s.tooltip}>
      <div className={s.tooltipLabel}>{label}</div>
      {payload.map(p => (
        <div key={p.name} className={s.tooltipRow}>
          <span style={{ color: p.color }}>{p.name}</span>
          <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { vendor }               = useAuth()
  const [stats,   setStats]      = useState(null)
  const [loading, setLoading]    = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/api/scans/stats')
      setStats(res.data)
      setLastUpdated(new Date())
    } catch { /* handled */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchStats()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [fetchStats])

  if (loading) return (
    <div className={s.loading}><div className={s.spinner}/></div>
  )

  if (!stats) return (
    <div className={s.loading}><p style={{ color:'var(--text2)' }}>Could not load dashboard.</p></div>
  )

  // Format daily trend data
  const trendData = stats.dailyTrend.map(d => ({
    date:   new Date(d._id).toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' }),
    Fresh:  d.fresh,
    Rotten: d.rotten,
    Total:  d.count,
  }))
  // Format by-fruit data for bar chart
const fruitData = stats.byFruit.map(f => ({
  name:   f._id,
  Fresh:  f.fresh,
  Rotten: f.rotten,
}))

const pieData = stats.byFruit.map(f => ({
  name:  f._id,
  value: f.count,
}))

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div>
          <h2 className={s.title}>Dashboard</h2>
          <p className={s.sub}>
            {vendor?.vendorId} · Last updated {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
          </p>
        </div>
        <button className={s.refreshBtn} onClick={fetchStats}>↻ Refresh</button>
      </div>

      {/* KPI Cards */}
      <div className={s.kpiGrid}>
        <div className={`${s.kpi} ${s.kpiGreen}`}>
          <div className={s.kpiLabel}>Total scans</div>
          <div className={s.kpiValue}>{stats.total}</div>
          <div className={s.kpiSub}>All time</div>
        </div>
        <div className={`${s.kpi} ${s.kpiGreen}`}>
          <div className={s.kpiLabel}>Fresh</div>
          <div className={s.kpiValue}>{stats.fresh}</div>
          <div className={s.kpiSub} style={{ color:'var(--green)' }}>✓ Good produce</div>
        </div>
        <div className={`${s.kpi} ${s.kpiRed}`}>
          <div className={s.kpiLabel}>Rotten</div>
          <div className={s.kpiValue}>{stats.rotten}</div>
          <div className={s.kpiSub} style={{ color:'var(--red)' }}>✕ Poor quality</div>
        </div>
        <div className={`${s.kpi} ${s.kpiAmber}`}>
          <div className={s.kpiLabel}>Fresh rate</div>
          <div className={s.kpiValue}>{stats.freshRate}%</div>
          <div className={s.kpiSub}>Of all scanned produce</div>
        </div>
      </div>

      {/* Charts row */}
      <div className={s.chartGrid}>

      {/* Bar chart — by fruit */}
        <div className={s.chartCard}>
          <div className={s.chartTitle}>By fruit (fresh vs rotten)</div>
          {fruitData.length === 0 ? (
            <div className={s.chartEmpty}>No data for this period.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={fruitData} barGap={2} barCategoryGap="30%">
                <XAxis dataKey="name" tick={{ fill:'#8aab8a', fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'#8aab8a', fontSize:11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill:'rgba(74,200,100,0.05)' }} />
                <Bar dataKey="Fresh"  fill="#4ac864" radius={[4,4,0,0]} />
                <Bar dataKey="Rotten" fill="#e05a5a" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart — by fruit */}
        <div className={s.chartCard}>
          <div className={s.chartTitle}>By produce type</div>
          {pieData.length === 0 ? (
            <div className={s.chartEmpty}>No data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background:'var(--surface2)', border:'0.5px solid var(--border2)', borderRadius:8, fontSize:12 }}
                  itemStyle={{ color:'var(--text)' }}
                />
                <Legend
                  iconType="circle" iconSize={8}
                  formatter={v => <span style={{ color:'var(--text2)', fontSize:12 }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
          {/* Rotten alert table */}
      <div className={s.recentWrap}>
        <div className={s.recentHeader}>
          <div className={s.chartTitle}>⚠ Dispatch urgently — most rotten</div>
        </div>
        {stats.byFruit.length === 0 ? (
          <div className={s.chartEmpty} style={{ padding:'1.5rem' }}>No data yet.</div>
        ) : (
          <table className={s.miniTable}>
            <thead>
              <tr>
                <th>Fruit</th>
                <th>Rotten count</th>
                <th>Fresh count</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[...stats.byFruit]
                .sort((a, b) => b.rotten - a.rotten)
                .map(f => {
                  const total     = f.fresh + f.rotten
                  const rottenPct = total > 0 ? Math.round((f.rotten / total) * 100) : 0
                 const freshPct  = total > 0 ? Math.round((f.fresh / total) * 100) : 0
                  const risk      = freshPct >= 85 ? 'low' : freshPct >= 60 ? 'medium' : 'high'
                  return (
                    <tr key={f._id}>
                      <td><strong>{f._id}</strong></td>
                      <td style={{ color:'var(--red)' }}><strong>{f.rotten}</strong></td>
                      <td style={{ color:'var(--green)' }}>{f.fresh}</td>
                      <td>
                        <span className={`${s.pill} ${risk === 'high' ? s.pillRotten : risk === 'medium' ? s.pillAmber : s.pillFresh}`}>
                          {risk === 'high' ? '🔴 High risk' : risk === 'medium' ? '🟡 Medium risk' : '🟢 Low risk'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        )}
      </div>
      

    </div>
  )
}

