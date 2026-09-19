import { createServerFn } from '@tanstack/react-start'

import { getAuthSession } from './auth.server'

/** คืน session ปัจจุบันหรือ null (ใช้ใน beforeLoad / component ได้) */
export const getSession = createServerFn({ method: 'GET' }).handler(async () =>
  getAuthSession(),
)
