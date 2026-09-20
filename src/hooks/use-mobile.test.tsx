import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import { useIsMobile } from './use-mobile'

function setWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  })
}

describe('useIsMobile', () => {
  it('true เมื่อ viewport แคบกว่า 768', () => {
    setWidth(500)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('false เมื่อ viewport กว้าง', () => {
    setWidth(1280)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('เปลี่ยนค่าเมื่อ media query ถูก trigger', () => {
    setWidth(1280)
    const listeners: Array<() => void> = []
    const realMatchMedia = window.matchMedia.bind(window)
    window.matchMedia = ((query: string) => {
      const mql = realMatchMedia(query)
      return {
        ...mql,
        addEventListener: (_: string, cb: () => void) => listeners.push(cb),
        removeEventListener: () => {},
      }
    }) as unknown as typeof window.matchMedia

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    setWidth(375)
    act(() => listeners.forEach((cb) => cb()))
    expect(result.current).toBe(true)
  })
})
