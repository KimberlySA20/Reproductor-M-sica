import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Interceptor para añadir token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor para manejar errores 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password })
    return response.data
  },
  register: async (email: string, password: string, username?: string) => {
    const response = await api.post('/auth/register', { email, password, username })
    return response.data
  },
  getUser: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },
  logout: async () => {
    localStorage.removeItem('token')
    try { await api.post('/auth/logout') } catch {}
  }
}

// Music
export const musicAPI = {
  getTracks: async () => {
    const response = await api.get('/music/tracks')
    return response.data
  },
  upload: async (formData: FormData, onProgress?: (pct: number) => void) => {
    const response = await api.post('/music/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total))
      }
    })
    return response.data
  },
  delete: async (id: string) => {
    const response = await api.delete(`/music/${id}`)
    return response.data
  },
  convert: async (id: string, format: string) => {
    const response = await api.post(`/music/convert/${id}`, { format })
    return response.data
  },
  getStreamUrl: (id: string) => `/api/music/stream/${id}`,
  download: async (id: string, filename: string) => {
    const response = await api.get(`/music/download/${id}`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  },
}

export default api
