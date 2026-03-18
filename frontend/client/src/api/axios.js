import axios from 'axios'

const api = axios.create({
  baseURL: '/',
  headers: { 'Content-Type': 'application/json' },
})

// Attach token on every request
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('fs_token')
  if (token) cfg.headers['Authorization'] = `Bearer ${token}`
  return cfg
})

// Global 401 handler
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fs_token')
      window.location.href = '/auth'
    }
    return Promise.reject(err)
  }
)

export default api
