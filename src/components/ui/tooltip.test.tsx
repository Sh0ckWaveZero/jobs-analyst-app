import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip'

function setup(open?: boolean) {
  return render(
    <TooltipProvider delayDuration={0}>
      <Tooltip open={open}>
        <TooltipTrigger asChild>
          <button>Hover me</button>
        </TooltipTrigger>
        <TooltipContent>คำใบ้</TooltipContent>
      </Tooltip>
    </TooltipProvider>,
  )
}

describe('Tooltip', () => {
  it('ปิดอยู่ (default) ไม่แสดงเนื้อหา', () => {
    setup()
    expect(screen.queryByText('คำใบ้')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hover me' })).toBeInTheDocument()
  })

  it('เปิด (controlled) แสดงเนื้อหาใน portal', () => {
    setup(true)
    expect(screen.getByText('คำใบ้')).toBeInTheDocument()
  })
})
