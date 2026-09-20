'use client'

import * as React from 'react'
import { Command as CommandPrimitive } from 'cmdk'
import { cn } from 'cn'
import { SearchIcon } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground',
        className,
      )}
      {...props}
    />
  )
}

function CommandDialog({
  title = 'Command Palette',
  description = 'Search for a command to run...',
  children,
  className,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof Dialog> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className={cn('overflow-hidden p-0', className)}
        showCloseButton={showCloseButton}
      >
        <Command className="**:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

type CommandInputProps = React.ComponentProps<typeof CommandPrimitive.Input> & {
  clearable?: boolean
}

function readMotionNumber(name: string, fallback: number) {
  const value = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(name),
  )
  return Number.isFinite(value) ? value : fallback
}

function cubicBezier(value: string) {
  const match = value.match(
    /cubic-bezier\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/,
  )
  if (!match) return (t: number) => t

  const [x1 = 0, y1 = 0, x2 = 0, y2 = 0] = match.slice(1).map(Number)
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by

  return (t: number) => {
    if (t <= 0) return 0
    if (t >= 1) return 1

    let s = t
    for (let i = 0; i < 8; i += 1) {
      const dx = ((ax * s + bx) * s + cx) * s - t
      const derivative = (3 * ax * s + 2 * bx) * s + cx
      if (Math.abs(dx) < 1e-6 || derivative === 0) break
      s -= dx / derivative
    }

    return ((ay * s + by) * s + cy) * s
  }
}

function buildClearGlow(
  text: string,
  input: HTMLInputElement,
  wrap: HTMLElement,
) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (context) context.font = getComputedStyle(input).font

  const measure = (segment: string) =>
    context?.measureText(segment).width ?? segment.length * 7
  const isDark = document.documentElement.classList.contains('dark')
  const rgb = isDark ? '255,255,255' : '0,0,0'
  const width = wrap.clientWidth || 280
  const inputStyles = getComputedStyle(input)
  const padLeft = Number.parseFloat(inputStyles.paddingLeft) || 0
  const spread = readMotionNumber('--glow-spread', 1.5)
  const layers: string[] = []
  let x = 0

  text.split(/(\s+)/).forEach((segment) => {
    const segmentWidth = measure(segment)
    if (segment.trim()) {
      const center = padLeft + x + segmentWidth / 2
      const halfWidth = Math.max(segmentWidth * 0.45, 8) * spread
      ;[
        [0, 0.8, 7, 0.22],
        [halfWidth * 0.45, 0.55, 8, 0.18],
        [-halfWidth * 0.4, 0.65, 6, 0.16],
        [halfWidth * 0.15, 0.9, 5, 0.14],
      ].forEach(
        ([offset = 0, radiusWidth = 0, radiusHeight = 0, opacity = 0]) => {
          const left = (((center + offset) / width) * 100).toFixed(2)
          layers.push(
            `radial-gradient(ellipse ${Math.max(halfWidth * radiusWidth, 2).toFixed(1)}px ${radiusHeight}px at ${left}% 100%, rgba(${rgb},${opacity}), transparent)`,
          )
        },
      )
    }
    x += segmentWidth
  })

  return layers.join(', ')
}

function CommandInput({
  className,
  clearable = false,
  defaultValue,
  disabled,
  onValueChange,
  placeholder,
  value,
  ...props
}: CommandInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const clearWrapRef = React.useRef<HTMLDivElement>(null)
  const mirrorRef = React.useRef<HTMLDivElement>(null)
  const placeholderRef = React.useRef<HTMLDivElement>(null)
  const glowRef = React.useRef<HTMLDivElement>(null)
  const frameRef = React.useRef<number | null>(null)
  const [internalValue, setInternalValue] = React.useState(
    typeof value === 'string'
      ? value
      : typeof defaultValue === 'string'
        ? defaultValue
        : '',
  )
  const [clearing, setClearing] = React.useState(false)
  const [clearingText, setClearingText] = React.useState('')
  const inputValue = value ?? internalValue

  React.useEffect(
    () => () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
    },
    [],
  )

  const handleValueChange = (nextValue: string) => {
    if (value === undefined) setInternalValue(nextValue)
    onValueChange?.(nextValue)
  }

  const clearWithAnimation = React.useCallback(() => {
    const input = inputRef.current
    const wrap = clearWrapRef.current
    const mirror = mirrorRef.current
    const clearPlaceholder = placeholderRef.current
    const glow = glowRef.current

    if (!input || !wrap || !mirror || !clearPlaceholder || !glow) return
    if (clearing || !inputValue) return

    const text = inputValue
    const keepFocus = document.activeElement === input
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    setClearingText(text)
    setClearing(true)
    if (value === undefined) setInternalValue('')
    onValueChange?.('')

    if (reducedMotion) {
      setClearing(false)
      setClearingText('')
      if (keepFocus) input.focus({ preventScroll: true })
      return
    }

    const total = readMotionNumber('--clear-dur', 1000)
    const outDuration = readMotionNumber('--clear-out-dur', 400)
    const inDuration = readMotionNumber('--clear-in-dur', 400)
    const outFly = readMotionNumber('--clear-out-fly', 12)
    const inFly = readMotionNumber('--clear-in-fly', 12)
    const blur = readMotionNumber('--clear-blur', 2)
    const glowDelay = readMotionNumber('--glow-delay', 50)
    const glowPeakAt = readMotionNumber('--glow-peak-at', 0.15)
    const glowOpacity = readMotionNumber('--glow-opacity', 0.42)
    const rootStyles = getComputedStyle(document.documentElement)
    const easeOut = cubicBezier(rootStyles.getPropertyValue('--clear-out-ease'))
    const easeIn = cubicBezier(rootStyles.getPropertyValue('--clear-in-ease'))

    mirror.textContent = text.replace(/ /g, '\u00a0')
    glow.style.background = buildClearGlow(text, input, wrap)
    glow.style.opacity = '0'
    clearPlaceholder.style.transform = `translateY(-${inFly}px)`
    clearPlaceholder.style.opacity = '0.9'
    clearPlaceholder.style.filter = `blur(${blur}px)`

    const startedAt = performance.now()
    const tick = (now: number) => {
      const elapsed = now - startedAt
      const outProgress = easeOut(Math.min(1, elapsed / outDuration))
      mirror.style.transform = `translateY(${(outProgress * outFly).toFixed(1)}px)`
      mirror.style.opacity = (1 - outProgress).toFixed(3)
      mirror.style.filter = `blur(${(outProgress * blur).toFixed(1)}px)`

      const inProgress = easeIn(Math.min(1, elapsed / inDuration))
      clearPlaceholder.style.transform = `translateY(${(-inFly + inProgress * inFly).toFixed(1)}px)`
      clearPlaceholder.style.opacity = (0.9 + inProgress * 0.1).toFixed(3)
      clearPlaceholder.style.filter = `blur(${(blur - inProgress * blur).toFixed(1)}px)`

      let glowProgress = 0
      if (elapsed > glowDelay) {
        const progress = Math.min(
          1,
          (elapsed - glowDelay) / Math.max(1, total - glowDelay),
        )
        glowProgress =
          progress < glowPeakAt
            ? progress / glowPeakAt
            : 1 - (progress - glowPeakAt) / (1 - glowPeakAt)
      }
      glow.style.opacity = (glowProgress * glowOpacity).toFixed(3)

      if (elapsed < total) {
        frameRef.current = requestAnimationFrame(tick)
        return
      }

      frameRef.current = null
      mirror.style.cssText = ''
      clearPlaceholder.style.cssText = ''
      glow.style.opacity = '0'
      glow.style.background = ''
      setClearing(false)
      setClearingText('')
      if (keepFocus) {
        requestAnimationFrame(() => input.focus({ preventScroll: true }))
      }
    }

    frameRef.current = requestAnimationFrame(tick)
  }, [clearing, inputValue, onValueChange, value])

  const keepInputFocus = (
    event:
      | React.MouseEvent<HTMLButtonElement>
      | React.PointerEvent<HTMLButtonElement>,
  ) => {
    if (document.activeElement === inputRef.current) event.preventDefault()
  }

  if (!clearable) {
    return (
      <div
        data-slot="command-input-wrapper"
        className="flex h-9 items-center gap-2 border-b px-3"
      >
        <SearchIcon className="size-4 shrink-0 opacity-50" />
        <CommandPrimitive.Input
          ref={inputRef}
          data-slot="command-input"
          className={cn(
            'flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          placeholder={placeholder}
          disabled={disabled}
          onValueChange={onValueChange}
          value={value}
          defaultValue={defaultValue}
          {...props}
        />
      </div>
    )
  }

  return (
    <div
      data-slot="command-input-wrapper"
      className="flex h-9 items-center gap-2 border-b px-3"
    >
      <SearchIcon className="size-4 shrink-0 opacity-50" />
      <div
        ref={clearWrapRef}
        className={cn(
          't-clear min-w-0 flex-1 text-sm',
          inputValue && 'has-value',
          clearing && 'is-clearing',
        )}
      >
        <CommandPrimitive.Input
          ref={inputRef}
          data-slot="command-input"
          className={cn(
            'relative z-1 flex h-10 w-full rounded-md bg-transparent py-3 pr-8 text-sm outline-hidden placeholder:text-transparent disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          {...props}
          disabled={disabled}
          onValueChange={handleValueChange}
          placeholder={placeholder}
          value={inputValue}
        />
        <div
          ref={mirrorRef}
          className="t-clear-mirror pr-8 text-foreground"
          aria-hidden="true"
        >
          {clearing ? clearingText.replace(/ /g, '\u00a0') : inputValue}
        </div>
        <div
          ref={placeholderRef}
          className="t-clear-placeholder pr-8 text-muted-foreground"
          aria-hidden="true"
        >
          {placeholder}
        </div>
        <div ref={glowRef} className="t-clear-glow" aria-hidden="true" />
        <button
          type="button"
          className="t-clear-btn rounded-sm text-muted-foreground outline-hidden hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="ล้างการค้นหา"
          disabled={disabled || !inputValue || clearing}
          tabIndex={inputValue && !clearing ? 0 : -1}
          onPointerDown={keepInputFocus}
          onMouseDown={keepInputFocus}
          onClick={clearWithAnimation}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        'max-h-75 scroll-py-1 overflow-x-hidden overflow-y-auto',
        className,
      )}
      {...props}
    />
  )
}

function CommandEmpty({
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className="py-6 text-center text-sm"
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        'overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn('-mx-1 h-px bg-border', className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
        className,
      )}
      {...props}
    />
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        'ml-auto text-xs tracking-widest text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
