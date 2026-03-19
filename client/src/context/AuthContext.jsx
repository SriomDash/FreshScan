import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [vendor, setVendor]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('fs_token')
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      api.get('/api/auth/me')
        .then(r => setVendor(r.data.vendor))
        .catch(() => { localStorage.removeItem('fs_token') })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const r = await api.post('/api/auth/login', { email, password })
    localStorage.setItem('fs_token', r.data.token)
    api.defaults.headers.common['Authorization'] = `Bearer ${r.data.token}`
    setVendor(r.data.vendor)
    return r.data
  }

  const signup = async (name, email, password, city, state) => {
    const r = await api.post('/api/auth/signup', { name, email, password, city, state })
    localStorage.setItem('fs_token', r.data.token)
    api.defaults.headers.common['Authorization'] = `Bearer ${r.data.token}`
    setVendor(r.data.vendor)
    return r.data
  }

  const logout = () => {
    localStorage.removeItem('fs_token')
    delete api.defaults.headers.common['Authorization']
    setVendor(null)
  }

  return (
    <AuthContext.Provider value={{ vendor, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
