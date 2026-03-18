import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import s from './HistoryPage.module.css'

export default function HistoryPage() {
  const [scans,   setScans]   = useState([])
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)
  const [total,   setTotal]   = useState(0)
  const [pages,   setPages]   = useState(1)
  const LIMIT = 15

  const fetchScans = useCallback(async (p=1) => {
    setLoading(true)
    try {
      const res = await api.get(`/api/scans?page=${p}&limit=${LIMIT}`)
      setScans(res.data.scans); setTotal(res.data.total); setPages(res.data.pages); setPage(p)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(()=>{ fetchScans(1) },[fetchScans])

  const deleteScan = async id => {
    if (!confirm('Delete this scan?')) return
    await api.delete(`/api/scans/${id}`)
    fetchScans(page)
  }

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div>
          <h2 className={s.title}>Scan History</h2>
          <p className={s.sub}>{total} total scan{total!==1?'s':''}</p>
        </div>
        <button className={s.refreshBtn} onClick={()=>fetchScans(page)}>↻ Refresh</button>
      </div>
      <div className={s.tableWrap}>
        {loading ? (
          <div className={s.loadingRow}><div className={s.spinner}/></div>
        ) : scans.length===0 ? (
          <div className={s.empty}>No scans yet. Head to the Scan page to get started.</div>
        ) : (
          <table className={s.table}>
            <thead>
              <tr>
                <th>#</th><th>Produce</th><th>Quality</th><th>Batch</th><th>Vendor ID</th><th>Scanned at</th><th></th>
              </tr>
            </thead>
            <tbody>
              {scans.map((sc,i)=>(
                <tr key={sc._id}>
                  <td className={s.num}>{(page-1)*LIMIT+i+1}</td>
                  <td className={s.fruit}>{sc.fruit}</td>
                  <td><span className={`${s.pill} ${sc.isFresh?s.pillFresh:s.pillRotten}`}>{sc.quality}</span></td>
                  <td className={s.batchCell}>#{sc.batchNumber} · {sc.batchDate}</td>
                  <td className={s.vendorCell}>{sc.vendorId}</td>
                  <td className={s.dateCell}>{new Date(sc.createdAt).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})}</td>
                  <td><button className={s.deleteBtn} onClick={()=>deleteScan(sc._id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {pages>1 && (
        <div className={s.pagination}>
          <button className={s.pageBtn} disabled={page<=1} onClick={()=>fetchScans(page-1)}>← Prev</button>
          <span className={s.pageInfo}>Page {page} of {pages}</span>
          <button className={s.pageBtn} disabled={page>=pages} onClick={()=>fetchScans(page+1)}>Next →</button>
        </div>
      )}
    </div>
  )
}
