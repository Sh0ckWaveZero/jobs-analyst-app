import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Info, Timer } from 'lucide-react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

import { formatDuration, parseDuration } from '@/lib/duration'
import { addManualEntry } from '@/features/time-entries/time-entries.functions'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const durationMessage = 'รูปแบบไม่ถูกต้อง เช่น 2w 4d 6h 45m'

const logWorkFormSchema = z.object({
  timeSpent: z
    .string()
    .trim()
    .min(1, 'ระบุเวลาที่ใช้')
    .refine((v) => parseDuration(v) !== null, { message: durationMessage }),
  timeRemaining: z
    .string()
    .trim()
    .refine((v) => v === '' || parseDuration(v) !== null, {
      message: durationMessage,
    }),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'ระบุวันที่'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'ระบุเวลา'),
  note: z.string().max(300),
})

type LogWorkFormValues = z.infer<typeof logWorkFormSchema>

function todayInput() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

function nowTimeInput() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes(),
  ).padStart(2, '0')}`
}

function TimeTrackingBar({
  loggedMinutes,
  remainingMinutes,
}: {
  loggedMinutes: number
  remainingMinutes: number
}) {
  const total = loggedMinutes + remainingMinutes
  const percent = total > 0 ? Math.min(100, (loggedMinutes / total) * 100) : 0

  return (
    <div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
        <span>{formatDuration(loggedMinutes)} logged</span>
        <span>{formatDuration(remainingMinutes)} remaining</span>
      </div>
    </div>
  )
}

export function LogWorkDrawer({
  projectId,
  issue,
}: {
  projectId: number
  issue: {
    id: number
    key: string
    title: string
    totalMinutes?: number
    remainingEstimateMinutes?: number | null
  }
}) {
  const qc = useQueryClient()
  const create = useServerFn(addManualEntry)
  const [open, setOpen] = useState(false)
  // true เมื่อผู้ใช้แก้ "Time remaining" เอง — หยุด auto-sync จาก Time spent
  const remainingTouchedRef = useRef(false)

  function defaultValues(): LogWorkFormValues {
    return {
      timeSpent: '',
      timeRemaining:
        issue.remainingEstimateMinutes != null
          ? formatDuration(issue.remainingEstimateMinutes)
          : '',
      workDate: todayInput(),
      startTime: nowTimeInput(),
      note: '',
    }
  }

  const form = useForm<LogWorkFormValues>({
    resolver: zodResolver(logWorkFormSchema),
    defaultValues: defaultValues(),
  })

  const timeSpent = form.watch('timeSpent')
  const timeRemaining = form.watch('timeRemaining')
  const parsedSpent = parseDuration(timeSpent)
  const parsedRemaining = timeRemaining.trim()
    ? parseDuration(timeRemaining)
    : 0

  const mut = useMutation({
    mutationFn: (values: LogWorkFormValues) => {
      const minutes = parseDuration(values.timeSpent) ?? 0
      const remaining = values.timeRemaining.trim()
        ? (parseDuration(values.timeRemaining) ?? undefined)
        : undefined
      return create({
        data: {
          projectId,
          issueId: issue.id,
          workDate: values.workDate,
          startTime: values.startTime,
          minutes,
          note: values.note.trim() ? values.note.trim() : undefined,
          remainingEstimateMinutes: remaining,
        },
      })
    },
    onSuccess: (_data, values) => {
      setOpen(false)
      qc.invalidateQueries({ queryKey: queryKeys.root })
      toast.success(
        `บันทึกเวลา ${formatDuration(parseDuration(values.timeSpent) ?? 0)} ให้ ${issue.key} แล้ว`,
      )
    },
    onError: (err) =>
      toast.error('บันทึกเวลาไม่สำเร็จ', {
        description: err instanceof Error ? err.message : undefined,
      }),
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      remainingTouchedRef.current = false
      form.reset(defaultValues())
    }
  }

  function handleTimeSpentChange(value: string) {
    form.setValue('timeSpent', value, { shouldValidate: true })
    if (remainingTouchedRef.current) return
    if (issue.remainingEstimateMinutes == null) return
    const spent = parseDuration(value) ?? 0
    const next = Math.max(0, issue.remainingEstimateMinutes - spent)
    form.setValue('timeRemaining', formatDuration(next))
  }

  function handleTimeRemainingChange(value: string) {
    remainingTouchedRef.current = true
    form.setValue('timeRemaining', value, { shouldValidate: true })
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Log time"
            >
              <Timer className="size-4" />
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent>Log time</TooltipContent>
      </Tooltip>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <SheetHeader className="pb-0">
          <SheetTitle>Time tracking</SheetTitle>
          <SheetDescription>
            {issue.key} · {issue.title}
          </SheetDescription>
        </SheetHeader>

        <div className="px-4">
          <TimeTrackingBar
            loggedMinutes={(issue.totalMinutes ?? 0) + (parsedSpent ?? 0)}
            remainingMinutes={parsedRemaining ?? 0}
          />
        </div>

        <Form {...form}>
          <form
            className="flex flex-col gap-4 px-4"
            onSubmit={form.handleSubmit((values) => mut.mutate(values))}
            noValidate
          >
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="timeSpent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time spent</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="4h 30m"
                        {...field}
                        onChange={(e) => handleTimeSpentChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="timeRemaining"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      Time remaining
                      <span
                        title="ค่านี้จะบันทึกเป็นเวลาคงเหลือใหม่ของ issue นี้"
                      >
                        <Info
                          className="size-3 text-muted-foreground"
                          aria-hidden="true"
                        />
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="2h 30m"
                        {...field}
                        onChange={(e) =>
                          handleTimeRemainingChange(e.target.value)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="-mt-2 text-xs text-muted-foreground">
              <p>Use the format: 2w 4d 6h 45m</p>
              <ul className="mt-1 list-disc pl-4">
                <li>w = weeks</li>
                <li>d = days</li>
                <li>h = hours</li>
                <li>m = minutes</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="workDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date started</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="อะไรที่ทำในช่วงเวลานี้"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root && (
              <p className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}
            <div className="flex gap-2 pb-4">
              <Button type="submit" disabled={mut.isPending}>
                Save
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
