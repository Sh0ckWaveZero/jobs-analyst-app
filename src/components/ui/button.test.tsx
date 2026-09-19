import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { Button } from './button'

describe('Button', () => {
  it('แสดง children ที่ส่งเข้ามา', () => {
    render(<Button>Save changes</Button>)
    expect(
      screen.getByRole('button', { name: 'Save changes' }),
    ).toBeInTheDocument()
  })

  it('เรียก onClick เมื่อคลิก', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click me</Button>)
    fireEvent.click(screen.getByRole('button', { name: 'Click me' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('disabled อยู่แล้วคลิกไม่ทำงาน', () => {
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} disabled>
        Loading
      </Button>,
    )
    const btn = screen.getByRole('button', { name: 'Loading' })
    expect(btn).toBeDisabled()
    fireEvent.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('variant outline มีคลาสเส้นขอบ ต่างจาก default', () => {
    const { rerender } = render(<Button>Default</Button>)
    const defaultClass = screen.getByRole('button').className
    rerender(
      <Button variant="outline" className="">
        Outline
      </Button>,
    )
    const outlineClass = screen.getByRole('button').className
    expect(outlineClass).not.toBe(defaultClass)
    expect(outlineClass).toContain('border')
  })

  it('asChild ส่งพฤติกรรมปุ่มต่อให้ child', () => {
    const onClick = vi.fn()
    render(
      <Button asChild onClick={onClick}>
        <a href="/x">Go</a>
      </Button>,
    )
    fireEvent.click(screen.getByRole('link', { name: 'Go' }))
    expect(onClick).toHaveBeenCalled()
  })
})
