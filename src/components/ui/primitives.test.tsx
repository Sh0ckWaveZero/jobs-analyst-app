import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { Label } from './label'
import { Separator } from './separator'
import { Skeleton } from './skeleton'
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from './avatar'

describe('Label', () => {
  it('แสดงข้อความและผูกกับ input ผ่าน htmlFor', () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <input id="email" />
      </>,
    )
    expect(screen.getByText('Email')).toHaveAttribute('for', 'email')
  })
})

describe('Separator', () => {
  it('แนวนอน (default) และแนวตั้ง', () => {
    const { rerender } = render(<Separator />)
    expect(screen.getByRole('none')).toBeInTheDocument()
    rerender(<Separator orientation="vertical" />)
    expect(screen.getByRole('none')).toHaveAttribute(
      'data-orientation',
      'vertical',
    )
  })
})

describe('Skeleton', () => {
  it('render โครง loading', () => {
    render(<Skeleton data-testid="sk" />)
    expect(screen.getByTestId('sk')).toHaveAttribute('data-slot', 'skeleton')
  })
})

describe('Avatar', () => {
  it('แสดง fallback initials เมื่อไม่มีรูป', () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.invalid/x.png" />
        <AvatarFallback>SA</AvatarFallback>
      </Avatar>,
    )
    expect(screen.getByText('SA')).toBeInTheDocument()
  })

  it('AvatarGroup + ตัวนับจำนวน', () => {
    render(
      <AvatarGroup>
        <Avatar>
          <AvatarFallback>A</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>B</AvatarFallback>
        </Avatar>
      </AvatarGroup>,
    )
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()

    render(<AvatarGroupCount>+3</AvatarGroupCount>)
    expect(screen.getByText('+3')).toBeInTheDocument()
  })

  it('AvatarBadge render ได้', () => {
    render(
      <Avatar>
        <AvatarFallback>SA</AvatarFallback>
        <AvatarBadge>ON</AvatarBadge>
      </Avatar>,
    )
    expect(screen.getByText('ON')).toBeInTheDocument()
  })
})
