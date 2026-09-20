import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { Badge } from './badge'
import { badgeVariants } from './variants'

describe('Badge', () => {
  it('แสดง children', () => {
    render(<Badge>design</Badge>)
    expect(screen.getByText('design')).toBeInTheDocument()
  })

  it('variant เปลี่ยนคลาส', () => {
    const { rerender } = render(<Badge>default</Badge>)
    const defaultClass = screen.getByText('default').className
    rerender(<Badge variant="secondary">secondary</Badge>)
    const secondaryClass = screen.getByText('secondary').className
    expect(secondaryClass).not.toBe(defaultClass)
  })

  it('badgeVariants ใช้ standalone ได้', () => {
    expect(typeof badgeVariants({ variant: 'outline' })).toBe('string')
  })

  it('asChild ส่ง props ต่อให้ child element', () => {
    render(
      <Badge asChild>
        <a href="/x">link badge</a>
      </Badge>,
    )
    const link = screen.getByRole('link', { name: 'link badge' })
    expect(link).toBeInTheDocument()
  })
})
