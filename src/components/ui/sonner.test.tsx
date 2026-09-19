import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'

import { Toaster } from './sonner'

describe('Toaster', () => {
  it('mount แล้วยิง toast ได้ ข้อความแสดงจริง', async () => {
    render(<Toaster />)
    toast.success('บันทึกสำเร็จ')

    await waitFor(() =>
      expect(screen.getByText('บันทึกสำเร็จ')).toBeInTheDocument(),
    )
  })

  it('toast.error แสดงพร้อม description', async () => {
    render(<Toaster />)
    toast.error('เกิดข้อผิดพลาด', { description: 'กรุณาลองใหม่' })

    await waitFor(() =>
      expect(screen.getByText('เกิดข้อผิดพลาด')).toBeInTheDocument(),
    )
    expect(screen.getByText('กรุณาลองใหม่')).toBeInTheDocument()
  })
})
