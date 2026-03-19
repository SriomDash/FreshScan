import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './Layout.module.css'

const NAV = [
  { to: '/scan',      label: 'Scan',      icon: '🔍' },
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/history',   label: 'History',   icon: '🕘' },
]

export default function Layout() {
  const { vendor, logout } = useAuth()
  const navigate = useNavigate()
  const handleLogout = () => { logout(); navigate('/auth') }

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.logo}>
          <span style={{color:'var(--green)',fontSize:'1.2rem'}}>🌿</span>
          Fresh<span>Scan</span>
        </div>
        <nav className={styles.nav}>
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to}
              className={({ isActive }) => `${styles.navBtn} ${isActive ? styles.navActive : ''}`}
            >
              <span style={{fontSize:'0.85rem'}}>{n.icon}</span> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.right}>
          <div className={styles.vendorBadge}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <strong>{vendor?.vendorId}</strong>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Log out
          </button>
        </div>
      </header>
      <main className={styles.main}><Outlet /></main>
    </div>
  )
}
