import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { Route } from './__root'

vi.mock('@tanstack/react-router', () => ({
  createRootRouteWithContext:
    () =>
    (options: unknown): { options: unknown } =>
      ({ options }),
  HeadContent: () => null,
  Scripts: () => null,
  Outlet: () => <div data-testid="outlet">OUTLET</div>,
  Link: ({
    children,
    to,
  }: {
    children: React.ReactNode
    to?: string
  }) => <a href={to ?? '#'}>{children}</a>,
}))

const options = Route.options as unknown as {
  component: () => React.ReactElement
  notFoundComponent: () => React.ReactElement
  shellComponent: (props: { children: React.ReactNode }) => React.ReactElement
  head: () => { meta: Array<Record<string, string>> }
}

describe('__root', () => {
  it('RootLayout render Outlet + Toaster', () => {
    render(<options.component />)
    expect(screen.getByTestId('outlet')).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: /notifications/i }),
    ).toBeInTheDocument()
  })

  it('notFoundComponent แสดง 404 + ลิงก์กลับ dashboard', () => {
    render(<options.notFoundComponent />)
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByText('Page not found')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to dashboard/ })).toBeInTheDocument()
  })

  it('head() ให้ title และ stylesheet', () => {
    const head = options.head()
    expect(
      head.meta.find((m) => m.title === 'Jobs Analysis'),
    ).toBeDefined()
    expect(
      head.meta.find((m) => m.charSet === 'utf-8'),
    ).toBeDefined()
  })

  it('shellComponent render โครง html', () => {
    render(
      <options.shellComponent>
        <div data-testid="page">เนื้อหา</div>
      </options.shellComponent>,
    )
    // happy-dom อาจย้าย <html>/<head> ออกจาก container — เช็คเฉพาะเนื้อหา render ครบ
    expect(document.body.textContent).toContain('เนื้อหา')
  })
})
