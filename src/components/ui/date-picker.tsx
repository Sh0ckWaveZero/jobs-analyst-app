import * as React from 'react'
import { format, parse } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { cn } from 'cn'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

/** value/onChange เป็นสตริง "yyyy-MM-dd" เพื่อสลับแทน <Input type="date"> ได้ตรงๆ */
export function DatePicker({
  value,
  onChange,
  placeholder = 'เลือกวันที่',
  className,
  ...props
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
} & Omit<React.ComponentProps<'button'>, 'onChange' | 'value'>) {
  const [open, setOpen] = React.useState(false)
  const selected = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !selected && 'text-muted-foreground',
            className,
          )}
          {...props}
        >
          <CalendarIcon className="size-4" />
          {selected ? format(selected, 'd MMM yyyy') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={selected}
          onSelect={(date) => {
            onChange(date ? format(date, 'yyyy-MM-dd') : '')
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
