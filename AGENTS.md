# AGENTS.md

## Scope

ใช้กติกานี้กับงานทั้งหมดใน repository `jobs-analysis` โปรเจกต์เป็น TanStack Start แบบ file-based routing, React, Vite, shadcn/ui และ Drizzle/PostgreSQL

## Read first

- อ่าน [`README.md`](README.md) สำหรับ quick start, public routes และคำสั่งหลัก
- อ่าน [`docs/architecture.md`](docs/architecture.md) เมื่อเพิ่ม/ย้าย route, feature, server function หรือ schema
- ใช้ `package.json` เป็น source of truth สำหรับ scripts และ dependency ไม่คัดลอกคำสั่งทั้งชุดมาไว้ในเอกสารอื่น

## Project conventions

- Route entrypoints อยู่ใต้ `src/routes`; page และ domain UI อยู่ใต้ `src/features`
- `src/routes/_app` เป็น pathless layout: ห้ามเปลี่ยน public URL โดยไม่ตั้งใจเมื่อเพิ่มหรือย้ายไฟล์ในโฟลเดอร์นี้
- Route files ควรบาง: ผูก `createFileRoute` กับ feature page เท่านั้น ไม่ใส่ DB query หรือ business logic ใน route file
- Server boundary ใช้ `*.functions.ts` เป็น wrapper ของ `createServerFn`, `*.server.ts` เป็น implementation ฝั่ง server และ `*.schema.ts` เป็น schema/type ที่แชร์ได้
- ห้าม import `src/db/client.server.ts` หรือ `*.server.ts` เข้า client component โดยตรง
- `src/routeTree.gen.ts` เป็น generated file: แก้ source route แล้วรัน `bun run generate-routes`; ห้ามแก้ generated file ด้วยมือ
- เมื่อไม่มี `DATABASE_URL` ให้อ่าน jobs จาก mock ได้ แต่การสร้าง job ต้องแจ้ง/ส่ง error อย่างชัดเจน ไม่ทำเหมือนบันทึกสำเร็จ
- เก็บ shadcn primitives ไว้ใน `src/components/ui` และ shared app shell ไว้ใน `src/components/layout`

## Workflow

1. เริ่มด้วย `rtk git status --short` และรักษา unrelated changes/untracked work ของผู้ใช้ไว้
2. ใช้ `rtk` นำหน้าคำสั่ง shell ตาม environment instructions
3. หลังเพิ่มหรือย้าย route ให้รัน `bun run generate-routes` และตรวจ public URL จาก route tree
4. หลังย้าย/ลบไฟล์ ให้ restart dev server แบบ clean ก่อนวิเคราะห์ stale-module, reload loop หรือ `ECONNRESET/aborted`
5. ตรวจอย่างน้อยด้วย `bunx tsc --noEmit`, lint เฉพาะ scope ที่แก้ และ `bun run build`
6. ถ้าเป็น UI ให้ตรวจทั้ง direct URL load และ client-side navigation ที่ `http://localhost:3000`

## Completion criteria

งานถือว่าเสร็จเมื่อโครงสร้าง/เอกสารตรงกับ source จริง, generated route tree ถูกสร้างใหม่เมื่อจำเป็น, verification ที่รันถูกระบุชัดว่า passed/failed/skipped และไม่มีการแก้ไฟล์นอก scope โดยไม่จำเป็น
