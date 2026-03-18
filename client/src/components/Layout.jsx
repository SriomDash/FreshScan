import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Search } from 'lucide-react' // Ensure you run: npm install lucide-react
import styles from './Layout.module.css'

const NAV = [
  { to: '/scan',      label: 'Scan' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/history',   label: 'History' },
]

export default function Layout() {
  const { vendor, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { 
    logout()
    navigate('/auth') 
  }

  return (
    <div className={styles.shell}>
      {/* ── Topbar ── */}
      <header className={styles.topbar}>
        <div className={styles.logo}>
          <Search 
            color="#4ac864" 
            strokeWidth={3} 
            size={22} 
            style={{ marginRight: '10px', verticalAlign: 'middle' }} 
          />
          Fresh<span>Scan</span>
        </div>

        <nav className={styles.nav}>
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `${styles.navBtn} ${isActive ? styles.navActive : ''}`
              }
            >
              {/* Icons removed as requested */}
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.right}>
          <div className={styles.vendorBadge}>
            Vendor: <strong>{vendor?.name?.split(' ')[0]}</strong>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}