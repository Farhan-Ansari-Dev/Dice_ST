import { useEffect, useRef, useState } from 'react'
import { Download, FileText, AlertCircle, Loader } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
// Vite resolves this to a bundled asset URL for the PDF.js worker.
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { apiClient } from '../../services/apiClient'

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
type Kind = 'pdf' | 'image' | 'unsupported'
function kindOf(mime: string): Kind {
  const m = (mime || '').toLowerCase()
  if (m === 'application/pdf') return 'pdf'
  if (IMAGE_TYPES.includes(m)) return 'image'
  return 'unsupported'
}

const isAbort = (e: any) =>
  e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED' || e?.name === 'AbortError'

/**
 * Inline document preview — never leaves the dashboard.
 *   • PDF   → rendered with PDF.js into scrollable canvases
 *   • image → inline <img>
 *   • other → message + Download
 * Reuses GET /documents/:id/preview (audited as 'viewed'); no S3/API changes.
 *
 * Resource safety:
 *   - the /preview request is cancelled via AbortController on unmount / doc change
 *   - the PDF.js render task, document, and loading task are all torn down on cleanup
 */
export default function DocumentPreview({
  docId, versionNumber, mimeType, onDownload,
}: {
  docId: string
  versionNumber?: number
  mimeType: string
  onDownload: () => void
}) {
  const kind = kindOf(mimeType)
  const [url, setUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // 1) Fetch the presigned inline URL. Cancelled on unmount / doc change so a
  //    stale response can never resolve into a just-closed or switched drawer.
  useEffect(() => {
    if (kind === 'unsupported') { setUrl(null); setStatus('ready'); return }
    const controller = new AbortController()
    let active = true
    setUrl(null); setErrorMsg(''); setStatus('loading')
    ;(async () => {
      try {
        const q = versionNumber ? `?version=${versionNumber}` : ''
        const res = await apiClient.get(`/documents/${docId}/preview${q}`, { signal: controller.signal })
        if (active) setUrl(res.data.data.url)
      } catch (e: any) {
        if (!active || isAbort(e)) return
        setErrorMsg('Could not load the preview link.')
        setStatus('error')
      }
    })()
    return () => { active = false; controller.abort() }
  }, [docId, versionNumber, kind])

  // 2) Render the PDF once the URL is available. Full teardown on cleanup:
  //    cancel the in-flight render, destroy the document, destroy the loading task
  //    (the latter also aborts PDF.js's own byte fetch).
  useEffect(() => {
    if (kind !== 'pdf' || !url) return
    let active = true
    let loadingTask: any = null
    let pdfDoc: any = null
    let renderTask: any = null
    const container = containerRef.current
    if (container) container.innerHTML = ''
    setStatus('loading')
    ;(async () => {
      try {
        loadingTask = pdfjsLib.getDocument({ url })
        pdfDoc = await loadingTask.promise
        if (!active) return
        for (let n = 1; n <= pdfDoc.numPages; n++) {
          const page = await pdfDoc.getPage(n)
          if (!active) return
          const viewport = page.getViewport({ scale: 1.3 })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.style.cssText = 'width:100%;height:auto;margin-bottom:12px;border-radius:6px;box-shadow:0 1px 6px rgba(0,0,0,0.18)'
          const ctx = canvas.getContext('2d')
          if (!ctx) continue
          container?.appendChild(canvas)
          renderTask = page.render({ canvasContext: ctx, viewport })
          await renderTask.promise
          if (!active) return
        }
        if (active) setStatus('ready')
      } catch (e: any) {
        // RenderingCancelledException on teardown is expected — ignore it.
        if (!active || e?.name === 'RenderingCancelledException') return
        // Common production cause: S3 bucket CORS not allowing the admin origin.
        setErrorMsg('This PDF could not be displayed inline.')
        setStatus('error')
      }
    })()
    return () => {
      active = false
      try { renderTask?.cancel?.() } catch { /* noop */ }
      try { pdfDoc?.destroy?.() } catch { /* noop */ }
      try { loadingTask?.destroy?.() } catch { /* noop */ }
    }
  }, [kind, url])

  const fallback = (title: string, sub: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, height: '100%', color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>
      {status === 'error' ? <AlertCircle size={40} /> : <FileText size={40} />}
      <div>
        <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14 }}>{title}</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>{sub}</div>
      </div>
      <button onClick={onDownload} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent-purple, #6C63FF)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
        <Download size={14} /> Download
      </button>
    </div>
  )

  if (status === 'error') return fallback('Preview unavailable', errorMsg || 'You can still download the file.')
  if (kind === 'unsupported') return fallback('No inline preview', 'This file type can’t be previewed here.')

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--bg-body)', borderRadius: 8, padding: 12 }}>
      {status === 'loading' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: '100%', color: 'var(--text-muted)', fontSize: 13 }}>
          <Loader size={16} /> Loading preview…
        </div>
      )}
      {kind === 'pdf' && <div ref={containerRef} style={{ display: status === 'ready' ? 'block' : 'none' }} />}
      {kind === 'image' && url && (
        <div style={{ display: status === 'ready' ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <img
            src={url}
            alt="Document preview"
            onLoad={() => setStatus('ready')}
            onError={() => { setErrorMsg('The image could not be loaded.'); setStatus('error') }}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 6 }}
          />
        </div>
      )}
    </div>
  )
}
