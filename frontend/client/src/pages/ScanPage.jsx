import { useState, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import s from './ScanPage.module.css'

export default function ScanPage() {
  const { vendor }               = useAuth()
  const videoRef                 = useRef(null)
  const canvasRef                = useRef(null)
  const streamRef                = useRef(null)
  const [preview, setPreview]    = useState(null)   // object URL
  const [blob, setBlob]          = useState(null)   // File | Blob
  const [cameraOn, setCameraOn]  = useState(false)
  const [status, setStatus]      = useState('idle') // idle | scanning | done | error
  const [result, setResult]      = useState(null)
  const [errMsg, setErrMsg]      = useState('')
  const fileRef                  = useRef(null)

  /* ── Camera ─────────────────────────────────────── */
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, audio: false
      })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      setCameraOn(true)
      setPreview(null); setBlob(null); setResult(null); setStatus('idle')
    } catch {
      setErrMsg('Camera access denied or unavailable.')
      setStatus('error')
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraOn(false)
  }, [])

  const snapPhoto = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(b => {
      setBlob(b)
      setPreview(URL.createObjectURL(b))
      stopCamera()
      setStatus('idle')
    }, 'image/jpeg', 0.92)
  }, [stopCamera])

  /* ── File upload ─────────────────────────────────── */
  const handleFile = e => {
    const file = e.target.files[0]
    if (!file) return
    stopCamera()
    setBlob(file)
    setPreview(URL.createObjectURL(file))
    setResult(null); setStatus('idle')
  }

  /* ── Analyze ─────────────────────────────────────── */
  const analyze = async () => {
    if (!blob) return
    setStatus('scanning'); setErrMsg(''); setResult(null)

    const form = new FormData()
    form.append('file', blob, blob.name || 'scan.jpg')

    try {
      const res = await api.post('/api/scans/predict', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResult(res.data.scan)
      setStatus('done')
    } catch (err) {
      const msg = err.response?.data?.message || 'Analysis failed. Please try again.'
      setErrMsg(msg); setStatus('error')
    }
  }

  const reset = () => {
    setPreview(null); setBlob(null); setResult(null)
    setStatus('idle'); setErrMsg('')
    stopCamera()
  }

  const isFresh = result?.isFresh

  return (
    <div className={s.page}>
      <div className={s.grid}>

        {/* ── Left: capture panel ── */}
        <div className={s.panel}>
          <div className={s.panelTitle}><span className={s.dot}/> Capture Image</div>

          <div className={s.viewport}>
            {/* Camera video */}
            <video
              ref={videoRef}
              autoPlay playsInline
              className={s.video}
              style={{ display: cameraOn ? 'block' : 'none' }}
            />
            {/* Snapshot / upload preview */}
            {preview && !cameraOn && (
              <img src={preview} alt="preview" className={s.previewImg} />
            )}
            {/* Placeholder */}
            {!cameraOn && !preview && (
              <div className={s.placeholder}>
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                  <rect x="4" y="11" width="36" height="26" rx="5" stroke="#4ac864" strokeWidth="1.5"/>
                  <circle cx="22" cy="24" r="7" stroke="#4ac864" strokeWidth="1.5"/>
                  <path d="M17 11l2-4h6l2 4" stroke="#4ac864" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <p>No image selected</p>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} style={{ display:'none' }} />

          <div className={s.btnRow}>
            {!cameraOn ? (
              <button className={s.btn} onClick={startCamera}>📷 Camera</button>
            ) : (
              <>
                <button className={s.btn} onClick={snapPhoto}>⚡ Snap</button>
                <button className={s.btn} onClick={stopCamera}>⏹ Stop</button>
              </>
            )}
            <button className={s.btn} onClick={() => fileRef.current.click()}>📁 Upload</button>
            {(preview || blob) && (
              <button className={s.btnGhost} onClick={reset}>✕ Clear</button>
            )}
          </div>

          <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFile} />

          <button
            className={s.analyzeBtn}
            disabled={!blob || status === 'scanning'}
            onClick={analyze}
          >
            {status === 'scanning' ? 'Analyzing…' : '🔬 Analyze Freshness'}
          </button>
        </div>

        {/* ── Right: result panel ── */}
        <div className={s.panel}>
          <div className={s.panelTitle}><span className={s.dot}/> Detection Result</div>

          {/* Idle */}
          {status === 'idle' && (
            <div className={s.empty}>
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                <circle cx="26" cy="26" r="20" stroke="#4ac864" strokeWidth="1.5"/>
                <path d="M26 18v8M26 32v2" stroke="#4ac864" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <p>Capture or upload an image<br/>and click Analyze to see results.</p>
            </div>
          )}

          {/* Scanning */}
          {status === 'scanning' && (
            <div className={s.scanning}>
              <div className={s.spinner} />
              <p>Analyzing with AI model…</p>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className={s.errorBox}>
              <div className={s.errorIcon}>⚠️</div>
              <p>{errMsg}</p>
              <button className={s.retryBtn} onClick={() => setStatus('idle')}>Try again</button>
            </div>
          )}

          {/* Result */}
          {status === 'done' && result && (
            <div className={s.result}>
              <div className={`${s.resultBanner} ${isFresh ? s.fresh : s.rotten}`}>
                <div className={s.resultIcon}>{isFresh ? '✅' : '⚠️'}</div>
                <div>
                  <div className={s.resultTag}>{isFresh ? 'Good to sell' : 'Not recommended'}</div>
                  <div className={s.resultName}>{result.fruit}</div>
                </div>
              </div>

              <div className={s.metaGrid}>
                <div className={s.metaCard}>
                  <div className={s.metaLabel}>Quality</div>
                  <div className={`${s.metaValue} ${isFresh ? s.green : s.red}`}>{result.quality}</div>
                </div>
                <div className={s.metaCard}>
                  <div className={s.metaLabel}>Produce</div>
                  <div className={s.metaValue}>{result.fruit}</div>
                </div>
                <div className={s.metaCard}>
                  <div className={s.metaLabel}>Vendor ID</div>
                  <div className={s.metaValueSm}>{vendor?.vendorId}</div>
                </div>
                <div className={s.metaCard}>
                  <div className={s.metaLabel}>Scanned at</div>
                  <div className={s.metaValueSm}>
                    {new Date(result.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              <div className={s.scanDate}>
                {new Date(result.createdAt).toLocaleDateString(undefined, { dateStyle:'long' })}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
