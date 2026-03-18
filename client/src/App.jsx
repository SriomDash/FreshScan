import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthPage     from './pages/AuthPage'
import ScanPage     from './pages/ScanPage'
import HistoryPage  from './pages/HistoryPage'
import DashboardPage from './pages/DashboardPage'
import Layout       from './components/Layout'

function ProtectedRoute({ children }) {
  const { vendor, loading } = useAuth()
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
      <Spinner />
    </div>
  )
  return vendor ? children : <Navigate to="/auth" replace />
}

function Spinner() {
  return (
    <div style={{
      width:32, height:32, borderRadius:'50%',
      border:'2px solid rgba(74,200,100,0.2)',
      borderTopColor:'#4ac864',
      animation:'spin 0.8s linear infinite'
    }}/>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/scan" replace />} />
            <Route path="scan"      element={<ScanPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="history"   element={<HistoryPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
