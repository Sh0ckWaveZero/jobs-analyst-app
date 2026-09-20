# คู่มือการทดสอบระบบ (Testing Guide)

คู่มือฉบับนี้อธิบายแนวทาง กลยุทธ์ และเครื่องมือในการเขียน Unit & Component Tests ในโปรเจกต์ `jobs-analysis` ด้วย **Vitest** และ **React Testing Library**

---

## 1. เครื่องมือและภาพรวมการทดสอบ

- **Test Runner:** [Vitest](https://vitest.dev/) (รันผ่าน Bun)
- **DOM Environment:** `happy-dom` (เลือกใช้แทน `jsdom` เนื่องจาก `jsdom` มีปัญหาเมื่อรันบน Bun runtime)
- **Assertion & UI Testing:** `@testing-library/react` + `@testing-library/jest-dom`
- **Coverage Provider:** `@vitest/coverage-v8` (เกณฑ์กำหนดไว้ที่ 90% ทุกด้าน)
- **Configuration File:** [`vitest.config.ts`](file:///Users/sh0ckpro/Works/Freelance/Bun/jobs-analysis/vitest.config.ts)
- **Setup File:** [`src/test/setup.ts`](file:///Users/sh0ckpro/Works/Freelance/Bun/jobs-analysis/src/test/setup.ts)

---

## 2. คำสั่งหลักในการรัน Test

```bash
# 1. รันการทดสอบทั้งหมดรอบเดียว
bun run test

# 2. รันในโหมด Watch (รันทดสอบซ้ำอัตโนมัติเมื่อแก้ไฟล์)
bun run test:watch

# 3. รันเพื่อตรวจวัด Test Coverage
bun run test:coverage
```

---

## 3. ขอบเขตการทดสอบและข้อยกเว้น (Coverage Strategy)

ใน [`vitest.config.ts`](file:///Users/sh0ckpro/Works/Freelance/Bun/jobs-analysis/vitest.config.ts) มีการกำหนดรายการไฟล์ที่ยกเว้นจากการคำนวณ Coverage ไว้อย่างชัดเจน:

| ไฟล์ที่ยกเว้น                        | เหตุผล                                                                                           |
| :----------------------------------- | :----------------------------------------------------------------------------------------------- |
| `src/routeTree.gen.ts`               | เป็น Generated file ห้ามแก้ไขด้วยมือ จึงไม่ต้องเขียน test                                        |
| `src/db/**` และ `src/**/*.server.ts` | เป็นชั้น Server ที่ต้องต่อกับ PostgreSQL จริง ซึ่งควรทดสอบด้วย Integration/E2E ไม่ใช่ Unit Test  |
| `src/**/*.functions.ts`              | เป็น Wrapper บาง ๆ ของ `createServerFn` ที่ไม่มี logic นอกเหนือจากการเรียก server implementation |
| `src/routes/api/**`                  | เป็นจุดส่งต่อ request ให้กับ handler ของ Better Auth                                             |
| `src/components/ui/**`               | เป็น Shadcn Primitives ที่ผ่านการทดสอบมาจากต้นทาง และถูกทดสอบทางอ้อมผ่าน Feature Pages อยู่แล้ว  |

**เป้าหมายการทดสอบหลัก:** เน้นที่ **Client Pages (`src/features/**/*-page.tsx`)**, **Route Loaders**, **Hooks**, และ **Business Logic Helpers**

---

## 4. รูปแบบการเขียน Test ในโปรเจกต์

### 1. การทดสอบ Component ที่ใช้ TanStack Query และ Server Functions

เมื่อทดสอบ Page Component ที่เรียก `useServerFn` ให้ mock ฟังก์ชัน server function เหล่านั้น เพื่อให้ผลลัพธ์แน่นอนและไม่ต้องพึ่งพาเซิร์ฟเวอร์จริง:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ProjectsPage } from './projects-page'

// Mock Server Function
vi.mock('./projects.functions', () => ({
  getProjects: vi.fn().mockResolvedValue({
    projects: [
      {
        id: 1,
        key: 'PROJ',
        name: 'Demo Project',
        openIssues: 3,
        totalMinutes: 120,
      },
    ],
  }),
}))

// Mock Auth Session
vi.mock('@/features/auth/auth-client', () => ({
  authClient: {
    useSession: () => ({
      data: { user: { id: 'user-1', name: 'Admin', role: 'admin' } },
      isPending: false,
    }),
  },
}))

describe('ProjectsPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  it('แสดงชื่อโปรเจกต์เมื่อโหลดข้อมูลสำเร็จ', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProjectsPage />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('Demo Project')).toBeInTheDocument()
      expect(screen.getByText('PROJ')).toBeInTheDocument()
    })
  })
})
```

---

### 2. การทดสอบ Route Loaders

ไฟล์ route มีหน้าที่ prefetch ข้อมูลลงใน QueryClient สามารถเขียน test เพื่อตรวจว่า loader สั่ง query ด้วย queryKey ที่ถูกต้องหรือไม่ (ดูตัวอย่างใน `src/routes/loaders.test.tsx`):

```tsx
import { describe, it, expect, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { Route as ProjectsRoute } from './_app/projects.index'
import { queryKeys } from '@/lib/query-keys'

describe('Projects Route Loader', () => {
  it('ต้องสั่ง query ด้วย queryKeys.projects', async () => {
    const qc = new QueryClient()
    const querySpy = vi.spyOn(qc, 'query')

    // เรียกฟังก์ชัน loader โดยจำลอง Context
    await ProjectsRoute.options.loader?.({
      context: { queryClient: qc },
      params: {},
      search: {},
      location: {} as any,
    } as any)

    expect(querySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: queryKeys.projects,
      }),
    )
  })
})
```

---

## 5. การตั้งค่าสภาพแวดล้อมจำลอง ([`src/test/setup.ts`](file:///Users/sh0ckpro/Works/Freelance/Bun/jobs-analysis/src/test/setup.ts))

- **Auto Cleanup:** รัน `cleanup()` จาก `@testing-library/react` หลังจบแต่ละ test case
- **MatchMedia Stub:** มีการ stub `window.matchMedia` ไว้ล่วงหน้า เพื่อให้คอมโพเนนต์ Responsive และ Sidebar ทำงานได้ปกติบน Happy DOM โดยไม่โยน error

---

## 6. ข้อควรระวัง (Best Practices)

1. **ห้ามยิง Network จริง:** ทุก unit test ต้องจำลอง server responses เสมอ เพื่อให้รันได้รวดเร็วและไม่กระทบข้อมูลจริง
2. **สร้าง QueryClient ใหม่ทุก test case:** สร้าง `new QueryClient()` ใน `beforeEach` เสมอ เพื่อป้องกันไม่ให้ cache ข้ามกันระหว่างแต่ละการทดสอบ
3. **ใช้ Screen queries เชิง Semantic:** สนับสนุนการใช้ `getByRole`, `getByLabelText` หรือ `getByText` แทนการใช้ class name หรือ id เพื่อให้ใกล้เคียงกับพฤติกรรมของผู้ใช้จริง
