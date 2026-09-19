import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { ReportsPage } from './reports-page'

describe('ReportsPage', () => {
  it('แสดงหน้า placeholder รายงาน', () => {
    render(<ReportsPage />)
    expect(screen.getByRole('heading', { name: 'Reports' })).toBeInTheDocument()
    expect(screen.getByText(/Work Hour Analysis/)).toBeInTheDocument()
  })
})
