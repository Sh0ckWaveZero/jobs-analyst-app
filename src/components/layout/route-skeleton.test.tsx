import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'

import { RouteSkeleton } from './route-skeleton'

describe('RouteSkeleton', () => {
  it('render โครงหน้าพร้อม aria-busy และ skeleton blocks', () => {
    const { container } = render(<RouteSkeleton />)
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })
})
