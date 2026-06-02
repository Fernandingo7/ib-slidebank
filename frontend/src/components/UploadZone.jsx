import { useRef, useState } from 'react'
import { uploadPptx, getPresentationStatus } from '../api'

const styles = {
  zone: active => ({
    border: `2px dashed ${active ? '#3b5bdb' : '#2d2d3d'}`,
    borderRadius: 16,
    padding: '48px 32px',
    textAlign: 'center',
    background: active ? 'rgba(59,91,219,0.06)' : '#13131a',
    transition: 'all 0.2s',
    cursor: 'pointer',
  }),
  progress: {
    height: 4,
    background: '#1e1e2e',
    borderRadius: 2,
    marginTop: 16,
    overflow: 'hidden',
  },
  bar: pct => ({
    height: '100%',
    width: `${pct}%`,
    background: '#3b5bdb',
    borderRadius: 2,
    transition: 'width 0.3s',
  }),
}

export default function UploadZone({ onComplete }) {
  const inputRef = useRef()
  const [dragging, setDragging] = useState(false)
  const [state, setState] = useState('idle') // idle | uploading | processing | done | error
  const [uploadPct, setUploadPct] = useState(0)
  const [progress, setProgress] = useState({ processed: 0, total: 0 })
  const [filename, setFilename] = useState('')

  const handleFile = async file => {
    if (!file?.name.match(/\.(pptx|pdf)$/i)) {
      alert('Apenas arquivos .pptx e .pdf são suportados.')
      return
    }
    setFilename(file.name)
    setState('uploading')
    setUploadPct(0)

    try {
      const { data } = await uploadPptx(file, setUploadPct)
      setState('processing')
      pollStatus(data.presentation_id)
    } catch {
      setState('error')
    }
  }

  const pollStatus = async id => {
    const interval = setInterval(async () => {
      try {
        const { data } = await getPresentationStatus(id)
        setProgress({ processed: data.processed_slides, total: data.total_slides })

        if (data.status === 'completed') {
          clearInterval(interval)
          setState('done')
          onComplete?.()
        } else if (data.status === 'error') {
          clearInterval(interval)
          setState('error')
        }
      } catch {
        clearInterval(interval)
        setState('error')
      }
    }, 2000)
  }

  const onDrop = e => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div>
      <div
        style={styles.zone(dragging)}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => state === 'idle' && inputRef.current.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pptx,.pdf"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />

        {state === 'idle' && (
          <>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
            <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>
              Faça upload de um arquivo .pptx
            </div>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              Arraste ou clique para selecionar — .pptx ou .pdf (pitchbooks, CIMs, teasers, management presentations)
            </div>
          </>
        )}

        {state === 'uploading' && (
          <>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>
              Enviando <strong style={{ color: '#e2e8f0' }}>{filename}</strong>...
            </div>
            <div style={styles.progress}>
              <div style={styles.bar(uploadPct)} />
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>{uploadPct}%</div>
          </>
        )}

        {state === 'processing' && (
          <>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>
              Analisando slides com Gemini Vision...
            </div>
            {progress.total > 0 && (
              <>
                <div style={styles.progress}>
                  <div style={styles.bar(Math.round((progress.processed / progress.total) * 100))} />
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                  {progress.processed} / {progress.total} slides processados
                </div>
              </>
            )}
          </>
        )}

        {state === 'done' && (
          <>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ fontWeight: 600, color: '#4ade80' }}>
              {progress.total} slides indexados com sucesso!
            </div>
            <button
              style={{ marginTop: 12, fontSize: 12, color: '#94a3b8', background: 'none', border: 'none' }}
              onClick={e => { e.stopPropagation(); setState('idle'); setFilename('') }}
            >
              Enviar outra apresentação
            </button>
          </>
        )}

        {state === 'error' && (
          <>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
            <div style={{ color: '#f87171', fontWeight: 600 }}>Erro ao processar o arquivo.</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              Verifique se o LibreOffice está instalado e a API key configurada.
            </div>
            <button
              style={{ marginTop: 12, fontSize: 12, color: '#94a3b8', background: 'none', border: 'none' }}
              onClick={e => { e.stopPropagation(); setState('idle') }}
            >
              Tentar novamente
            </button>
          </>
        )}
      </div>
    </div>
  )
}
