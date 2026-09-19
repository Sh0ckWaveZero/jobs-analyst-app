import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useForm } from 'react-hook-form'

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './form'

function TestForm({ onValid }: { onValid: (v: { email: string }) => void }) {
  const form = useForm<{ email: string }>({ defaultValues: { email: '' } })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onValid)}>
        <FormField
          control={form.control}
          name="email"
          rules={{ required: 'Email is required' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <input placeholder="you@example.com" {...field} />
              </FormControl>
              <FormDescription>ใช้เข้าสู่ระบบ</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <button type="submit">Submit</button>
      </form>
    </Form>
  )
}

describe('Form', () => {
  it('submit โดยไม่กรอก → แสดง error จาก FormMessage', async () => {
    const onValid = vi.fn()
    render(<TestForm onValid={onValid} />)

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() =>
      expect(screen.getByText('Email is required')).toBeInTheDocument(),
    )
    expect(onValid).not.toHaveBeenCalled()
  })

  it('กรอกค่าแล้ว submit → เรียก callback พร้อมค่าจาก field', async () => {
    const onValid = vi.fn()
    render(<TestForm onValid={onValid} />)

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'a@b.c' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() => expect(onValid).toHaveBeenCalled())
    // RHF ส่ง submit event เป็น argument ที่สอง — เช็คเฉพาะค่า form
    expect(onValid.mock.calls[0]![0]).toEqual({ email: 'a@b.c' })
    expect(screen.queryByText('Email is required')).not.toBeInTheDocument()
  })

  it('label ผูกกับ control ผ่าน aria', () => {
    render(<TestForm onValid={vi.fn()} />)
    const input = screen.getByPlaceholderText('you@example.com')
    expect(input).toHaveAttribute('id')
    expect(screen.getByText('Email')).toHaveAttribute('for', input.id)
    expect(screen.getByText('ใช้เข้าสู่ระบบ')).toBeInTheDocument()
  })
})
