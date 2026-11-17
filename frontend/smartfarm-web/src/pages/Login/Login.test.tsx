// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../../App'
import { apiClient } from '../../services/api-client'
import { AUTH_SESSION_KEY } from '../../services/auth-storage'
import type { AuthSession } from '../../types/auth'

const validSession: AuthSession = {
  accessToken: 'access-token-1',
  refreshToken: 'refresh-token-1',
  expiresAtUtc: '2099-01-01T00:00:00Z',
  user: {
    id: 'user-1',
    userName: 'gardener',
    email: 'gardener@example.com',
    displayName: 'Người làm vườn',
    role: 'User',
  },
}

afterEach(cleanup)
beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
  vi.restoreAllMocks()
})

function renderApp(initialEntry = '/login') {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <App />
    </MemoryRouter>,
  )
  return userEvent.setup()
}

function unauthorizedError() {
  return Object.assign(new Error('Unauthorized'), {
    isAxiosError: true,
    response: { status: 401, data: { message: 'Unauthorized' } },
  })
}

function networkError() {
  return Object.assign(new Error('Network Error'), { isAxiosError: true, request: {} })
}

describe('Login acceptance criteria', () => {
  it('shows required errors and focuses the first invalid input', async () => {
    const user = renderApp()
    await screen.findByRole('heading', { name: 'Đăng nhập' })
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    expect(screen.getByText('Vui lòng nhập email hoặc tên đăng nhập.')).toBeTruthy()
    expect(screen.getByText('Vui lòng nhập mật khẩu.')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByLabelText('Email hoặc tên đăng nhập'))
  })

  it('rejects malformed emails but accepts a non-empty username', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: validSession } as never)
    const user = renderApp()
    await screen.findByRole('heading', { name: 'Đăng nhập' })
    await user.type(screen.getByLabelText('Email hoặc tên đăng nhập'), 'invalid@email')
    await user.type(screen.getByLabelText('Mật khẩu', { exact: true }), 'password')
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    expect(screen.getByText('Email không đúng định dạng.')).toBeTruthy()

    await user.clear(screen.getByLabelText('Email hoặc tên đăng nhập'))
    await user.type(screen.getByLabelText('Email hoặc tên đăng nhập'), 'gardener')
    expect(screen.queryByText('Email không đúng định dạng.')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    await screen.findByRole('heading', { name: 'Tổng quan khu vườn' })
    expect(post).toHaveBeenCalledWith('/api/Auth/login', {
      userNameOrEmail: 'gardener',
      password: 'password',
    })
  })

  it('can show and hide the password without submitting', async () => {
    const user = renderApp()
    await screen.findByRole('heading', { name: 'Đăng nhập' })
    const password = screen.getByLabelText('Mật khẩu', { exact: true })
    expect(password.getAttribute('type')).toBe('password')
    await user.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }))
    expect(password.getAttribute('type')).toBe('text')
    await user.click(screen.getByRole('button', { name: 'Ẩn mật khẩu' }))
    expect(password.getAttribute('type')).toBe('password')
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
  })

  it('shows API 401 errors, preserves retry, stores the session, and navigates after success', async () => {
    const post = vi.spyOn(apiClient, 'post')
      .mockRejectedValueOnce(unauthorizedError())
      .mockResolvedValueOnce({ data: validSession } as never)
    const user = renderApp()
    await screen.findByRole('heading', { name: 'Đăng nhập' })
    await user.type(screen.getByLabelText('Email hoặc tên đăng nhập'), ' DEMO@example.com ')
    await user.type(screen.getByLabelText('Mật khẩu', { exact: true }), 'incorrect')
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Tên đăng nhập hoặc email/mật khẩu không đúng. Vui lòng thử lại.',
    )
    expect(screen.getByRole('button', { name: 'Đăng nhập' }).hasAttribute('disabled')).toBe(false)

    await user.clear(screen.getByLabelText('Mật khẩu', { exact: true }))
    await user.type(screen.getByLabelText('Mật khẩu', { exact: true }), 'correct')
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    await screen.findByRole('heading', { name: 'Tổng quan khu vườn' })
    expect(post).toHaveBeenNthCalledWith(1, '/api/Auth/login', {
      userNameOrEmail: 'DEMO@example.com',
      password: 'incorrect',
    })
    expect(post).toHaveBeenNthCalledWith(2, '/api/Auth/login', {
      userNameOrEmail: 'DEMO@example.com',
      password: 'correct',
    })
    expect(JSON.parse(sessionStorage.getItem(AUTH_SESSION_KEY) ?? 'null')).toEqual(validSession)
    expect(localStorage.length).toBe(0)
  })

  it('shows a useful message when the API cannot be reached', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(networkError())
    const user = renderApp()
    await screen.findByRole('heading', { name: 'Đăng nhập' })
    await user.type(screen.getByLabelText('Email hoặc tên đăng nhập'), 'gardener')
    await user.type(screen.getByLabelText('Mật khẩu', { exact: true }), 'secret')
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối rồi thử lại.',
    )
    expect(screen.queryByRole('heading', { name: 'Tổng quan khu vườn' })).toBeNull()
  })

  it('redirects to the originally requested protected route after sign-in', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: validSession } as never)
    const user = renderApp('/alerts')
    await screen.findByRole('heading', { name: 'Đăng nhập' })
    await user.type(screen.getByLabelText('Email hoặc tên đăng nhập'), 'gardener@example.com')
    await user.type(screen.getByLabelText('Mật khẩu', { exact: true }), 'secret')
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    await screen.findByRole('heading', { name: 'Cảnh báo' })
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/Auth/login', {
      userNameOrEmail: 'gardener@example.com',
      password: 'secret',
    }))
  })
})
