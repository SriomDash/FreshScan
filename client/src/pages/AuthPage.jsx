import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import s from './AuthPage.module.css'

export default function AuthPage() {
  const [tab, setTab]         = useState('login')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const { login, signup }     = useAuth()
  const navigate              = useNavigate()

  const [form, setForm] = useState({ name:'', email:'', password:'', city:'', state:'' })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      if (tab === 'login') {
        await login(form.email, form.password)
      } else {
        if (!form.name.trim())     { setError('Name is required'); setLoading(false); return }
        if (!form.city.trim())     { setError('City is required'); setLoading(false); return }
        if (!form.state.trim())    { setError('State is required'); setLoading(false); return }
        if (form.password.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); return }
        await signup(form.name, form.email, form.password, form.city, form.state)
      }
      navigate('/scan')
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong')
    } finally { setLoading(false) }
  }

  return (
    <div className={s.page}>
      <div className={s.box}>
        <div className={s.logo}>
          <div className={s.logoIcon}>🥦</div>
          <span className={s.logoText}>Fresh<em>Scan</em></span>
        </div>

        <h1 className={s.title}>{tab === 'login' ? 'Welcome back' : 'Create account'}</h1>
        <p className={s.sub}>{tab === 'login' ? 'Sign in to your vendor account.' : 'Join FreshScan and get your unique Vendor ID.'}</p>

        <div className={s.tabs}>
          <button className={`${s.tab} ${tab==='login'?s.tabActive:''}`} onClick={()=>{setTab('login');setError('')}}>Sign in</button>
          <button className={`${s.tab} ${tab==='signup'?s.tabActive:''}`} onClick={()=>{setTab('signup');setError('')}}>Sign up</button>
        </div>

        {error && <div className={s.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={s.form}>
          {tab === 'signup' && (
            <div className={s.field}>
              <label className={s.label}>Full name</label>
              <input className={s.input} type="text" placeholder="Your name" value={form.name} onChange={set('name')} required autoComplete="name"/>
            </div>
          )}

          <div className={s.field}>
            <label className={s.label}>Email</label>
            <input className={s.input} type="email" placeholder="you@email.com" value={form.email} onChange={set('email')} required autoComplete="email"/>
          </div>

          <div className={s.field}>
            <label className={s.label}>Password</label>
            <input className={s.input} type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required autoComplete={tab==='login'?'current-password':'new-password'}/>
          </div>

          {/* Location fields — signup only */}
          {tab === 'signup' && (
            <div className={s.row}>
              <div className={s.field}>
                <label className={s.label}>City</label>
                <input className={s.input} type="text" placeholder="e.g. Mumbai" value={form.city} onChange={set('city')} required/>
              </div>
              <div className={s.field}>
                <label className={s.label}>State</label>
                <input className={s.input} type="text" placeholder="e.g. Maharashtra" value={form.state} onChange={set('state')} required/>
              </div>
            </div>
          )}

          <button className={s.submit} disabled={loading} type="submit">
            {loading ? 'Please wait…' : tab === 'login' ? 'Sign in →' : 'Create account →'}
          </button>
        </form>

        {tab === 'signup' && (
          <p className={s.hint}>A unique Vendor ID will be generated automatically and stored in your account.</p>
        )}
      </div>
    </div>
  )
}
