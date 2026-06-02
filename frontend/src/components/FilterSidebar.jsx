const DEAL_TYPES = ['sell-side', 'buy-side', 'IPO', 'debt advisory', 'fairness opinion', 'restructuring']
const DENSIDADES = ['low', 'medium', 'high']

export default function FilterSidebar({ filters, onChange, categories }) {
  const set = (key, value) => onChange({ ...filters, [key]: value === filters[key] ? '' : value })

  return (
    <aside style={{
      width: 220,
      flexShrink: 0,
      background: '#13131a',
      border: '1px solid #2d2d3d',
      borderRadius: 12,
      padding: 20,
      height: 'fit-content',
      position: 'sticky',
      top: 24,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 20, textTransform: 'uppercase', letterSpacing: 1 }}>
        Filtros
      </div>

      <Section label="Tipo de Deal">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {DEAL_TYPES.map(d => (
            <FilterChip
              key={d}
              label={d}
              active={filters.tipo_deal === d}
              onClick={() => set('tipo_deal', d)}
            />
          ))}
        </div>
      </Section>

      <Section label="Densidade">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {DENSIDADES.map(d => (
            <FilterChip
              key={d}
              label={{ low: 'Baixa', medium: 'Média', high: 'Alta' }[d]}
              active={filters.densidade === d}
              onClick={() => set('densidade', d)}
            />
          ))}
        </div>
      </Section>

      {categories.length > 0 && (
        <Section label="Categoria">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflow: 'auto' }}>
            {categories.map(c => (
              <FilterChip
                key={c}
                label={c.split('/')[0].trim()}
                active={filters.categoria === c}
                onClick={() => set('categoria', c)}
              />
            ))}
          </div>
        </Section>
      )}

      {Object.values(filters).some(Boolean) && (
        <button
          onClick={() => onChange({ categoria: '', tipo_deal: '', densidade: '' })}
          style={{
            width: '100%', padding: '8px', borderRadius: 8, fontSize: 12,
            background: 'none', border: '1px solid #2d2d3d', color: '#64748b',
            marginTop: 8,
          }}
        >
          Limpar filtros
        </button>
      )}
    </aside>
  )
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left', padding: '5px 10px', borderRadius: 6, fontSize: 12,
        background: active ? '#1e2a3a' : 'transparent',
        color: active ? '#60a5fa' : '#94a3b8',
        border: '1px solid',
        borderColor: active ? '#1d3a5f' : 'transparent',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}
