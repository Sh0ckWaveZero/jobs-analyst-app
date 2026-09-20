# Documentation Index — Jobs Analysis

ยินดีต้อนรับสู่ศูนย์รวมเอกสารของโปรเจกต์ **Jobs Analysis** แอปพลิเคชัน Project Management และ Work Hour Analysis ที่พัฒนาด้วย **TanStack Start**, **Bun**, **PostgreSQL**, และ **Drizzle ORM**

เอกสารทั้งหมดในโฟลเดอร์ `docs/` ถูกจัดแบ่งตามหมวดหมู่และบทบาทหน้าที่ ดังนี้:

---

## สารบัญเอกสารทั้งหมด

| เอกสาร                                                                        | หมวดหมู่        | คำอธิบายโดยสรุป                                                                                        |
| :---------------------------------------------------------------------------- | :-------------- | :----------------------------------------------------------------------------------------------------- |
| [`docs/architecture.md`](architecture.md)                                     | สถาปัตยกรรม     | ภาพรวมโครงสร้างระบบ การแบ่ง Server/Client Boundary และ Data Flow                                       |
| [`docs/routing-guide.md`](routing-guide.md)                                   | Routing         | คู่มือเจาะลึก TanStack Router: การตั้งชื่อไฟล์, Dynamic Route, Lifecycle (`beforeLoad`, `loader`)      |
| [`docs/data-fetching-and-server-guide.md`](data-fetching-and-server-guide.md) | ข้อมูลและ API   | การดึงข้อมูลด้วย Server Functions (`createServerFn`), TanStack Query SSR Hydration, และ REST Endpoints |
| [`docs/auth-and-rbac-guide.md`](auth-and-rbac-guide.md)                       | ความปลอดภัย     | ระบบยืนยันตัวตน Better Auth, Session Cookie, role catalog และการตรวจสิทธิ์ RBAC                        |
| [`docs/database-guide.md`](database-guide.md)                                 | ฐานข้อมูล       | สกีมาตารางใน PostgreSQL, Drizzle ORM, การสร้าง Migration, และการใส่ Seed Data                          |
| [`docs/testing-guide.md`](testing-guide.md)                                   | การทดสอบ        | การเขียนและรัน Unit/Component Tests ด้วย Vitest, Happy DOM, และกลยุทธ์ Test Coverage 90%               |
| [`docs/user-guide.md`](user-guide.md)                                         | คู่มือผู้ใช้งาน | วิธีการใช้งานแอปพลิเคชันจากมุมมองของผู้ใช้จริง พร้อมคำอธิบายสิทธิ์แต่ละบทบาท                           |

---

## เส้นทางการอ่านตามบทบาทหน้าที่ (Recommended Reading Paths)

### สำหรับนักพัฒนาฝั่งหน้าบ้าน (Frontend Developer)

1. [`docs/architecture.md`](architecture.md) — ทำความเข้าใจขอบเขต Server/Client Boundary และ Thin Route
2. [`docs/routing-guide.md`](routing-guide.md) — วิธีสร้าง Route ใหม่ การใช้ `<Link>` และ Route Lifecycle
3. [`docs/data-fetching-and-server-guide.md`](data-fetching-and-server-guide.md) — วิธีเชื่อมต่อข้อมูลกับ UI ผ่าน `useServerFn` และ `useQuery`
4. [`docs/testing-guide.md`](testing-guide.md) — การเขียน Component Test สำหรับหน้า UI

### สำหรับนักพัฒนาฝั่งเซิร์ฟเวอร์และฐานข้อมูล (Backend & DB Developer)

1. [`docs/database-guide.md`](database-guide.md) — ออกแบบและแก้ไขสกีมาด้วย Drizzle ORM
2. [`docs/data-fetching-and-server-guide.md`](data-fetching-and-server-guide.md) — การสร้าง Server Functions และ API Endpoints
3. [`docs/auth-and-rbac-guide.md`](auth-and-rbac-guide.md) — การบังคับใช้สิทธิ์ (Guard) และ Session Management

### สำหรับผู้ดูแลระบบ / ทีมทดสอบ (QA & Product Owner)

1. [`docs/user-guide.md`](user-guide.md) — ทำความเข้าใจฟังก์ชันงานทั้งหมดและสิทธิ์ของผู้ใช้แต่ละบทบาท
2. [`docs/auth-and-rbac-guide.md`](auth-and-rbac-guide.md) — ตรวจสอบสิทธิ์ Matrix RBAC เพื่อออกแบบ Test Cases
