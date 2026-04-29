import { useState } from 'react'
import { FUEL_ADMIN_USERNAME } from '../lib/fuelAuth.js'
import { FUEL_WORD_LOGO_WHITE_URL } from '../lib/fuelBrandLogo.js'
import { useAuth } from './useAuth.js'

export function LoginPage() {
  const { signIn, supabaseConfigured } = useAuth()
  const [username, setUsername] = useState(FUEL_ADMIN_USERNAME)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  const onSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)
    setBusy(true)
    try {
      const { error } = await signIn(username, password)
      if (error) setMessage(error.message ?? 'Sign in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="loginPage">
      <img
        className="loginPage__logo"
        src={FUEL_WORD_LOGO_WHITE_URL}
        alt="Fuel"
        width={220}
        height={48}
        decoding="async"
      />
      <div className="loginPage__card">

        <h1 className="loginPage__title">Fuel Sydney</h1>
        <h2 className="loginPage__title loginPage__title--secondary">Conceptual 3D Models</h2>
        <p className="loginPage__subtitle">Sign in to continue</p>

        {!supabaseConfigured ? (
          <p className="loginPage__warn">
            Add <code className="loginPage__code">VITE_SUPABASE_ANON_KEY</code> to{' '}
            <code className="loginPage__code">.env</code> in the <code className="loginPage__code">fsdu</code>{' '}
            folder (and optionally <code className="loginPage__code">VITE_SUPABASE_URL</code>), then restart{' '}
            <code className="loginPage__code">npm run dev</code>.
          </p>
        ) : null}

        <form className="loginPage__form" onSubmit={onSubmit}>
          <label className="loginPage__label" htmlFor="fuel-username">
            Username
          </label>
          <input
            id="fuel-username"
            className="loginPage__input"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={!supabaseConfigured || busy}
          />

          <label className="loginPage__label" htmlFor="fuel-password">
            Password
          </label>
          <input
            id="fuel-password"
            className="loginPage__input"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!supabaseConfigured || busy}
          />

          {message ? <p className="loginPage__error">{message}</p> : null}

          <button className="loginPage__submit" type="submit" disabled={!supabaseConfigured || busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        {/* 
        <p className="loginPage__hint">
          Supabase user email must be <code className="loginPage__code">{fuelAdminAuthEmail()}</code> (username{' '}
          <code className="loginPage__code">{FUEL_ADMIN_USERNAME}</code>).
        </p> */}
      </div>
    </div>
  )
}
