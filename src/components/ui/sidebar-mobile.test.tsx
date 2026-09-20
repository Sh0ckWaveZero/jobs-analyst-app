import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from './sidebar'

// บังคับฝั่ง mobile เพื่อครอบ branch ที่ render Sheet แทน div
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => true }))

describe('Sidebar (mobile)', () => {
  it('render ใน Sheet และเปิดผ่าน trigger', () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>Mobile header</SidebarHeader>
          <SidebarContent>เนื้อหา</SidebarContent>
        </Sidebar>
        <SidebarTrigger />
      </SidebarProvider>,
    )

    // ยังไม่เปิด → ไม่เห็นเนื้อหา
    expect(screen.queryByText('Mobile header')).not.toBeInTheDocument()

    const trigger = screen
      .getAllByRole('button', { name: 'Toggle Sidebar' })
      .find((el) => el.getAttribute('data-sidebar') === 'trigger') as HTMLElement
    fireEvent.click(trigger)

    expect(screen.getByText('Mobile header')).toBeInTheDocument()
    expect(screen.getByText('เนื้อหา')).toBeInTheDocument()
  })
})
