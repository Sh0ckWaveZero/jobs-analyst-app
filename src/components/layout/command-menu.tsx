import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Bell,
  FileChartColumn,
  LayoutDashboard,
  Search,
  Settings,
  UsersRound,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: LayoutDashboard },
  { to: '/reports', label: 'Reports', icon: FileChartColumn },
  { to: '/users', label: 'Users', icon: UsersRound },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

/** ⌘K / Ctrl+K search กระโดดไปหน้าต่างๆ ในแอป */
export function CommandMenu() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  function go(to: (typeof NAV_ITEMS)[number]['to']) {
    setOpen(false)
    void navigate({ to })
  }

  return (
    <>
      <Button
        variant="outline"
        className="h-8 w-56 justify-between px-3 text-sm text-muted-foreground font-normal"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2">
          <Search className="size-4" />
          Search...
        </span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span>⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search">
        <CommandInput placeholder="ไปที่หน้า…" />
        <CommandList>
          <CommandEmpty>ไม่พบผลลัพธ์</CommandEmpty>
          <CommandGroup heading="Pages">
            {NAV_ITEMS.map((item) => (
              <CommandItem key={item.to} onSelect={() => go(item.to)}>
                <item.icon />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}

/** ยังไม่มีระบบแจ้งเตือนจริง — แสดง empty state ตรงๆ แทนการโชว์ตัวเลขปลอม */
export function NotificationsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem disabled className="justify-center text-muted-foreground">
          ยังไม่มีการแจ้งเตือน
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
