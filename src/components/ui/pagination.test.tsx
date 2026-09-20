import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { Pagination } from './pagination'

describe('Pagination', () => {
  it('แสดงสถานะหน้าและเรียก onPageChange สำหรับหน้าถัดไป', () => {
    const onPageChange = vi.fn()

    render(
      <Pagination
        page={2}
        totalPages={3}
        onPageChange={onPageChange}
        summary={<span>12 รายการ</span>}
      />,
    )

    expect(
      screen.getByRole('navigation', { name: 'Pagination' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))

    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('ปิดปุ่มเมื่ออยู่หน้าสุดและรองรับปุ่ม Previous/Next แบบมี label', () => {
    render(
      <Pagination
        page={1}
        totalPages={1}
        onPageChange={vi.fn()}
        showFirstLast={false}
        showButtonLabels
      />,
    )

    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    expect(screen.getByText('Previous')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
  })
})
