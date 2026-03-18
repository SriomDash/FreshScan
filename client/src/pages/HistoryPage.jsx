import { useState, useEffect, useCallback, useMemo } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import s from './HistoryPage.module.css'

const fruitConfig = {
  Apple:       { icon: "🍎" },
  Banana:      { icon: "🍌" },
  Cucumber:    { icon: "🥒" },
  Grape:       { icon: "🍇" },
  Guava:       { icon: "🍈" },
  Mango:       { icon: "🥭" },
  Orange:      { icon: "🍊" },
  Pomegranate: { icon: "🍒" },
  Strawberry:  { icon: "🍓" },
  Tomato:      { icon: "🍅" },
}

export default function HistoryPage() {
  const { vendor } = useAuth()

  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)

  const [preview, setPreview] = useState(null)
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 })

  const [selectedFruit, setSelectedFruit] = useState('All')
  const [qualityFilter, setQualityFilter] = useState('All')

  const LIMIT = 15

  const fetchScans = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await api.get(`/api/scans?page=${p}&limit=${LIMIT}`)
      setScans(res.data.scans)
      setTotal(res.data.total)
      setPages(res.data.pages)
      setPage(p)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchScans(1) }, [fetchScans])

  const deleteScan = async (id) => {
    if (!confirm('Delete this scan?')) return
    await api.delete(`/api/scans/${id}`)
    fetchScans(page)
  }

  // ✅ Toggle preview (click again closes it)
  const handlePreview = (e, sc) => {
    if (preview && preview._id === sc._id) {
      setPreview(null)
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()

    setPopupPos({
      top: rect.top + rect.height / 2,
      left: rect.right + 12,
    })

    setPreview(sc)
  }

  // ✅ FILTER LOGIC
  const filteredScans = useMemo(() => {
    return scans.filter(sc => {
      const fruitMatch = selectedFruit === 'All' || sc.fruit === selectedFruit
      const qualityMatch =
        qualityFilter === 'All' ||
        (qualityFilter === 'Fresh' && sc.isFresh) ||
        (qualityFilter === 'Rotten' && !sc.isFresh)

      return fruitMatch && qualityMatch
    })
  }, [scans, selectedFruit, qualityFilter])

  const fruits = ['All', ...new Set(scans.map(s => s.fruit))]

  return (
    <div className={s.page} onClick={() => setPreview(null)}>
      <div className={s.header}>
        <div>
          <h2 className={s.title}>Scan History</h2>
          <p className={s.sub}>{total} total scans</p>
        </div>
        <button className={s.refreshBtn} onClick={() => fetchScans(page)}>↻ Refresh</button>
      </div>

      {/* FILTERS */}
      <div className={s.filters}>
        <select
          value={selectedFruit}
          onChange={(e) => setSelectedFruit(e.target.value)}
          className={s.dropdown}
        >
          {fruits.map(f => (
            <option key={f}>{f}</option>
          ))}
        </select>

        <div className={s.toggleGroup}>
          {['All', 'Fresh', 'Rotten'].map(type => (
            <button
              key={type}
              className={`${s.toggleBtn} ${qualityFilter === type ? s.activeToggle : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                setQualityFilter(type)
              }}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className={s.tableWrap}>
        {loading ? (
          <div className={s.loadingRow}><div className={s.spinner}/></div>
        ) : filteredScans.length === 0 ? (
          <div className={s.empty}><p>No matching scans</p></div>
        ) : (
          <table className={s.table}>
            <tbody>
              {filteredScans.map((sc, i) => {
                const config = fruitConfig[sc.fruit] || { icon: "📦" }

                return (
                  <tr key={sc._id}>
                    <td>{i + 1}</td>

                    <td>
                      <span>{config.icon}</span> {sc.fruit}
                    </td>

                    <td>
                      <span className={`${s.pill} ${sc.isFresh ? s.pillFresh : s.pillRotten}`}>
                        {sc.quality}
                      </span>
                    </td>

                    <td>{new Date(sc.createdAt).toLocaleString()}</td>

                    <td>
                      <button
                        className={s.eyeBtn}
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePreview(e, sc)
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M1 12C3.5 7 7.5 4 12 4C16.5 4 20.5 7 23 12C20.5 17 16.5 20 12 20C7.5 20 3.5 17 1 12Z"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <circle cx="12" cy="12" r="3" fill="currentColor" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* POPUP */}
      {preview && (
        <div
          className={s.popup}
          style={{ top: popupPos.top, left: popupPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={s.popupWrapper}>
            
            <button className={s.closeBtn} onClick={() => setPreview(null)}>✕</button>

            {preview.imagePath && (
              <img
                src={preview.imagePath}
                className={s.popupImg}
                alt="scan"
              />
            )}

            <div className={s.popupInfo}>
              <strong>{preview.fruit}</strong>
              <span className={preview.isFresh ? s.freshText : s.rottenText}>
                {preview.quality}
              </span>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}