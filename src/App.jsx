import './styles/style.css'
import { AuthProvider } from './auth/AuthProvider.jsx'
import { useAuth } from './auth/useAuth.js'
import { LoginPage } from './auth/LoginPage.jsx'
import { Three } from './Three.jsx'

function AuthGate() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="authGate">
        <div className="authGate__spinner" role="status" aria-label="Loading" />
      </div>
    )
  }

  if (!session) {
    return <LoginPage />
  }

  return (
    <div className="app">
      <Three />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}

export default App
