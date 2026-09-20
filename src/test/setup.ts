import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

import '@testing-library/jest-dom/vitest'

// vitest globals ปิดอยู่ RTL เลย cleanup เองไม่ได้ — ต้องเรียก explicit
afterEach(cleanup)

// stub matchMedia ให้ทุก test พฤติกรรมเดียวกัน (sidebar/use-mobile)
// test ที่ต้องการ matchMedia จริง override ทับหลังจากนี้ได้
window.matchMedia = (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }) as ReturnType<typeof window.matchMedia>
