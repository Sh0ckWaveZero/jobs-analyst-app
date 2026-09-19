import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'

import type { auth } from './auth.server'

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
})

export type ClientSession = typeof authClient.$Infer.Session
