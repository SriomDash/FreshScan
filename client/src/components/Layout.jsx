import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import s from './Layout.module.css'

const NAV = [
  { to:'/scan',      icon:'🔍', label:'Scan' },
  { to:'/dashboard', icon:'📊', label:'Dashboard' },
  { to:'/history',   icon:'🕘', label:'History' },
]

export default function Layout() {
  const { vendor, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <div className={s.shell}>
      <header className={s.topbar}>
        <div className={s.logo}>
          <div className={s.logoIcon}>🌿</div>
          <div className={s.logoText}>Fresh<span>Scan</span></div>
        </div>
        <nav className={s.nav}>
          {NAV.map(n=>(
            <NavLink key={n.to} to={n.to} className={({isActive})=>`${s.navBtn}${isActive?' '+s.navActive:''}`}>
              <span>{n.icon}</span><span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={s.right}>
          <div className={s.vendorBadge}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span className={s.vendorId}>{vendor?.vendorId}</span>
          </div>
          <button className={s.logoutBtn} title="Log out" onClick={()=>{logout();navigate('/auth')}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </header>
      <main className={s.main}><Outlet/></main>
    </div>
  )
}
