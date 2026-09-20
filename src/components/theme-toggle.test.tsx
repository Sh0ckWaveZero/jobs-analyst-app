import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ThemeToggle } from './theme-toggle'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

describe('ThemeToggle', () => {
  it('เลือก Dark → ตั้ง class dark บน <html> + บันทึก localStorage', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: 'Toggle theme' }))
    await user.click(screen.getByRole('menuitem', { name: 'Dark' }))

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('เลือก Light → ถอด class dark', async () => {
    document.documentElement.classList.add('dark')
    const user = userEvent.setup()
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: 'Toggle theme' }))
    await user.click(screen.getByRole('menuitem', { name: 'Light' }))

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('เลือก System → ตาม prefers-color-scheme ของ OS', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: 'Toggle theme' }))
    await user.click(screen.getByRole('menuitem', { name: 'System' }))

    await waitFor(() => expect(localStorage.getItem('theme')).toBe('system'))
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    expect(document.documentElement.classList.contains('dark')).toBe(prefersDark)
  })

  it('มี theme ค้างใน localStorage → ใช้ค่านั้นทันที', async () => {
    localStorage.setItem('theme', 'dark')
    const user = userEvent.setup()
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: 'Toggle theme' }))
    expect(screen.getByRole('menuitem', { name: 'Dark' })).toBeInTheDocument()
  })

  it('browser รองรับ startViewTransition → ใช้ตอนสลับธีม', async () => {
    const startViewTransition = vi.fn((cb: () => void) => {
      cb()
      return { finished: Promise.resolve() }
    })
    ;(document as unknown as { startViewTransition: typeof startViewTransition }).startViewTransition =
      startViewTransition

    render(<ThemeToggle />)
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Toggle theme' }))
    await userEvent
      .setup()
      .click(screen.getByRole('menuitem', { name: 'Dark' }))

    expect(startViewTransition).toHaveBeenCalled()
    delete (document as unknown as { startViewTransition?: unknown })
      .startViewTransition
  })
})
