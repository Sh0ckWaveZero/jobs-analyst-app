# Jobs Analysis

แอปจัดการงานแบบ Project Management สำหรับบันทึกและวิเคราะห์ Work Hour รายวัน พร้อมระบบ RBAC สร้างด้วย **TanStack Start** และรันบน Bun โดยรวม UI, server functions และ data access ไว้ในแอปเดียว

## Stack

- **App**: TanStack Start, TanStack Router, React, TypeScript, Vite
- **UI**: Tailwind CSS v4, shadcn/ui primitives, Radix UI, Lucide, Recharts
- **Auth**: Better Auth (email/password + session cookie)
- **Data fetching**: TanStack Query ผ่าน server functions
- **Database**: PostgreSQL + Drizzle ORM

## เริ่มใช้งาน

```bash
bun install
bun --bun run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

### Environment variables

ตั้งค่าใน `.env` (ดูรูปแบบใน `.env.example`):

| Variable             | ความหมาย                                                                 |
| -------------------- | ------------------------------------------------------------------------ |
| `DATABASE_URL`       | connection string ของ Postgres (จำเป็น — auth ต้องใช้)                   |
| `BETTER_AUTH_SECRET` | secret อย่างน้อย 32 ตัวอักษร (เช่น output ของ `openssl rand -base64 32`) |
| `BETTER_AUTH_URL`    | base URL ของแอป เช่น `http://localhost:3000`                             |

### ต่อ PostgreSQL + seed

```bash
cp .env.example .env
# แก้ DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL ให้ตรงกับเครื่อง
docker compose up -d
bun run db:migrate
bun run db:seed
```

บัญชี demo หลัง seed (password ทั้งหมด: `password123`):

| Email              | Role    | สิทธิ์                                                                  |
| ------------------ | ------- | ----------------------------------------------------------------------- |
| `admin@pm.local`   | admin   | จัดการได้ทุกอย่าง, เห็นชั่วโมงทุกคน                                     |
| `manager@pm.local` | manager | จัดการโปรเจกต์/issue ที่ตัวเองเป็นเจ้าของ, ดูชั่วโมงทีมในโปรเจกต์ตัวเอง |
| `member@pm.local`  | member  | บันทึก/แก้ time entry ของตัวเอง, ดู analytics ของตัวเอง                 |

## Routes

| URL             | Route file                                | หน้าที่                                                 |
| --------------- | ----------------------------------------- | ------------------------------------------------------- |
| `/login`        | `src/routes/login.tsx`                    | Sign in / Sign up                                       |
| `/`             | `src/routes/_app/index.tsx`               | Dashboard (Work Hour Analysis, Time Tracker, My Issues) |
| `/projects`     | `src/routes/_app/projects.index.tsx`      | รายการโปรเจกต์ + สร้างโปรเจกต์                          |
| `/projects/$id` | `src/routes/_app/projects.$projectId.tsx` | Issues ของโปรเจกต์ + Log Work + Time tracking           |
| `/reports`      | `src/routes/_app/reports.tsx`             | รายงานชั่วโมงทำงานต่อคนต่อโปรเจกต์ + Export CSV         |
| `/settings`     | `src/routes/_app/settings.tsx`            | โปรไฟล์และสิทธิ์                                        |
| `/users`        | `src/routes/_app/users.tsx`               | จัดการผู้ใช้/แผนก (admin เท่านั้น)                      |
| `/api/auth/*`   | `src/routes/api/auth/$.ts`                | Better Auth handler                                     |

อธิบายวิธีใช้แต่ละหน้าแบบละเอียด (role ไหนทำอะไรได้บ้าง, Log Work ใช้ยังไง, ⌘K ค้นอะไรได้) อยู่ที่ [`docs/user-guide.md`](docs/user-guide.md)

`src/routes/_app/route.tsx` เป็น pathless layout + auth guard (redirect ไป `/login` ถ้าไม่มี session)

## โครงสร้างโปรเจกต์

```text
src/
├── routes/
│   ├── __root.tsx             # HTML document, providers และ not-found page
│   ├── login.tsx              # หน้า login (นอก app shell)
│   ├── api/auth/$.ts          # Better Auth endpoint
│   └── _app/                  # pathless app shell (auth-guarded)
│       ├── route.tsx
│       ├── index.tsx
│       ├── projects.tsx
│       ├── projects.$projectId.tsx
│       ├── reports.tsx
│       └── settings.tsx
├── features/
│   ├── auth/                  # Better Auth server, client, session server-fns, login page
│   ├── dashboard/             # Dashboard page (stat cards, work hour chart, tracker)
│   ├── projects/              # projects schema/server/functions + pages
│   ├── issues/                # issues schema/server/functions
│   ├── time-entries/          # time tracking + work hour analysis
│   ├── reports/
│   └── settings/
├── components/
│   ├── layout/                # App shell เช่น sidebar
│   └── ui/                    # shadcn/ui primitives
├── db/
│   ├── schema.ts              # Drizzle schema (auth + PM tables)
│   ├── client.server.ts       # server-only DB client
│   └── seed.ts                # demo data (bun run db:seed)
├── hooks/                     # shared React hooks
├── lib/                       # shared client-safe utilities
├── router.tsx                 # router configuration
├── routeTree.gen.ts           # generated; ห้ามแก้ด้วยมือ
└── styles.css                 # global theme และ Tailwind styles
```

RBAC ถูก enforce ฝั่ง server ในทุก `*.server.ts` ผ่าน `requireSession` / `requireRole` จาก `src/features/auth/auth.server.ts`

รายละเอียดเรื่อง routing และ server/client boundary อยู่ที่ [`docs/architecture.md`](docs/architecture.md)

## คำสั่งที่ใช้บ่อย

```bash
bun run generate-routes     # regenerate routeTree.gen.ts หลังเพิ่ม/ย้าย route
bunx tsc --noEmit           # ตรวจ TypeScript
bunx eslint src             # ตรวจ lint ของ source
bun run build               # production build
bun run db:migrate          # apply migrations
bun run db:seed             # ใส่ demo data (ล้างข้อมูลเดิม)
bun run db:studio           # เปิด Drizzle Studio
```

ดูคำสั่งทั้งหมดและเวอร์ชัน dependency จาก [`package.json`](package.json) ซึ่งเป็น source of truth ของโปรเจกต์

## Troubleshooting สั้น ๆ

หลังย้ายหรือเปลี่ยนชื่อ route, feature หรือ server module ให้รัน `bun run generate-routes` และ restart dev server แบบ clean หาก Vite ยังอ้าง path เก่าอยู่ จากนั้นทดสอบทั้งการเปิด URL โดยตรงและการกด navigation ภายในแอป

ถ้า `db:migrate` แล้วตารางไม่เกิด ลองเช็คว่า journal เก่าค้างใน schema `drizzle` ของ Postgres (drop schema `drizzle` แล้ว migrate ใหม่)
