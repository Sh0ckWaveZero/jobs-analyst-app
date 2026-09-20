import { defineConfig } from 'vitest/config'
import viteReact from '@vitejs/plugin-react'

// แยกจาก vite.config.ts เพื่อไม่ต้อง load plugin ของ TanStack Start/devtools
// ตอนรัน unit test — alias ใช้ tsconfig paths (@/ และ #/) เหมือนแอป
export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [viteReact()],
  test: {
    // happy-dom แทน jsdom เพราะ jsdom พังเมื่อรันใต้ bun runtime
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    // server modules (ที่ test import ผ่าน *.functions) ต้องเห็น env ตอน import
    // ตั้งค่าจำลองเพื่อให้ deterministic — ตัว DB จริงไม่ถูกแตะ (server fns ถูก mock ทุกจุด)
    env: {
      DATABASE_URL: 'postgres://test:test@localhost:5432/test',
      BETTER_AUTH_SECRET: 'test-secret-for-unit-tests',
      BETTER_AUTH_URL: 'http://localhost:3000',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // generated file (AGENTS.md: ห้ามแก้ด้วยมือ ไม่ต้องเทสต์)
        'src/routeTree.gen.ts',
        // server boundary: ต้องมี Postgres จริง — ตรวจด้วย integration ไม่ใช่ unit test
        'src/db/**',
        'src/**/*.server.ts',
        'src/db/seed.ts',
        // server-fn wrappers: validator/handler arrows รันเฉพาะบน server
        'src/**/*.functions.ts',
        // server API endpoint (better-auth handler passthrough)
        'src/routes/api/**',
        // shadcn primitives — โค้ด vendored ตาม convention เดิม (eslint ก็ override ไว้)
        // ครอบคลุมผ่าน feature tests ที่ render ผ่าน drawer/dialog จริง
        'src/components/ui/**',
        // ตัว test เอง
        'src/test/**',
        'src/**/*.test.{ts,tsx}',
      ],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
})
