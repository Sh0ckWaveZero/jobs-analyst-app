# 001 — Restore shadcn enter/exit motion (install tw-animate-css)

- **Status**: DONE
- **Commit**: bf88c36
- **Severity**: HIGH
- **Category**: Cohesion & tokens / tooling
- **Estimated scope**: 2 files (package.json, src/styles.css)

## Problem

Six shadcn primitives use Tailwind animation utilities (`animate-in`, `animate-out`, `fade-in-0`, `slide-in-from-*`, `zoom-in-*`) that are never defined anywhere in the project:

- `src/components/ui/sheet.tsx` — `data-[state=closed]:animate-out data-[state=open]:animate-in`
- `src/components/ui/dialog.tsx`, `dropdown-menu.tsx`, `select.tsx`, `popover.tsx`, `tooltip.tsx` — same pattern

In Tailwind v4 these utilities come from the `tw-animate-css` package. It is absent:

- `package.json` — no `tw-animate-css` / `tailwindcss-animate` dependency
- `src/styles.css:1` — only `@import 'tailwindcss';`
- Built CSS (`dist/client/assets/styles-*.css`) — zero matches for `animate-in`, `fade-in-0`, `slide-in-from-right`

Result: every sheet, dialog, dropdown, select, popover and tooltip in the app appears and disappears with no transition at all — they hard-swap. This is the root cause of the app feeling like it "lacks animation transitions".

## Target

The utilities exist and are emitted in the built CSS; all Radix overlays animate in/out with tw-animate-css defaults (150ms ease-out class of motion), which later plans refine (see 002).

## Repo conventions to follow

- CSS imports live at the top of `src/styles.css`; Tailwind v4 first: `@import 'tailwindcss';` then `@custom-variant dark (&:is(.dark *));`
- Dependencies are managed with bun (`bun add`), versions recorded in `package.json`.

## Steps

1. Run `bun add tw-animate-css`.
2. In `src/styles.css`, add directly under line 1 (`@import 'tailwindcss';`):
   ```css
   @import 'tw-animate-css';
   ```

## Boundaries

- Do NOT touch any component `.tsx` files — the class names are already correct.
- Do NOT change easing/durations — that is plan 002.
- If `bun add` fails or the built CSS still lacks `.animate-in` after build, STOP and report.

## Verification

- **Mechanical**: `bun run build`, then grep `dist/client/assets/*.css` for `animate-in` — must match.
- **Feel check**: run the UI, open a dropdown (sidebar project switcher) and the New project sheet:
  - dropdown fades/zooms in ~150ms instead of popping,
  - sheet slides in from the right,
  - closing either animates out instead of vanishing.
- **Done when**: built CSS contains the animate utilities and overlays visibly animate.
