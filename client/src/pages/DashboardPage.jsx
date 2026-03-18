import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import s from './DashboardPage.module.css'

/* ── Custom tooltip ─────────────────────── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className={s.tooltip}>
      <div className={s.tooltipLabel}>{label}</div>
      {payload.map(p => (
        <div key={p.name} className={s.tooltipRow}>
          <span style={{ color: p.fill }}>{p.name}</span>
          <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  )
}

/* ── KPI Card — matches screenshot style ── */
function KpiCard({ label, value, sub, badge, badgeClass, iconEmoji, iconClass, valueClass }) {
  return (
    <div className={s.kpi}>
      <div className={s.kpiHeader}>
        <div className={s.kpiLabel}>{label}</div>
        <div className={`${s.kpiIcon} ${iconClass}`}>{iconEmoji}</div>
      </div>
      <div className={`${s.kpiValue} ${valueClass||''}`}>{value}</div>
      <div className={s.kpiFooter}>
        <div className={s.kpiSub}>{sub}</div>
        {badge && <div className={`${s.kpiBadge} ${badgeClass}`}>{badge}</div>}
      </div>
    </div>
  )
}

/* ── Grouped bar chart (fresh + rotten per fruit) ── */
const PIE_COLORS = ['#ef4444','#f59e0b','#22c55e','#a855f7','#84cc16','#f97316','#3b82f6','#ec4899']

const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className={s.tooltip}>
      <div className={s.tooltipLabel}>{payload[0].name}</div>
      <div className={s.tooltipRow}><span style={{color:payload[0].payload.fill}}>Count</span><strong>{payload[0].value}</strong></div>
    </div>
  )
}

function FruitBarChart({ data }) {
  if (!data || data.length === 0) return <div className={s.chartEmpty}>No produce scanned yet for this day.</div>
  const chartData = data.map(d => ({ name: d._id, Fresh: d.fresh, Rotten: d.rotten }))
  return (
    <>
      <div className={s.legend}>
        <div className={s.legendItem}><span className={s.legendDot} style={{background:'#22c55e'}}/> Fresh</div>
        <div className={s.legendItem}><span className={s.legendDot} style={{background:'#ef4444'}}/> Rotten</div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} barGap={3} barCategoryGap="30%" margin={{left:0,right:8,top:4,bottom:0}}>
          <XAxis
            dataKey="name"
            tick={{ fill:'#a1a1aa', fontSize:12 }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tick={{ fill:'#a1a1aa', fontSize:11 }}
            axisLine={false} tickLine={false}
            allowDecimals={false}
            tickLine={false}
            gridLine={{ stroke:'rgba(255,255,255,0.05)', strokeDasharray:'3 3' }}
          />
          <Tooltip content={<CustomTooltip/>} cursor={{ fill:'rgba(255,255,255,0.03)' }}/>
          <Bar dataKey="Fresh"  fill="#22c55e" radius={[4,4,0,0]} maxBarSize={36}/>
          <Bar dataKey="Rotten" fill="#ef4444" radius={[4,4,0,0]} maxBarSize={36}/>
        </BarChart>
      </ResponsiveContainer>
    </>
  )
}

function ScanVolumePie({ data }) {
  if (!data || data.length === 0) return <div className={s.chartEmpty}>No data yet.</div>
  const chartData = data.map((d,i) => ({ name: d._id, value: d.total, fill: PIE_COLORS[i % PIE_COLORS.length] }))
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%" cy="45%"
          innerRadius={70} outerRadius={105}
          paddingAngle={3} dataKey="value"
          strokeWidth={0}
        >
          {chartData.map((d,i) => <Cell key={i} fill={d.fill} stroke="none"/>)}
        </Pie>
        <Tooltip content={<CustomPieTooltip/>}/>
        <Legend
          iconType="circle" iconSize={9}
          formatter={v => <span style={{color:'#a1a1aa',fontSize:12}}>{v}</span>}
          wrapperStyle={{paddingTop:'10px'}}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

/* ══════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════ */
export default function DashboardPage() {
  const { vendor }              = useAuth()
  const [detail,  setDetail]   = useState(null)
  const [loading, setLoading]  = useState(true)
  const [detLoading, setDetLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const today = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(today)

  const fetchDay = useCallback(async (date) => {
    setDetLoading(true)
    try {
      const res = await api.get(`/api/scans/stats/daywise?date=${date}`)
      setDetail(res.data)
      setLastUpdated(new Date())
    } catch {}
    finally { setDetLoading(false); setLoading(false) }
  }, [])

  useEffect(() => { fetchDay(selectedDate) }, [selectedDate])

  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(() => fetchDay(selectedDate), 30000)
    return () => clearInterval(t)
  }, [selectedDate, fetchDay])

  const changeDate = delta => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + delta)
    setSelectedDate(d.toISOString().split('T')[0])
  }
  const isToday = selectedDate === today

  if (loading) return <div className={s.loading}><div className={s.spinner}/></div>

  const d = detail || { total:0, fresh:0, rotten:0, freshRate:0, byFruit:[] }
  const freshPct = d.freshRate
  const rottenPct = d.total > 0 ? 100 - freshPct : 0

  return (
    <div className={s.page}>

      {/* ── Header ── */}
      <div className={s.header}>
        <div>
          <h2 className={s.title}>Overview</h2>
          <div className={s.sub}>
            <span>{vendor?.vendorId}</span>
            <span className={s.subDot}/>
            <span>Last updated {lastUpdated ? `Today at ${lastUpdated.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}` : '—'}</span>
          </div>
        </div>
        <div className={s.headerRight}>
          {/* Date navigator */}
          <div className={s.dateBar}>
            <button className={s.navBtn} onClick={() => changeDate(-1)}>←</button>
            <input
              type="date"
              className={s.dateInput}
              value={selectedDate}
              max={today}
              onChange={e => setSelectedDate(e.target.value)}
            />
            <button className={s.navBtn} disabled={isToday} onClick={() => changeDate(1)}>→</button>
          </div>
          {!isToday && <button className={s.todayBtn} onClick={() => setSelectedDate(today)}>Today</button>}
          <button className={s.refreshBtn} onClick={() => fetchDay(selectedDate)}>↻ Refresh</button>
        </div>
      </div>

      {detLoading ? (
        <div style={{display:'flex',justifyContent:'center',padding:'4rem'}}>
          <div className={s.spinner}/>
        </div>
      ) : (
        <>
          {/* ── KPI Cards ── */}
          <div className={s.kpiGrid}>
            <KpiCard
              label="TOTAL SCANS"
              value={d.total}
              sub="All time activity"
              badge={isToday && d.total > 0 ? `↗ ${d.total} today` : selectedDate}
              badgeClass={s.kpiBadgeGreen}
              iconEmoji="〰️"
              iconClass={s.kpiIconBlue}
            />
            <KpiCard
              label="FRESH PRODUCE"
              value={d.fresh}
              valueClass={s.kpiValueGreen}
              sub={d.fresh > 0 ? "Passable quality" : "No fresh items"}
              iconEmoji="🛡️"
              iconClass={s.kpiIconGreen}
            />
            <KpiCard
              label="ROTTEN ITEMS"
              value={d.rotten}
              valueClass={d.rotten > 0 ? s.kpiValueRed : ''}
              sub={d.rotten > 0 ? "Requires attention" : "None detected"}
              badge={d.rotten > 0 ? `↘ ${rottenPct}% of total` : null}
              badgeClass={s.kpiBadgeRed}
              iconEmoji="⚠️"
              iconClass={s.kpiIconRed}
            />
            <KpiCard
              label="FRESH RATE"
              value={`${freshPct}%`}
              sub="Of total volume"
              badge={freshPct >= 70 ? `↗ +${Math.max(0,freshPct-70)}% vs avg` : freshPct > 0 ? `↘ Below avg` : null}
              badgeClass={freshPct >= 70 ? s.kpiBadgeGreen : s.kpiBadgeRed}
              iconEmoji="↗"
              iconClass={s.kpiIconAmber}
            />
          </div>

          {/* No data warning */}
          {d.total === 0 && (
            <div style={{textAlign:'center',padding:'0.5rem 0 1.5rem',color:'var(--text3)',fontSize:'0.85rem'}}>
              No scans recorded for {selectedDate}. Try a different date.
            </div>
          )}

          {/* ── Charts ── */}
          <div className={s.chartRow}>
            {/* Bar chart */}
            <div className={s.chartCard}>
              <div className={s.chartHead}>
                <div className={s.chartTitle}>Quality by Category</div>
                <div className={s.chartSub}>Fresh vs Rotten distribution.</div>
              </div>
              <FruitBarChart data={d.byFruit}/>
            </div>

            {/* Pie chart */}
            <div className={s.chartCard}>
              <div className={s.chartHead}>
                <div className={s.chartTitle}>Scan Volume Breakdown</div>
                <div className={s.chartSub}>Total items processed by type.</div>
              </div>
              <ScanVolumePie data={d.byFruit}/>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
