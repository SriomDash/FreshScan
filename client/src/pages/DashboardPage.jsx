import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid
} from 'recharts'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import s from './DashboardPage.module.css'

const COLORS = ['#FF0800','#FFE135','#2E8B57','#6F2DA8','#98FB98','#FF8243','#FFA500','#C0392B','#FC5A8D','#FF6347']
const RANGE_OPTIONS = [
  { label: 'Today', value: 'today' },
  { label: '3 Days', value: '3d' },
  { label: '7 Days', value: '7d' },
  { label: '15 Days', value: '15d' },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className={s.tooltip}>
      <div className={s.tooltipLabel}>{label}</div>
      {payload.map((p, idx) => (
        <div key={`${p.name}-${idx}`} className={s.tooltipRow}>
          <span style={{ color: p.color || 'var(--text2)' }}>{p.name}</span>
          <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { vendor } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  const [range, setRange] = useState('7d')
  const [selectedFruits, setSelectedFruits] = useState([])

  const fetchStats = useCallback(async (selectedRange = range) => {
    try {
      setLoading(true)
      const res = await api.get(`/api/scans/stats?range=${selectedRange}`)
      setStats(res.data)
      setLastUpdated(new Date())
    } catch {
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    fetchStats(range)
  }, [fetchStats, range])

  useEffect(() => {
    const interval = setInterval(() => fetchStats(range), 30000)
    return () => clearInterval(interval)
  }, [fetchStats, range])

  const fruitOptions = useMemo(() => {
    if (!stats?.byFruit?.length) return []
    return stats.byFruit.map(f => f._id)
  }, [stats])

  useEffect(() => {
    if (!fruitOptions.length) {
      setSelectedFruits([])
      return
    }
    setSelectedFruits(prev => {
      const valid = prev.filter(f => fruitOptions.includes(f))
      return valid.length ? valid : fruitOptions.slice(0, Math.min(5, fruitOptions.length))
    })
  }, [fruitOptions])

  if (loading) {
    return (
      <div className={s.loading}>
        <div className={s.spinner} />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className={s.loading}>
        <p style={{ color: 'var(--text2)' }}>Could not load dashboard.</p>
      </div>
    )
  }

  const trendData = stats.dailyTrend.map(d => ({
    date: new Date(d._id).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
    Fresh: d.fresh,
    Rotten: d.rotten,
    Total: d.count,
  }))

  const fruitData = stats.byFruit.map(f => ({
    name: f._id,
    Fresh: f.fresh,
    Rotten: f.rotten,
    Total: f.count,
  }))

  const pieData = stats.byFruit.map(f => ({
    name: f._id,
    value: f.count,
  }))

  const rottenTrendData = (() => {
    const groupedByDate = {}

    for (const row of stats.rottenTrend || []) {
      if (selectedFruits.length && !selectedFruits.includes(row.fruit)) continue
      if (!groupedByDate[row.date]) groupedByDate[row.date] = { date: row.date }
      groupedByDate[row.date][row.fruit] = row.rottenRate
    }

    return Object.values(groupedByDate).map(item => ({
      ...item,
      dateLabel: new Date(item.date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
    }))
  })()

  const handleFruitToggle = (fruit) => {
    setSelectedFruits(prev =>
      prev.includes(fruit)
        ? prev.filter(f => f !== fruit)
        : [...prev, fruit]
    )
  }

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div>
          <h2 className={s.title}>Dashboard</h2>
          <p className={s.sub}>
            {vendor?.name} · Last updated {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
          </p>
        </div>

        <div className={s.headerActions}>
          <div className={s.rangeTabs}>
            {RANGE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`${s.rangeBtn} ${range === opt.value ? s.rangeBtnActive : ''}`}
                onClick={() => setRange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button className={s.refreshBtn} onClick={() => fetchStats(range)}>↻ Refresh</button>
        </div>
      </div>

      <div className={s.kpiGrid}>
        <div className={`${s.kpi} ${s.kpiGreen}`}>
          <div className={s.kpiLabel}>Total scans</div>
          <div className={s.kpiValue}>{stats.total}</div>
          <div className={s.kpiSub}>Selected range</div>
        </div>

        <div className={`${s.kpi} ${s.kpiGreen}`}>
          <div className={s.kpiLabel}>Fresh</div>
          <div className={s.kpiValue}>{stats.fresh}</div>
          <div className={s.kpiSub} style={{ color: 'var(--green)' }}>✓ Good produce</div>
        </div>

        <div className={`${s.kpi} ${s.kpiRed}`}>
          <div className={s.kpiLabel}>Rotten</div>
          <div className={s.kpiValue}>{stats.rotten}</div>
          <div className={s.kpiSub} style={{ color: 'var(--red)' }}>✕ Poor quality</div>
        </div>

        <div className={`${s.kpi} ${s.kpiAmber}`}>
          <div className={s.kpiLabel}>Rotten rate</div>
          <div className={s.kpiValue}>{stats.rottenRate}%</div>
          <div className={s.kpiSub}>Of scanned produce</div>
        </div>
      </div>

      <div className={s.chartGrid}>
        <div className={s.chartCard}>
          <div className={s.chartTitle}>By fruit (fresh vs rotten)</div>
          {fruitData.length === 0 ? (
            <div className={s.chartEmpty}>No data for this period.</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={fruitData} barGap={2} barCategoryGap="30%">
                <XAxis dataKey="name" tick={{ fill: '#8aab8a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8aab8a', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(74,200,100,0.05)' }} />
                <Bar dataKey="Fresh" fill="#4ac864" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Rotten" fill="#e05a5a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className={s.chartCard}>
          <div className={s.chartTitle}>By produce type</div>
          {pieData.length === 0 ? (
            <div className={s.chartEmpty}>No data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface2)',
                    border: '0.5px solid var(--border2)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  itemStyle={{ color: 'var(--text)' }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={v => <span style={{ color: 'var(--text2)', fontSize: 12 }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className={s.lineCard}>
        <div className={s.lineHeader}>
          <div>
            <div className={s.chartTitle}>Fruit-wise rotten % over time</div>
            <div className={s.lineSub}>X-axis = date, Y-axis = rotten percentage</div>
          </div>

          <div className={s.fruitToggleWrap}>
            {fruitOptions.map((fruit, idx) => (
              <button
                key={fruit}
                className={`${s.fruitToggle} ${selectedFruits.includes(fruit) ? s.fruitToggleActive : ''}`}
                onClick={() => handleFruitToggle(fruit)}
                style={{
                  borderColor: selectedFruits.includes(fruit) ? COLORS[idx % COLORS.length] : undefined,
                }}
              >
                <span
                  className={s.fruitDot}
                  style={{ background: COLORS[idx % COLORS.length] }}
                />
                {fruit}
              </button>
            ))}
          </div>
        </div>

        {rottenTrendData.length === 0 ? (
          <div className={s.chartEmpty}>No trend data for selected fruits.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={rottenTrendData}>
              <CartesianGrid stroke="rgba(138,171,138,0.08)" vertical={false} />
              <XAxis
                dataKey="dateLabel"
                tick={{ fill: '#8aab8a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: '#8aab8a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                unit="%"
              />
              <Tooltip content={<CustomTooltip />} />
              {selectedFruits.map((fruit) => {
                const color = COLORS[fruitOptions.indexOf(fruit) % COLORS.length]
                return (
                  <Line
                    key={fruit}
                    type="monotone"
                    dataKey={fruit}
                    stroke={color}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                )
              })}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className={s.recentWrap}>
        <div className={s.recentHeader}>
          <div className={s.chartTitle}>⚠ Dispatch urgently — most rotten</div>
        </div>

        {stats.byFruit.length === 0 ? (
          <div className={s.chartEmpty} style={{ padding: '1.5rem' }}>No data yet.</div>
        ) : (
          <table className={s.miniTable}>
            <thead>
              <tr>
                <th>Fruit</th>
                <th>Rotten count</th>
                <th>Fresh count</th>
                <th>Rotten %</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[...stats.byFruit]
                .sort((a, b) => b.rotten - a.rotten || b.count - a.count)
                .map(f => {
                  const total = f.fresh + f.rotten
                  const rottenPct = total > 0 ? Math.round((f.rotten / total) * 100) : 0
                  const risk =
                    rottenPct >= 40 ? 'high' :
                    rottenPct >= 20 ? 'medium' :
                    'low'

                  return (
                    <tr key={f._id}>
                      <td><strong>{f._id}</strong></td>
                      <td style={{ color: 'var(--red)' }}><strong>{f.rotten}</strong></td>
                      <td style={{ color: 'var(--green)' }}>{f.fresh}</td>
                      <td>{rottenPct}%</td>
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