import { API_BASE_URL } from '../api'

export default function SlideCard({ slide, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#16161f',
        border: '1px solid #2d2d3d',
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.15s, transform 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#3b5bdb'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#2d2d3d'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Thumbnail */}
      <div style={{ aspectRatio: '16/9', background: '#0f0f13', overflow: 'hidden' }}>
        {slide.thumbnail_url ? (
          <img
            src={`${API_BASE_URL}${slide.thumbnail_url}`}
            alt={slide.titulo}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            loading="lazy"
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#334155', fontSize: 12,
          }}>
            Slide {slide.numero_slide}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>
          Slide {slide.numero_slide}
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 6, lineHeight: 1.3 }}>
          {slide.titulo || `Slide ${slide.numero_slide}`}
        </div>

        {slide.categoria_principal && (
          <div style={{
            fontSize: 11, color: '#3b82f6',
            background: '#1e2a3a', border: '1px solid #1d3a5f',
            borderRadius: 4, padding: '2px 8px',
            display: 'inline-block', marginBottom: 8,
          }}>
            {slide.categoria_principal}
          </div>
        )}

        {slide.tags?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {slide.tags.slice(0, 3).map(tag => (
              <span key={tag} style={{
                fontSize: 10, color: '#64748b',
                background: '#1a1a24', border: '1px solid #2d2d3d',
                borderRadius: 3, padding: '1px 6px',
              }}>
                {tag}
              </span>
            ))}
            {slide.tags.length > 3 && (
              <span style={{ fontSize: 10, color: '#475569' }}>+{slide.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
