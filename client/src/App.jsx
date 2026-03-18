import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthPage      from './pages/AuthPage'
import ScanPage      from './pages/ScanPage'
import HistoryPage   from './pages/HistoryPage'
import DashboardPage from './pages/DashboardPage'
import Layout        from './components/Layout'

function Spinner() {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#f8fafc'}}>
      <div style={{width:32,height:32,borderRadius:'50%',border:'2px solid #dcfce7',borderTopColor:'#16a34a',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { vendor, loading } = useAuth()
  if (loading) return <Spinner/>
  return vendor ? children : <Navigate to="/auth" replace/>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage/>}/>
          <Route path="/" element={<ProtectedRoute><Layout/></ProtectedRoute>}>
            <Route index element={<Navigate to="/scan" replace/>}/>
            <Route path="scan"      element={<ScanPage/>}/>
            <Route path="dashboard" element={<DashboardPage/>}/>
            <Route path="history"   element={<HistoryPage/>}/>
          </Route>
          <Route path="*" element={<Navigate to="/" replace/>}/>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
