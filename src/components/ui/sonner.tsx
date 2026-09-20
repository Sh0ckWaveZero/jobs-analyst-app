import * as React from 'react'
import { Toaster as Sonner } from 'sonner'
import type { ToasterProps } from 'sonner'

function Toaster({ position = 'top-right', ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      position={position}
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
