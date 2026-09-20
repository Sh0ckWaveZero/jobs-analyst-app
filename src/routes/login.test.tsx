import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@testing-library/react'

import { Route } from './login'
import { getSession } from '@/features/auth/auth.functions'

const state = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('@/features/auth/auth-client', () => ({
  authClient: {
    signIn: { email: state.signIn },
    signUp: { email: state.signUp },
  },
}))
vi.mock('@/features/auth/auth.functions', () => ({ getSession: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute:
    () =>
    (options: unknown): { options: unknown } =>
      ({ options }),
  redirect: (opts: { to: string }) => {
    throw Object.assign(new Error('REDIRECT'), opts)
  },
  useNavigate: () => state.navigate,
}))

// route file เก็บ component ไว้ใน options (createFileRoute ถูก mock)
const LoginPage = (Route.options as unknown as { component: () => React.ReactElement })
  .component
const beforeLoad = (Route.options as unknown as {
  beforeLoad: () => Promise<void>
}).beforeLoad

beforeEach(() => {
  state.signIn.mockReset()
  state.signUp.mockReset()
  state.navigate.mockReset()
})

describe('LoginPage', () => {
  it('ล็อกอินสำเร็จ → navigate ไป /', async () => {
    const user = userEvent.setup()
    state.signIn.mockResolvedValue({ error: null })
    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'admin@pm.local')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() =>
      expect(state.signIn).toHaveBeenCalledWith({
        email: 'admin@pm.local',
        password: 'password123',
      }),
    )
    await waitFor(() => expect(state.navigate).toHaveBeenCalledWith({ to: '/' }))
  })

  it('ล็อกอิน fail → แสดง error จาก better-auth', async () => {
    const user = userEvent.setup()
    state.signIn.mockResolvedValue({
      error: { message: 'Invalid email or password' },
    })
    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'admin@pm.local')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(
      await screen.findByText('Invalid email or password'),
    ).toBeInTheDocument()
    expect(state.navigate).not.toHaveBeenCalled()
  })

  it('สลับไปโหมด sign up → มีช่อง Name และเรียก signUp', async () => {
    const user = userEvent.setup()
    state.signUp.mockResolvedValue({ error: null })
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(await screen.findByLabelText('Name')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Name'), 'New User')
    await user.type(screen.getByLabelText('Email'), 'new@pm.local')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() =>
      expect(state.signUp).toHaveBeenCalledWith({
        email: 'new@pm.local',
        password: 'password123',
        name: 'New User',
      }),
    )
  })

  it('submit โดยไม่กรอก → zod แสดงข้อความ validate', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Email is required')).toBeInTheDocument()
    expect(state.signIn).not.toHaveBeenCalled()
  })

  it('sign up fail → แสดง error จาก better-auth', async () => {
    const user = userEvent.setup()
    state.signUp.mockResolvedValue({ error: { message: 'Email already used' } })
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: 'Sign up' }))
    await screen.findByLabelText('Name')
    await user.type(screen.getByLabelText('Email'), 'dup@pm.local')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Email already used')).toBeInTheDocument()
    expect(state.navigate).not.toHaveBeenCalled()
  })

  it('สลับโหมดไปกลับได้', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(await screen.findByText(/Already have an account?/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText(/No account\?/)).toBeInTheDocument()
  })
})

describe('login beforeLoad', () => {
  it('มี session → redirect ไป /', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1' } } as never)
    await expect(beforeLoad()).rejects.toThrow('REDIRECT')
  })

  it('ไม่มี session → ผ่านต่อ', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    await expect(beforeLoad()).resolves.toBeUndefined()
  })

  it('สมัครสมาชิก fail → แสดง message จาก server', async () => {
    const user = userEvent.setup()
    state.signUp.mockResolvedValue({ error: { message: 'อีเมลถูกใช้แล้ว' } })
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: 'Sign up' }))
    await user.type(screen.getByLabelText('Email'), 'new@pm.local')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('อีเมลถูกใช้แล้ว')).toBeInTheDocument()
    expect(state.navigate).not.toHaveBeenCalled()
  })

  it('สมัครสมาชิก fail ไม่มี message → ใช้ default text', async () => {
    const user = userEvent.setup()
    state.signUp.mockResolvedValue({ error: {} })
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: 'Sign up' }))
    await user.type(screen.getByLabelText('Email'), 'new@pm.local')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Sign up failed')).toBeInTheDocument()
  })
})
