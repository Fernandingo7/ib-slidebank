import { useEffect } from 'react'
import { API_BASE_URL } from '../api'

export default function SlideModal({ slide, onClose }) {
  useEffect(() => {
    const handler = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!slide) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#16161f', border: '1px solid #2d2d3d', borderRadius: 16,
          maxWidth: 900, width: '100%', maxHeight: '90vh', overflow: 'auto',
          padding: 32,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
              {slide.arquivo_origem} — Slide {slide.numero_slide}
            </div>
            <h2 style={{ color: '#e2e8f0', fontSize: 20, fontWeight: 700 }}>{slide.titulo}</h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 20, lineHeight: 1 }}
          >✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Thumbnail */}
          <div>
            {slide.thumbnail_url ? (
              <img
                src={`${API_BASE_URL}${slide.thumbnail_url}`}
                alt={slide.titulo}
                style={{ width: '100%', borderRadius: 8, border: '1px solid #2d2d3d' }}
              />
            ) : (
              <div style={{
                aspectRatio: '16/9', background: '#1a1a24', borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#334155', fontSize: 13,
              }}>
                Sem thumbnail
              </div>
            )}
          </div>

          {/* Metadata */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <MetaRow label="Categoria" value={slide.categoria_principal} />
            {slide.categorias_secundarias?.length > 0 && (
              <MetaRow label="Secundárias" value={slide.categorias_secundarias.join(' · ')} />
            )}
            <MetaRow label="Layout" value={slide.layout} />
            <MetaRow label="Densidade" value={slide.densidade} />
            <MetaRow label="Idioma" value={slide.idioma} />
            {slide.tipo_deal && <MetaRow label="Tipo de Deal" value={slide.tipo_deal} />}

          </div>
        </div>

        {/* Description */}
        {slide.descricao && (
          <div style={{ marginTop: 24, padding: 16, background: '#1a1a24', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Descrição</div>
            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{slide.descricao}</p>
          </div>
        )}

        {/* Elementos visuais */}
        {slide.elementos_visuais?.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Elementos Visuais</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {slide.elementos_visuais.map(el => (
                <span key={el} style={{ padding: '3px 10px', borderRadius: 4, fontSize: 12, background: '#1e2a3a', color: '#60a5fa', border: '1px solid #1d3a5f' }}>
                  {el}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {slide.tags?.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {slide.tags.map(tag => (
                <span key={tag} style={{ padding: '3px 10px', borderRadius: 4, fontSize: 12, background: '#1e1e2e', color: '#94a3b8', border: '1px solid #2d2d3d' }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MetaRow({ label, value }) {
  if (!value) return null
  return (
    <div>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#e2e8f0' }}>{value}</div>
    </div>
  )
}
