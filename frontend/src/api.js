import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({ baseURL: API_BASE_URL })

export const uploadPptx = (file, onProgress) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/api/upload', form, {
    onUploadProgress: e => onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
  })
}

export const getPresentationStatus = id => api.get(`/api/presentations/${id}/status`)
export const listPresentations = () => api.get('/api/presentations')
export const deletePresentation = id => api.delete(`/api/presentations/${id}`)
export const listSlides = params => api.get('/api/slides', { params })
export const getSlide = id => api.get(`/api/slides/${id}`)
export const listCategories = () => api.get('/api/categories')
export const getStats = () => api.get('/api/stats')

export default api
