import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { Input } from './input'

describe('Input', () => {
  it('พิมพ์ค่าและรับ onChange', () => {
    const onChange = vi.fn()
    render(<Input placeholder="ค้นหา" onChange={onChange} />)
    const input = screen.getByPlaceholderText('ค้นหา')
    fireEvent.change(input, { target: { value: 'abc' } })
    expect(onChange).toHaveBeenCalled()
    expect(input).toHaveValue('abc')
  })

  it('ส่ง type ผ่านได้ เช่น password', () => {
    render(<Input type="password" data-testid="pw" />)
    expect(screen.getByTestId('pw')).toHaveAttribute('type', 'password')
  })
})
