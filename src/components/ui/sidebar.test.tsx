
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, renderHook, screen } from '@testing-library/react'
import { Plus } from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from './sidebar'

function TestApp() {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" data-testid="sidebar">
        <SidebarHeader>Workspace</SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Projects</SidebarGroupLabel>
            <SidebarGroupAction title="Add project">
              <Plus className="size-4" />
            </SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive tooltip="Dashboard">
                    Dashboard
                  </SidebarMenuButton>
                  <SidebarMenuBadge>3</SidebarMenuBadge>
                  <SidebarMenuAction title="Edit">
                    <Plus className="size-4" />
                  </SidebarMenuAction>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton href="/projects/16">
                        Website Revamp
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuSkeleton />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarSeparator />
          <SidebarInput placeholder="Filter…" />
        </SidebarContent>
        <SidebarFooter>Footer</SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <SidebarTrigger />
        <main>เนื้อหาหลัก</main>
      </SidebarInset>
    </SidebarProvider>
  )
}

describe('Sidebar', () => {
  it('render โครงสร้างครบทุกส่วน', () => {
    render(<TestApp />)
    expect(screen.getByText('Workspace')).toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Website Revamp')).toBeInTheDocument()
    expect(screen.getByText('Footer')).toBeInTheDocument()
    expect(screen.getByText('เนื้อหาหลัก')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Filter…')).toBeInTheDocument()
  })

  it('สถานะเริ่มต้น expanded และ toggle ผ่าน SidebarTrigger', () => {
    render(<TestApp />)
    const sidebar = document.querySelector('[data-slot="sidebar"]')
    const trigger = screen
      .getAllByRole('button', { name: 'Toggle Sidebar' })
      .find(
        (el) => el.getAttribute('data-sidebar') === 'trigger',
      ) as HTMLElement
    expect(sidebar).toHaveAttribute('data-state', 'expanded')

    fireEvent.click(trigger)
    expect(sidebar).toHaveAttribute('data-state', 'collapsed')

    fireEvent.click(trigger)
    expect(sidebar).toHaveAttribute('data-state', 'expanded')
  })

  it('toggle ผ่าน keyboard shortcut ctrl+b', () => {
    render(<TestApp />)
    const sidebar = document.querySelector('[data-slot="sidebar"]')
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true })
    expect(sidebar).toHaveAttribute('data-state', 'collapsed')
  })

  it('setOpen เขียน cookie เพื่อจำสถานะ', () => {
    render(<TestApp />)
    const trigger = screen
      .getAllByRole('button', { name: 'Toggle Sidebar' })
      .find(
        (el) => el.getAttribute('data-sidebar') === 'trigger',
      ) as HTMLElement
    fireEvent.click(trigger)
    expect(document.cookie).toContain('sidebar_state=false')
  })

  it('useSidebar นอก provider ต้อง throw', () => {
    expect(() => renderHook(() => useSidebar())).toThrow(
      /must be used within a SidebarProvider/i,
    )
  })

  it('controlled mode: onOpenChange ถูกเรียกเมื่อ toggle', () => {
    const onOpenChange = vi.fn()
    render(
      <SidebarProvider open onOpenChange={onOpenChange}>
        <Sidebar>
          <SidebarHeader>H</SidebarHeader>
        </Sidebar>
        <SidebarInset>
          <SidebarTrigger />
        </SidebarInset>
      </SidebarProvider>,
    )
    expect(
      document.querySelector('[data-slot="sidebar"]'),
    ).toHaveAttribute('data-state', 'expanded')

    const trigger = screen
      .getAllByRole('button', { name: 'Toggle Sidebar' })
      .find((el) => el.getAttribute('data-sidebar') === 'trigger') as HTMLElement
    fireEvent.click(trigger)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('collapsible="none" render แบบตรง ๆ ไม่มีกลไกยุบ', () => {
    render(
      <SidebarProvider>
        <Sidebar collapsible="none" data-testid="plain">
          <SidebarHeader>Fixed</SidebarHeader>
        </Sidebar>
      </SidebarProvider>,
    )
    const sidebar = screen.getByTestId('plain')
    expect(sidebar).toHaveAttribute('data-slot', 'sidebar')
    expect(sidebar).not.toHaveAttribute('data-state')
    expect(screen.getByText('Fixed')).toBeInTheDocument()
  })
})
