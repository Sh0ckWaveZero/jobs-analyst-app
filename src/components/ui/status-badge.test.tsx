import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { StatusBadge } from './status-badge'

describe('StatusBadge', () => {
  it.each([
    ['active', 'Active', 'border-teal-300'],
    ['inactive', 'Inactive', 'border-slate-300'],
    ['invited', 'Invited', 'border-sky-300'],
    ['suspended', 'Suspended', 'border-red-200'],
  ] as const)('%s แสดง label และสีสถานะที่ถูกต้อง', (status, label, border) => {
    render(<StatusBadge status={status} />)

    const badge = screen.getByText(label)
    expect(badge).toHaveAttribute('data-status', status)
    expect(badge).toHaveClass(border)
    expect(badge).toHaveClass(
      'rounded-md',
      'px-2.5',
      'py-0.5',
      'text-xs',
      'font-medium',
      'leading-4',
    )
  })
})
