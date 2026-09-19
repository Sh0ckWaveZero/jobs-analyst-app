//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
    },
  },
  {
    // ไฟล์จาก shadcn registry — ไม่แก้มือ จึงเผื่อ rule ที่เข้มเกินสำหรับ generated code
    files: ['src/components/ui/**'],
    rules: {
      '@typescript-eslint/no-unnecessary-condition': 'off',
      'no-shadow': 'off',
    },
  },
  {
    ignores: ['eslint.config.js', 'prettier.config.js'],
  },
]
