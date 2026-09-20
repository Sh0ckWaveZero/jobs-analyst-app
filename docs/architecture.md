# Architecture

เอกสารนี้อธิบาย boundary หลักของ Jobs Analysis เพื่อให้เพิ่มหน้าและ server logic ได้โดยไม่ทำให้ file-based routing หรือ server/client separation ปะปนกัน

## Routing model

TanStack Start ใช้ไฟล์ใน `src/routes` เป็น source ของ routes:

- `src/routes/__root.tsx` เป็น root route และ document shell ของทั้งแอป รวม `HeadContent`, `Scripts`, `QueryClientProvider` และ not-found page
- `src/routes/_app/route.tsx` เป็น **pathless layout** ชื่อขึ้นต้นด้วย `_` จึงไม่ปรากฏใน URL แต่ครอบทุกหน้าที่อยู่ใต้โฟลเดอร์นี้ด้วย `SidebarProvider`, `AppSidebar` และ `SidebarInset`
- ไฟล์ route ใต้ `src/routes/_app` เป็น entrypoint บาง ๆ ที่ผูก public URL เข้ากับ page component ใน `src/features`
- `src/routeTree.gen.ts` เป็นไฟล์ที่ generator สร้างขึ้น ห้ามแก้ด้วยมือ ให้ใช้ `bun run generate-routes`

Public routes ปัจจุบัน:

| Public URL             | Route entrypoint               | Feature page                                                                                                                               |
| ---------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`                    | `src/routes/_app/index.tsx`    | `src/features/dashboard/dashboard-page.tsx`                                                                                                |
| `/jobs`                | `src/routes/_app/jobs.tsx`     | `src/features/jobs/jobs-page.tsx`                                                                                                          |
| `/reports`             | `src/routes/_app/reports.tsx`  | `src/features/reports/reports-page.tsx`                                                                                                    |
| `/settings`            | `src/routes/_app/settings.tsx` | `src/features/settings/settings-page.tsx`                                                                                                  |
| `/settings?tab=access` | `src/routes/_app/settings.tsx` | `src/features/settings/access-management-page.tsx` + `rbac.server.ts` (Departments และ Roles & permissions; `/access` compatibility route) |

### เพิ่ม route ใหม่

1. สร้าง route entrypoint ใน `src/routes/_app/<name>.tsx`
2. สร้าง page component ใน `src/features/<name>/<name>-page.tsx`
3. ใช้ `createFileRoute('/_app/<name>')` ใน route file ตามรูปแบบที่ generator คาดไว้
4. รัน `bun run generate-routes`
5. ตรวจ public URL โดยตรงและตรวจ navigation จากหน้าอื่น

อย่าใส่ DB query, business logic หรือ component ขนาดใหญ่ไว้ใน route entrypoint เพราะ route files ควรทำหน้าที่เชื่อม router กับ feature เท่านั้น (อ่านคู่มืออย่างละเอียดได้ที่ [`docs/routing-guide.md`](routing-guide.md))

## Feature และ server boundary

Feature ที่มี server data ใช้รูปแบบนี้:

```text
src/features/jobs/
├── jobs-page.tsx       # client-facing page component
├── jobs.functions.ts   # createServerFn wrappers ที่ route/UI import ได้
├── jobs.server.ts      # DB/business implementation ฝั่ง server เท่านั้น
├── jobs.schema.ts      # Zod input และ shared types ที่ปลอดภัยสำหรับ client
└── jobs.mock.ts        # local fixture เมื่อไม่มี DATABASE_URL
```

กติกาการ import:

- `*.functions.ts` เป็น public server-function boundary ใช้ `createServerFn` แล้วค่อยเรียก implementation จาก `*.server.ts`
- `*.server.ts` และ `client.server.ts` ห้าม import เข้า client component โดยตรง เพราะอาจดึง DB driver หรือ secret เข้า client bundle
- `*.schema.ts` ต้องเก็บเฉพาะ schema/type ที่ใช้ร่วมกันได้ ไม่ควร import DB client
- `*.mock.ts` ต้องไม่มี side effect และใช้เป็น fallback data เท่านั้น
- `src/components/ui` เก็บ primitive ที่ใช้ซ้ำได้; component ที่ผูกกับหน้าหรือ domain ให้อยู่ใต้ `src/features`
- อ่านคู่มือ Data Fetching, Server Functions และ API ฉบับละเอียดได้ที่ [`docs/data-fetching-and-server-guide.md`](data-fetching-and-server-guide.md)

## Data flow ของ Jobs

```text
route/page
  -> jobs.functions.ts (createServerFn)
  -> jobs.server.ts (business/data access)
  -> client.server.ts -> PostgreSQL
                         หรือ
                         jobs.mock.ts เมื่อไม่มี DATABASE_URL
```

`getJobs` และ `getJobStats` รองรับทั้ง DB และ mock mode ส่วน `createJob` ตั้งใจให้ทำงานเฉพาะเมื่อมี `DATABASE_URL` เพื่อไม่ให้การเขียนข้อมูลหายไปโดยไม่ตั้งใจ

## Database workflow

1. แก้ schema ที่ `src/db/schema.ts`
2. ตรวจ `DATABASE_URL` ใน `.env`
3. รัน `bun run db:generate`
4. รัน `bun run db:migrate`
5. ตรวจผลด้วย Dashboard หรือ `bun run db:studio`

`src/db/client.server.ts` สร้าง Drizzle client แบบ lazy และคืน `null` เมื่อไม่มี `DATABASE_URL`; server implementation ต้องรองรับสองโหมดนี้ให้ชัดเจน

## Verification checklist

หลังเปลี่ยน route, feature หรือ server function:

- `bun run generate-routes` เมื่อมีการเพิ่ม/ย้าย route
- `bunx tsc --noEmit`
- `bunx eslint <ไฟล์หรือโฟลเดอร์ที่แก้>`
- `bun run build`
- เปิด URL ที่เกี่ยวข้องโดยตรง แล้วทดสอบ client-side navigation
- หากมีการย้าย/ลบไฟล์ ให้ restart dev server แบบ clean ก่อนสรุปว่าเป็นปัญหา HMR หรือ request aborted

## Official references

- [TanStack Start routing](https://tanstack.com/start/latest/docs/framework/react/guide/routing)
- [TanStack Router file naming conventions](https://tanstack.com/router/latest/docs/routing/file-naming-conventions)
- [TanStack Start server functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions)
