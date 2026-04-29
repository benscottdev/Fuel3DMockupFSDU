import { useCallback, useEffect, useMemo, useState } from 'react'
import { usernameToAuthEmail } from '../lib/fuelAuth.js'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'
import { AuthContext } from './authContext.js'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      const id = window.setTimeout(() => {
        setSession(null)
        setLoading(false)
      }, 0)
      return () => window.clearTimeout(id)
    }

    let cancelled = false

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!cancelled) {
        setSession(s)
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (username, password) => {
    if (!supabase) {
      return { error: new Error('Supabase is not configured. Add VITE_SUPABASE_ANON_KEY to .env.') }
    }
    const email = usernameToAuthEmail(username)
    if (!email) {
      return { error: new Error('Invalid username.') }
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error }
    setSession(data.session)
    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setSession(null)
  }, [])

  const value = useMemo(
    () => ({
      session,
      loading,
      signIn,
      signOut,
      supabaseConfigured: isSupabaseConfigured(),
    }),
    [session, loading, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
