import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AUTH_SESSION_EXPIRED_EVENT,
  AUTH_SESSION_UPDATED_EVENT,
  clearAuthSession,
  readAuthSession,
} from '../services/auth-storage'
import { login, logout, restoreAuthSession } from '../services/auth-service'
import type { AuthSession, LoginCredentials } from '../types/auth'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthContextValue {
  status: AuthStatus
  session: AuthSession | null
  signIn: (credentials: LoginCredentials) => Promise<AuthSession>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    const expireSession = () => {
      setSession(null)
      setStatus('unauthenticated')
    }
    const updateSession = () => {
      const latest = readAuthSession()
      if (latest) {
        setSession(latest)
        setStatus('authenticated')
      }
    }
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, expireSession)
    window.addEventListener(AUTH_SESSION_UPDATED_EVENT, updateSession)

    let isMounted = true
    void restoreAuthSession()
      .then((restored) => {
        if (!isMounted) return
        setSession(restored)
        setStatus(restored ? 'authenticated' : 'unauthenticated')
      })
      .catch(() => {
        if (!isMounted) return
        // A failed refresh must not expose protected routes as authenticated.
        setSession(null)
        setStatus('unauthenticated')
      })

    return () => {
      isMounted = false
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, expireSession)
      window.removeEventListener(AUTH_SESSION_UPDATED_EVENT, updateSession)
    }
  }, [])

  const signIn = useCallback(async (credentials: LoginCredentials) => {
    const authenticated = await login(credentials)
    setSession(authenticated)
    setStatus('authenticated')
    return authenticated
  }, [])

  const signOut = useCallback(async () => {
    const current = readAuthSession() ?? session
    try {
      if (current?.refreshToken) await logout(current.refreshToken)
    } finally {
      clearAuthSession()
      setSession(null)
      setStatus('unauthenticated')
    }
  }, [session])

  const value = useMemo(() => ({ status, session, signIn, signOut }), [status, session, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth phải được dùng bên trong AuthProvider.')
  return context
}
