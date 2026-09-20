import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select'

describe('Select', () => {
  it('แสดงค่าที่เลือกไว้ใน trigger', () => {
    render(
      <Select value="a">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Option A</SelectItem>
          <SelectItem value="b">Option B</SelectItem>
        </SelectContent>
      </Select>,
    )
    expect(screen.getByText('Option A')).toBeInTheDocument()
  })

  it('แสดง placeholder เมื่อยังไม่เลือก', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Option A</SelectItem>
        </SelectContent>
      </Select>,
    )
    expect(screen.getByText('Pick one')).toBeInTheDocument()
  })

  it('defaultOpen แสดง options ใน listbox', () => {
    render(
      <Select defaultOpen>
        <SelectTrigger>
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>กลุ่ม</SelectLabel>
            <SelectItem value="a">Option A</SelectItem>
            <SelectItem value="b" disabled>
              Option B
            </SelectItem>
          </SelectGroup>
          <SelectSeparator />
        </SelectContent>
      </Select>,
    )
    expect(screen.getByRole('option', { name: 'Option A' })).toBeInTheDocument()
    expect(screen.getByText('กลุ่ม')).toBeInTheDocument()
  })

  it('เลือก option เรียก onValueChange', () => {
    const onValueChange = vi.fn()
    render(
      <Select defaultOpen onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Option A</SelectItem>
        </SelectContent>
      </Select>,
    )
    fireEvent.click(screen.getByRole('option', { name: 'Option A' }))
    expect(onValueChange).toHaveBeenCalledWith('a')
  })
})
