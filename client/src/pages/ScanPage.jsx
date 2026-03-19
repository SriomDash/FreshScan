import { useState, useRef, useCallback } from 'react'
// import { useAuth } from '../context/AuthContext' // Uncomment if used
import { Camera, Upload, Trash2, CameraIcon } from 'lucide-react' 
import api from '../api/axios'
import s from './ScanPage.module.css'

const fruitConfig = {
  Apple:       { icon: "🍎", color: "#FF0800" },
  Banana:      { icon: "🍌", color: "#FFE135" },
  Cucumber:    { icon: "🥒", color: "#2E8B57" },
  Grape:       { icon: "🍇", color: "#6F2DA8" },
  Guava:       { icon: "🍈", color: "#98FB98" },
  Mango:       { icon: "🥭", color: "#FF8243" },
  Orange:      { icon: "🍊", color: "#FFA500" },
  Pomegranate: { icon: "🍒", color: "#C0392B" },
  Strawberry:  { icon: "🍓", color: "#FC5A8D" },
  Tomato:      { icon: "🍅", color: "#FF6347" },
}

export default function ScanPage() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const fileRef = useRef(null)

  const [preview, setPreview] = useState(null)
  const [blob, setBlob] = useState(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [errMsg, setErrMsg] = useState('')

  /* Camera Logic */
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
      setErrMsg('Camera access denied.')
      setStatus('error')
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraOn(false)
  }, [])

  const snapPhoto = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(b => {
      setBlob(b)
      setPreview(URL.createObjectURL(b))
      stopCamera()
      setStatus('idle')
    }, 'image/jpeg', 0.92)
  }, [stopCamera])

  const handleFile = e => {
    const file = e.target.files[0]
    if (!file) return
    stopCamera()
    setBlob(file)
    setPreview(URL.createObjectURL(file))
    setResult(null); setStatus('idle')
  }

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
      setErrMsg(err.response?.data?.message || 'Analysis failed.')
      setStatus('error')
    }
  }

  const reset = () => {
    setPreview(null); setBlob(null); setResult(null)
    setStatus('idle'); setErrMsg('')
    stopCamera()
  }

  const isFresh = result?.isFresh
  const fruitData = fruitConfig[result?.fruit] || { icon: "🍏", color: "#06D6A0" }

  return (
    <div className={s.page}>
      <div className={s.grid}>

        {/* LEFT PANEL */}
        <div className={s.panel}>
          <div className={s.panelTitle}>Fruit Image</div>

          <div className={s.viewport}>
            <video
              ref={videoRef}
              autoPlay playsInline
              className={s.video}
              style={{ display: cameraOn ? 'block' : 'none' }}
            />
            {preview && !cameraOn && <img src={preview} alt="preview" className={s.previewImg} />}
            {!cameraOn && !preview && (
              <div className={s.placeholder}><p>No image selected</p></div>
            )}
          </div>

          <canvas ref={canvasRef} style={{ display:'none' }} />

          {/* Expanded Button Row */}
          <div className={s.btnRow}>
            {!cameraOn ? (
              <button className={s.iconBtnGreen} onClick={startCamera}>
                <Camera size={20} strokeWidth={2.5} /> Camera
              </button>
            ) : (
              <>
                <button className={s.iconBtnGreen} onClick={snapPhoto}>
                  <CameraIcon size={20} strokeWidth={2.5} /> Snap
                </button>
                <button className={s.iconBtnRed} onClick={stopCamera}>Cancel</button>
              </>
            )}

            <button className={s.iconBtnGreen} onClick={() => fileRef.current.click()}>
              <Upload size={20} strokeWidth={2.5} /> Upload
            </button>

            {(preview || blob) && (
              <button className={s.iconBtnRed} onClick={reset}>
                <Trash2 size={20} strokeWidth={2.5} /> Clear
              </button>
            )}
          </div>

          <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFile} />

          <button className={s.analyzeBtn} disabled={!blob || status === 'scanning'} onClick={analyze}>
            {status === 'scanning' ? 'Analyzing…' : 'Analyze Freshness'}
          </button>
        </div>

        {/* RIGHT PANEL */}
        <div className={s.panel}>
          <div className={`${s.panelTitle} ${s.centerText}`}>
            Detection Result
          </div>

          <div className={s.resultContainer}>
            {status === 'idle' && (
              <div className={s.emptyCenter}>
                <p>Upload an image and analyze to see results</p>
              </div>
            )}

            {status === 'scanning' && (
              <div className={s.scanningCenter}>
                <div className={s.spinner} />
                <p>Analyzing with AI…</p>
              </div>
            )}

            {status === 'error' && (
              <div className={s.errorBoxCenter}>
                <p>{errMsg}</p>
              </div>
            )}

            {status === 'done' && result && (
              <div className={s.result}>
                
                {/* Main Result Banner */}
                <div className={s.resultBanner}>
                  <div className={s.resultIcon} style={{ color: fruitData.color }}>{fruitData.icon}</div>
                  <div>
                    <div className={s.resultTag}>{isFresh ? 'GOOD TO SELL' : 'NOT RECOMMENDED'}</div>
                    <div className={s.resultName} style={{ color: fruitData.color }}>{result.fruit}</div>
                  </div>
                </div>

                {/* Grid for Cards */}
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
                    <div className={s.metaLabel}>Scanned at</div>
                    <div className={s.metaValueSm}>{new Date(result.createdAt).toLocaleTimeString()}</div>
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
    </div>
  )
}