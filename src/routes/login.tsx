import { useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { authClient } from '@/features/auth/auth-client'
import { getSession } from '@/features/auth/auth.functions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    // ล็อกอินอยู่แล้ว → เข้าแอปทันที
    const session = await getSession()
    if (session) throw redirect({ to: '/' })
  },
  component: LoginPage,
})

const loginFormSchema = z.object({
  name: z.string().trim().max(80).optional(),
  email: z.string().trim().min(1, 'Email is required').email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type LoginFormValues = z.infer<typeof loginFormSchema>

function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { name: '', email: '', password: '' },
  })

  async function onSubmit(values: LoginFormValues) {
    try {
      if (mode === 'signup') {
        const { error: signUpError } = await authClient.signUp.email({
          email: values.email,
          password: values.password,
          name: values.name?.trim() || values.email,
        })
        if (signUpError)
          throw new Error(signUpError.message ?? 'Sign up failed')
      } else {
        const { error: signInError } = await authClient.signIn.email({
          email: values.email,
          password: values.password,
        })
        if (signInError)
          throw new Error(signInError.message ?? 'Sign in failed')
      }
      await navigate({ to: '/' })
    } catch (err) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Something went wrong',
      })
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            JA
          </div>
          <div>
            <h1 className="font-semibold tracking-tight">
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </h1>
            <p className="text-xs text-muted-foreground">Jobs Analysis</p>
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-3"
            noValidate
          >
            {mode === 'signup' && (
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your name"
                        autoComplete="name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete={
                        mode === 'signin' ? 'current-password' : 'new-password'
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}

            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="mt-1 w-full"
            >
              {form.formState.isSubmitting
                ? '…'
                : mode === 'signin'
                  ? 'Sign in'
                  : 'Create account'}
            </Button>
          </form>
        </Form>

        <Separator className="my-5" />
        <p className="text-center text-sm text-muted-foreground">
          {mode === 'signin' ? (
            <>
              No account?{' '}
              <button
                type="button"
                className="font-medium text-foreground underline underline-offset-4"
                onClick={() => {
                  setMode('signup')
                  form.clearErrors()
                }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                className="font-medium text-foreground underline underline-offset-4"
                onClick={() => {
                  setMode('signin')
                  form.clearErrors()
                }}
              >
                Sign in
              </button>
            </>
          )}
        </p>
        <p className="mt-4 text-center text-xs text-muted-foreground/70">
          Demo: admin@pm.local / manager@pm.local / member@pm.local
          <br />
          password: password123
        </p>
      </div>
    </div>
  )
}
