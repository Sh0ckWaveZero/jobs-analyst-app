import * as React from 'react'
import { Toaster as Sonner } from 'sonner'
import type { ToasterProps } from 'sonner'
import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react'

// แยกสีไอคอนตามประเภท action — toast ยังคงโทน neutral เหมือนเดิม
const toastIcons: ToasterProps['icons'] = {
  success: (
    <CircleCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
  ),
  error: <CircleX className="size-4 text-destructive" />,
  warning: (
    <TriangleAlert className="size-4 text-amber-500 dark:text-amber-400" />
  ),
  info: <Info className="size-4 text-blue-500 dark:text-blue-400" />,
}

function Toaster({ position = 'top-right', ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      position={position}
      icons={toastIcons}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
