// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import App from '../App'
import { apiClient } from '../services/api-client'
import { AUTH_SESSION_KEY } from '../services/auth-storage'

vi.mock('./useSensorHub', () => ({
  useSensorHub: () => ({ status: 'disconnected', telemetry: null, devices: [], isTelemetryStale: true }),
}))
import type { AuthSession, AuthUser } from '../types/auth'

const storedSession: AuthSession = {
  accessToken: 'old-access-token',
  refreshToken: 'old-refresh-token',
  expiresAtUtc: '2099-01-01T00:00:00Z',
  user: {
    id: 'user-1',
    userName: 'gardener',
    email: 'gardener@example.com',
    role: 'User',
  },
}

const refreshedSession: AuthSession = {
  ...storedSession,
  accessToken: 'new-access-token',
  refreshToken: 'new-refresh-token',
  expiresAtUtc: '2099-01-01T00:15:00Z',
}

const userProfile: AuthUser = {
  ...storedSession.user,
  displayName: 'Người làm vườn',
  phoneNumber: '0900000000',
  createdAtUtc: '2026-01-01T00:00:00Z',
}

let originalAdapter = apiClient.defaults.adapter

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
  originalAdapter = apiClient.defaults.adapter
  vi.restoreAllMocks()
})

afterEach(() => {
  cleanup()
  apiClient.defaults.adapter = originalAdapter
})

function renderApp(initialEntry = '/dashboard') {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <App />
    </MemoryRouter>,
  )
}

describe('Authentication session and route guard', () => {
  it('redirects a signed-out user from a protected page to login', async () => {
    renderApp('/dashboard')
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Tổng quan khu vườn' })).toBeNull()
  })

  it('restores a valid tab session from /me and sends its bearer token', async () => {
    sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(storedSession))
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => ({
      data: userProfile,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }))
    apiClient.defaults.adapter = adapter

    renderApp('/dashboard')
    expect(await screen.findByRole('heading', { name: 'Tổng quan khu vườn' })).toBeTruthy()
    expect(adapter).toHaveBeenCalledOnce()
    expect(adapter.mock.calls[0]?.[0].url).toBe('/api/Auth/me')
    expect(adapter.mock.calls[0]?.[0].headers.Authorization).toBe('Bearer old-access-token')
    expect(JSON.parse(sessionStorage.getItem(AUTH_SESSION_KEY) ?? 'null').user.displayName).toBe('Người làm vườn')
    expect(localStorage.length).toBe(0)
  })

  it('refreshes an expired tab session and stores the rotated tokens before opening protected routes', async () => {
    const expiredSession = { ...storedSession, expiresAtUtc: '2000-01-01T00:00:00Z' }
    sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(expiredSession))
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: refreshedSession } as never)

    renderApp('/devices')
    expect(await screen.findByRole('heading', { name: 'Thiết bị' })).toBeTruthy()
    expect(post).toHaveBeenCalledWith('/api/Auth/refresh-token', { refreshToken: 'old-refresh-token' })
    expect(JSON.parse(sessionStorage.getItem(AUTH_SESSION_KEY) ?? 'null')).toEqual(refreshedSession)
  })

  it('keeps rotated tokens when /me returns 401 during session restoration', async () => {
    const expiringSession = {
      ...storedSession,
      expiresAtUtc: new Date(Date.now() + 45_000).toISOString(),
    }
    sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(expiringSession))
    const calls: Array<{ url?: string; authorization?: unknown }> = []
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      const authorization = config.headers.Authorization
      calls.push({ url: config.url, authorization })
      if (config.url === '/api/Auth/refresh-token') {
        return { data: refreshedSession, status: 200, statusText: 'OK', headers: {}, config }
      }
      if (config.url === '/api/Auth/me' && authorization === 'Bearer old-access-token') {
        const response = { data: {}, status: 401, statusText: 'Unauthorized', headers: {}, config }
        throw new AxiosError('Unauthorized', AxiosError.ERR_BAD_REQUEST, config, {}, response)
      }
      return { data: userProfile, status: 200, statusText: 'OK', headers: {}, config }
    })
    apiClient.defaults.adapter = adapter

    renderApp('/dashboard')

    expect(await screen.findByRole('heading', { name: 'Tổng quan khu vườn' })).toBeTruthy()
    expect(calls.filter((call) => call.url === '/api/Auth/refresh-token')).toHaveLength(1)
    expect(calls).toEqual(expect.arrayContaining([
      expect.objectContaining({ url: '/api/Auth/me', authorization: 'Bearer old-access-token' }),
      expect.objectContaining({ url: '/api/Auth/me', authorization: 'Bearer new-access-token' }),
    ]))
    expect(JSON.parse(sessionStorage.getItem(AUTH_SESSION_KEY) ?? 'null').refreshToken).toBe('new-refresh-token')
  })

  it('refreshes once for concurrent API 401 responses and retries both requests with the rotated token', async () => {
    sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(storedSession))
    const calls: Array<{ url?: string; authorization?: unknown }> = []
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      const authorization = config.headers.Authorization
      calls.push({ url: config.url, authorization })

      if (config.url === '/api/Auth/me') {
        return { data: userProfile, status: 200, statusText: 'OK', headers: {}, config }
      }
      if (config.url === '/api/Auth/refresh-token') {
        await new Promise((resolve) => setTimeout(resolve, 0))
        return { data: refreshedSession, status: 200, statusText: 'OK', headers: {}, config }
      }
      if (authorization === 'Bearer old-access-token') {
        const response = { data: {}, status: 401, statusText: 'Unauthorized', headers: {}, config }
        throw new AxiosError('Unauthorized', AxiosError.ERR_BAD_REQUEST, config, {}, response)
      }
      return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config }
    })
    apiClient.defaults.adapter = adapter

    renderApp('/dashboard')
    expect(await screen.findByRole('heading', { name: 'Tổng quan khu vườn' })).toBeTruthy()
    const [devices, alerts] = await Promise.all([
      apiClient.get('/api/devices'),
      apiClient.get('/api/alerts'),
    ])

    expect(devices.data).toEqual({ ok: true })
    expect(alerts.data).toEqual({ ok: true })
    expect(calls.filter((call) => call.url === '/api/Auth/refresh-token')).toHaveLength(1)
    expect(calls.filter((call) => call.url === '/api/devices' || call.url === '/api/alerts'))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ authorization: 'Bearer old-access-token' }),
        expect.objectContaining({ authorization: 'Bearer new-access-token' }),
      ]))
    expect(JSON.parse(sessionStorage.getItem(AUTH_SESSION_KEY) ?? 'null')).toEqual(refreshedSession)
    expect(screen.getByRole('button', { name: 'Đăng xuất' })).toBeTruthy()
  })

  it('clears the session and returns to login when API refresh fails', async () => {
    sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(storedSession))
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      if (config.url === '/api/Auth/me') {
        return { data: userProfile, status: 200, statusText: 'OK', headers: {}, config }
      }
      if (config.url === '/api/Auth/refresh-token') {
        throw Object.assign(new Error('Network Error'), { isAxiosError: true, request: {} })
      }
      const response = { data: {}, status: 401, statusText: 'Unauthorized', headers: {}, config }
      throw new AxiosError('Unauthorized', AxiosError.ERR_BAD_REQUEST, config, {}, response)
    })
    apiClient.defaults.adapter = adapter

    renderApp('/dashboard')
    expect(await screen.findByRole('heading', { name: 'Tổng quan khu vườn' })).toBeTruthy()
    await expect(apiClient.get('/api/devices')).rejects.toThrow()

    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeTruthy()
    expect(sessionStorage.getItem(AUTH_SESSION_KEY)).toBeNull()
  })

  it('attempts server logout and clears the tab session even when the request fails', async () => {
    sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(storedSession))
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: userProfile } as never)
    const post = vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Network Error'))

    renderApp('/dashboard')
    expect(await screen.findByRole('heading', { name: 'Tổng quan khu vườn' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))

    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeTruthy()
    expect(post).toHaveBeenCalledWith('/api/Auth/logout', { refreshToken: 'old-refresh-token' })
    expect(sessionStorage.getItem(AUTH_SESSION_KEY)).toBeNull()
    expect(localStorage.length).toBe(0)
  })
})
