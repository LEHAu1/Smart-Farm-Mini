// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import LoginPage from './index'

const { loginDemoMock } = vi.hoisted(() => ({ loginDemoMock: vi.fn() }))

vi.mock('../../services/auth-service', () => ({
  loginDemo: loginDemoMock,
  loginWithGoogle: vi.fn(),
}))

afterEach(cleanup)
beforeEach(() => {
  loginDemoMock.mockReset()
  loginDemoMock.mockImplementation(async (credentials: { email: string; password: string }) => {
    await new Promise((resolve) => setTimeout(resolve, 30))
    if (credentials.email.trim().toLowerCase() !== 'demo@smartfarm.local' || credentials.password !== 'SmartFarm123!') {
      throw new Error('Email hoặc mật khẩu không đúng. Vui lòng thử lại.')
    }
  })
})

function renderLogin() {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<h1>Dashboard đích</h1>} />
      </Routes>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

describe('Login acceptance criteria', () => {
  it('shows required errors and focuses the first invalid input', async () => {
    const user = renderLogin()
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    expect(screen.getByText('Vui lòng nhập email hoặc tên đăng nhập.')).toBeTruthy()
    expect(screen.getByText('Vui lòng nhập mật khẩu.')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByLabelText('Email'))
  })

  it('rejects malformed email and clears the error when edited', async () => {
    const user = renderLogin()
    await user.type(screen.getByLabelText('Email'), 'invalid@')
    await user.type(screen.getByLabelText('Mật khẩu', { exact: true }), 'password')
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    expect(screen.getByText('Email không đúng định dạng.')).toBeTruthy()
    await user.type(screen.getByLabelText('Email'), 'example.com')
    expect(screen.queryByText('Email không đúng định dạng.')).toBeNull()
  })

  it('can show and hide the password without submitting', async () => {
    const user = renderLogin()
    const password = screen.getByLabelText('Mật khẩu', { exact: true })
    expect(password.getAttribute('type')).toBe('password')
    await user.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }))
    expect(password.getAttribute('type')).toBe('text')
    await user.click(screen.getByRole('button', { name: 'Ẩn mật khẩu' }))
    expect(password.getAttribute('type')).toBe('password')
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
  })

  it('shows invalid credentials, disables duplicate submission, then permits retry', async () => {
    const user = renderLogin()
    await user.type(screen.getByLabelText('Email'), 'wrong@example.com')
    await user.type(screen.getByLabelText('Mật khẩu', { exact: true }), 'incorrect')
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    expect(screen.getByRole('button', { name: 'Đang đăng nhập…' }).hasAttribute('disabled')).toBe(true)
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.')
    expect(screen.getByRole('button', { name: 'Đăng nhập' }).hasAttribute('disabled')).toBe(false)
    expect(screen.queryByText('Dashboard đích')).toBeNull()
    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'demo@smartfarm.local')
    await user.clear(screen.getByLabelText('Mật khẩu', { exact: true }))
    await user.type(screen.getByLabelText('Mật khẩu', { exact: true }), 'SmartFarm123!')
    expect(screen.queryByRole('alert')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    await waitFor(() => expect(screen.getByText('Dashboard đích')).toBeTruthy())
  })

  it('redirects to dashboard after a successful demo login with trimmed email', async () => {
    const user = renderLogin()
    await user.type(screen.getByLabelText('Email'), ' DEMO@smartfarm.local ')
    await user.type(screen.getByLabelText('Mật khẩu', { exact: true }), 'SmartFarm123!')
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    await waitFor(() => expect(screen.getByText('Dashboard đích')).toBeTruthy())
  })
})
