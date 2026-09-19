import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet'

describe('Sheet', () => {
  it('ปิดอยู่เห็นแค่ trigger', () => {
    render(
      <Sheet>
        <SheetTrigger asChild>
          <button>New project</button>
        </SheetTrigger>
        <SheetContent>
          <SheetTitle>Form</SheetTitle>
        </SheetContent>
      </Sheet>,
    )
    expect(screen.getByRole('button', { name: 'New project' })).toBeInTheDocument()
    expect(screen.queryByText('Form')).not.toBeInTheDocument()
  })

  it('เปิด (controlled) แสดงเนื้อหาครบทุกส่วน', () => {
    render(
      <Sheet open>
        <SheetContent side="right" data-testid="content">
          <SheetHeader>
            <SheetTitle>New project</SheetTitle>
            <SheetDescription>สร้างโปรเจกต์ใหม่</SheetDescription>
          </SheetHeader>
          Body ของ form
          <SheetFooter>
            <SheetClose asChild>
              <button>Cancel</button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>,
    )
    expect(screen.getByText('New project')).toBeInTheDocument()
    expect(screen.getByText('สร้างโปรเจกต์ใหม่')).toBeInTheDocument()
    expect(screen.getByText('Body ของ form')).toBeInTheDocument()
  })

  it('กดปุ่มใน SheetClose แล้วเรียก onOpenChange(false)', () => {
    const onOpenChange = vi.fn()
    render(
      <Sheet open onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetTitle>Form</SheetTitle>
          <SheetClose asChild>
            <button>Cancel</button>
          </SheetClose>
        </SheetContent>
      </Sheet>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
