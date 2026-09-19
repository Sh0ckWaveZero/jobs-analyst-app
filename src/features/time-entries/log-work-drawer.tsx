import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Timer } from 'lucide-react'
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
import { Input } from '@/components/ui/input'

const logWorkFormSchema = z.object({
  timeSpent: z
    .string()
    .trim()
    .min(1, 'ระบุเวลาที่ใช้')
    .refine((v) => parseDuration(v) !== null, {
      message: 'รูปแบบไม่ถูกต้อง เช่น 1h 45m, 1:45 หรือ 90 (นาที)',
    }),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'ระบุวันที่'),
  note: z.string().max(300),
})

type LogWorkFormValues = z.infer<typeof logWorkFormSchema>

function todayInput() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

export function LogWorkDrawer({
  projectId,
  issue,
}: {
  projectId: number
  issue: { id: number; key: string; title: string }
}) {
  const qc = useQueryClient()
  const create = useServerFn(addManualEntry)
  const [open, setOpen] = useState(false)

  const form = useForm<LogWorkFormValues>({
    resolver: zodResolver(logWorkFormSchema),
    defaultValues: { timeSpent: '', workDate: todayInput(), note: '' },
  })

  const timeSpent = form.watch('timeSpent')
  const parsedMinutes = parseDuration(timeSpent)

  const mut = useMutation({
    mutationFn: (values: LogWorkFormValues) =>
      create({
        data: {
          projectId,
          issueId: issue.id,
          workDate: values.workDate,
          minutes: parseDuration(values.timeSpent) ?? 0,
          note: values.note.trim() ? values.note.trim() : undefined,
        },
      }),
    onSuccess: (_data, values) => {
      setOpen(false)
      form.reset({ timeSpent: '', workDate: todayInput(), note: '' })
      qc.invalidateQueries({ queryKey: ['pm'] })
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
    if (next) form.reset({ timeSpent: '', workDate: todayInput(), note: '' })
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
          <Timer className="size-3.5" /> Log
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-6 overflow-y-auto sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle>Log work</SheetTitle>
          <SheetDescription>
            {issue.key} · {issue.title}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            className="flex flex-col gap-4 px-4"
            onSubmit={form.handleSubmit((values) => mut.mutate(values))}
            noValidate
          >
            <FormField
              control={form.control}
              name="timeSpent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time spent</FormLabel>
                  <FormControl>
                    <Input placeholder="1h 45m" {...field} />
                  </FormControl>
                  {timeSpent.trim() !== '' && (
                    <p className="text-xs text-muted-foreground">
                      {parsedMinutes !== null
                        ? `= ${formatDuration(parsedMinutes)} (${parsedMinutes} นาที)`
                        : 'ยังอ่านค่าไม่ได้ — ลอง 1h 45m, 1:45 หรือ 90'}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="workDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="อะไรที่ทำในช่วงเวลานี้" {...field} />
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
                Log work
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
