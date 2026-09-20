import * as React from 'react'
import { cn } from 'cn'

const CHECK_PATH = 'M1 5.52L3.92 9.17L9.17 1'

type CheckboxProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onChange'
> & {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

/** Checkbox แบบ button เพื่อให้ keyboard, screen reader และ check animation ใช้ร่วมกัน */
function Checkbox({
  checked = false,
  onCheckedChange,
  className,
  disabled,
  ...props
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      data-state={checked ? 'checked' : 'unchecked'}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        't-check flex size-5 shrink-0 items-center justify-center rounded-md border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        checked
          ? 'border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
          : 'border-input bg-background shadow-xs hover:bg-muted/50',
        className,
      )}
      {...props}
    >
      <svg viewBox="0 0 10.1668 10.1668" className="size-3.5" fill="none">
        <path
          d={CHECK_PATH}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      </svg>
    </button>
  )
}

export { Checkbox }
