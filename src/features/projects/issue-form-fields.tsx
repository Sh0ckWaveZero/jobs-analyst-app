import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// แชร์ field blocks ที่ New issue / Edit issue ใช้ซ้ำกัน
// (react-doctor: duplicate-jsx-subtree)

type SelectField = {
  value: string
  onChange: (value: string) => void
}

// สอดคล้องกับ field ของ react-hook-form ที่ spread ลง <Input> ได้ตรง ๆ
type InputField = {
  value: string
  name: string
  onChange: React.ChangeEventHandler<HTMLInputElement>
  onBlur: React.FocusEventHandler<HTMLInputElement>
}

export function IssueTitleField({ field }: { field: InputField }) {
  return (
    <FormItem>
      <FormLabel>Title</FormLabel>
      <FormControl>
        <Input placeholder="What needs to be done?" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )
}

export function IssuePriorityField({ field }: { field: SelectField }) {
  return (
    <FormItem>
      <FormLabel>Priority</FormLabel>
      <Select value={field.value} onValueChange={field.onChange}>
        <FormControl>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="low">low</SelectItem>
          <SelectItem value="medium">medium</SelectItem>
          <SelectItem value="high">high</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )
}

export function IssueAssigneeField({
  field,
  users,
}: {
  field: SelectField
  users: Array<{ id: string; name: string }>
}) {
  return (
    <FormItem>
      <FormLabel>Assignee</FormLabel>
      <Select value={field.value || 'none'} onValueChange={field.onChange}>
        <FormControl>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="none">Unassigned</SelectItem>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )
}

export function IssueDueDateField({ field }: { field: SelectField }) {
  return (
    <FormItem>
      <FormLabel>Due date</FormLabel>
      <FormControl>
        <DatePicker value={field.value} onChange={field.onChange} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )
}

export function IssueLabelsField({ field }: { field: InputField }) {
  return (
    <FormItem>
      <FormLabel>Labels (comma)</FormLabel>
      <FormControl>
        <Input placeholder="frontend, api" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )
}
