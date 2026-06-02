import { useState } from 'react'
import { deletePresentation } from '../api'

const STATUS_COLOR = { completed: '#22c55e', processing: '#eab308', error: '#ef4444' }
const STATUS_LABEL = { completed: 'Pronto', processing: 'Processando...', error: 'Erro' }

export default function PresentationsPanel({ presentations, onSelect, selectedId, onDeleted }) {
  const [deleting, setDeleting] = useState(null)
  const [confirming, setConfirming] = useState(null)

  const handleDelete = async id => {
    setDeleting(id)
    try {
      await deletePresentation(id)
      onDeleted(id)
    } catch {
      alert('Erro ao apagar o material.')
    } finally {
      setDeleting(null)
      setConfirming(null)
    }
  }

  if (presentations.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#64748b', padding: '48px 0' }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>📁</div>
        Nenhum material indexado ainda.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* "Todos" option */}
      <FolderRow
        label="Todos os slides"
        subtitle={`${presentations.reduce((s, p) => s + (p.total_slides || 0), 0)} slides`}
        active={!selectedId}
        icon="🗂️"
        onClick={() => onSelect(null)}
      />

      <div style={{ borderTop: '1px solid #2d2d3d', margin: '4px 0' }} />

      {presentations.map(p => (
        <div key={p.id} style={{ position: 'relative' }}>
          <FolderRow
            label={p.empresa_alvo || p.filename.replace(/\.(pptx|pdf)$/i, '')}
            subtitle={[
              p.tipo_documento,
              p.setor,
              p.total_slides ? `${p.total_slides} slides` : null,
            ].filter(Boolean).join(' · ')}
            active={selectedId === p.id}
            icon={p.status === 'processing' ? '⏳' : p.status === 'error' ? '⚠️' : '📄'}
            status={p.status}
            onClick={() => p.status === 'completed' && onSelect(p.id)}
            onDelete={() => setConfirming(p.id)}
          />

          {confirming === p.id && (
            <div style={{
              position: 'absolute', right: 0, top: '100%', zIndex: 50,
              background: '#1e1e2e', border: '1px solid #2d2d3d', borderRadius: 8,
              padding: 12, width: 220, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
                Apagar este material e todos os seus slides?
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleDelete(p.id)}
                  disabled={deleting === p.id}
                  style={{
                    flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 12,
                    background: '#7f1d1d', color: '#fca5a5', border: '1px solid #991b1b',
                  }}
                >
                  {deleting === p.id ? 'Apagando...' : 'Apagar'}
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  style={{
                    flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 12,
                    background: 'none', color: '#64748b', border: '1px solid #2d2d3d',
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function FolderRow({ label, subtitle, active, icon, status, onClick, onDelete }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', borderRadius: 8, cursor: onClick ? 'pointer' : 'default',
        background: active ? '#1e2a3a' : hovered ? '#16161f' : 'transparent',
        border: '1px solid',
        borderColor: active ? '#1d3a5f' : 'transparent',
        transition: 'all 0.15s',
        userSelect: 'none',
      }}
    >
      <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 500,
          color: active ? '#60a5fa' : '#e2e8f0',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {label}
        </div>
        {subtitle && (
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {subtitle}
          </div>
        )}
      </div>
      {status && (
        <span style={{
          fontSize: 10, fontWeight: 600,
          color: STATUS_COLOR[status],
          flexShrink: 0,
        }}>
          {STATUS_LABEL[status]}
        </span>
      )}
      {onDelete && hovered && (
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          title="Apagar material"
          style={{
            background: 'none', border: 'none', color: '#475569',
            fontSize: 14, lineHeight: 1, padding: '2px 4px',
            borderRadius: 4, flexShrink: 0,
          }}
        >
          ✕
        </button>
      )}
    </div>
  )
}
