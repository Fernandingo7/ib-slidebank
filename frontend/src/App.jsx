import { useEffect, useState, useCallback, useRef } from 'react'
import { listSlides, listCategories, getStats, listPresentations } from './api'
import UploadZone from './components/UploadZone'
import SlideCard from './components/SlideCard'
import SlideModal from './components/SlideModal'
import FilterSidebar from './components/FilterSidebar'
import PresentationsPanel from './components/PresentationsPanel'

const EMPTY_FILTERS = { categoria: '', tipo_deal: '', densidade: '' }

export default function App() {
  const [slides, setSlides] = useState([])
  const [categories, setCategories] = useState([])
  const [stats, setStats] = useState({})
  const [presentations, setPresentations] = useState([])
  const [selectedPresentationId, setSelectedPresentationId] = useState(null)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selectedSlide, setSelectedSlide] = useState(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('bank')
  const debounceRef = useRef(null)

  const fetchSlides = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        ...filters,
        search: search || undefined,
        presentation_id: selectedPresentationId || undefined,
      }
      Object.keys(params).forEach(k => !params[k] && delete params[k])
      const { data } = await listSlides(params)
      setSlides(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filters, search, selectedPresentationId])

  const fetchMeta = async () => {
    try {
      const [cats, st, presos] = await Promise.all([listCategories(), getStats(), listPresentations()])
      setCategories(cats.data)
      setStats(st.data)
      setPresentations(presos.data)
    } catch {}
  }

  const handleSearchChange = e => {
    const val = e.target.value
    setSearchInput(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setSearch(val), 350)
  }

  useEffect(() => { fetchSlides() }, [fetchSlides])
  useEffect(() => { fetchMeta() }, [])

  const onUploadComplete = () => {
    fetchMeta()
    fetchSlides()
    setTab('bank')
  }

  const onDeleted = id => {
    setPresentations(prev => prev.filter(p => p.id !== id))
    if (selectedPresentationId === id) setSelectedPresentationId(null)
    fetchSlides()
    fetchMeta()
  }

  const selectedPresentation = presentations.find(p => p.id === selectedPresentationId)

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f13' }}>
      <header style={{
        borderBottom: '1px solid #2d2d3d',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        height: 56,
        position: 'sticky',
        top: 0,
        background: '#0f0f13',
        zIndex: 100,
      }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0', letterSpacing: -0.3 }}>
          IB <span style={{ color: '#3b5bdb' }}>Slides</span>
        </div>

        <nav style={{ display: 'flex', gap: 4, flex: 1 }}>
          {[['bank', 'Slide Bank'], ['upload', 'Upload']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: tab === key ? '#1e1e2e' : 'none',
                color: tab === key ? '#e2e8f0' : '#64748b',
                border: tab === key ? '1px solid #2d2d3d' : '1px solid transparent',
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        <div style={{ display: 'flex', gap: 20, fontSize: 12, color: '#64748b' }}>
          <span><strong style={{ color: '#e2e8f0' }}>{stats.total_slides || 0}</strong> slides</span>
          <span><strong style={{ color: '#e2e8f0' }}>{stats.total_presentations || 0}</strong> materiais</span>
        </div>
      </header>

      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '32px 32px' }}>
        {tab === 'upload' && (
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>
              Upload de Material
            </h1>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>
              Envie um .pptx ou .pdf. O sistema analisa o objetivo global do documento e classifica cada slide individualmente com Gemini Vision.
            </p>
            <UploadZone onComplete={onUploadComplete} />
          </div>
        )}

        {tab === 'bank' && (
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            {/* Coluna esquerda: materiais + filtros */}
            <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                background: '#13131a', border: '1px solid #2d2d3d', borderRadius: 12, padding: 16,
                position: 'sticky', top: 80,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Materiais
                </div>
                <PresentationsPanel
                  presentations={presentations}
                  onSelect={setSelectedPresentationId}
                  selectedId={selectedPresentationId}
                  onDeleted={onDeleted}
                />
                <button
                  onClick={() => setTab('upload')}
                  style={{
                    marginTop: 12, width: '100%', padding: '7px 0', borderRadius: 8, fontSize: 12,
                    background: '#1e2a3a', color: '#60a5fa', border: '1px solid #1d3a5f',
                  }}
                >
                  + Novo upload
                </button>
              </div>

              <FilterSidebar filters={filters} onChange={setFilters} categories={categories} />
            </div>

            {/* Coluna principal: slides */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Barra de busca */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: '#475569', fontSize: 15, pointerEvents: 'none',
                  }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Buscar em título, descrição, categoria, tags, layout, tipo de deal..."
                    value={searchInput}
                    onChange={handleSearchChange}
                    style={{ width: '100%', fontSize: 14, padding: '10px 16px 10px 40px' }}
                  />
                  {searchInput && (
                    <button
                      onClick={() => { setSearchInput(''); setSearch('') }}
                      style={{
                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: '#475569', fontSize: 16, cursor: 'pointer',
                      }}
                    >✕</button>
                  )}
                </div>
                {searchInput && (
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 6, paddingLeft: 2 }}>
                    Buscando em: título · descrição · categoria · tags · layout · elementos visuais · tipo de deal
                  </div>
                )}
              </div>

              {/* Cabeçalho do material selecionado */}
              {selectedPresentation && (
                <div style={{
                  background: '#13131a', border: '1px solid #2d2d3d', borderRadius: 10,
                  padding: '12px 16px', marginBottom: 20,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>
                        {selectedPresentation.tipo_documento} {selectedPresentation.setor ? `· ${selectedPresentation.setor}` : ''}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>
                        {selectedPresentation.empresa_alvo || selectedPresentation.filename}
                      </div>
                      {selectedPresentation.objetivo_geral && (
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, maxWidth: 700 }}>
                          {selectedPresentation.objetivo_geral}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedPresentationId(null)}
                      style={{ background: 'none', border: 'none', color: '#475569', fontSize: 18 }}
                    >✕</button>
                  </div>
                </div>
              )}

              {loading ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: 64 }}>
                  Carregando slides...
                </div>
              ) : slides.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: 64 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
                  <div style={{ fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                    Nenhum slide encontrado
                  </div>
                  <button
                    onClick={() => setTab('upload')}
                    style={{
                      marginTop: 12, padding: '8px 20px', borderRadius: 8,
                      background: '#3b5bdb', color: '#fff', border: 'none', fontSize: 13,
                    }}
                  >
                    Fazer upload
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
                    {slides.length} slide{slides.length !== 1 ? 's' : ''}
                    {selectedPresentation ? ` em ${selectedPresentation.empresa_alvo || selectedPresentation.filename}` : ' no banco'}
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: 16,
                  }}>
                    {slides.map(slide => (
                      <SlideCard key={slide.slide_id} slide={slide} onClick={() => setSelectedSlide(slide)} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {selectedSlide && (
        <SlideModal slide={selectedSlide} onClose={() => setSelectedSlide(null)} />
      )}
    </div>
  )
}
