# 003 — Button press feedback and fast state transitions

- **Status**: DONE
- **Commit**: bf88c36
- **Severity**: MEDIUM
- **Category**: Physicality & origin
- **Estimated scope**: 1 file (src/components/ui/button.tsx)

## Problem

The button base classes in `src/components/ui/variants.ts:7` use bare `transition-all` (a performance finding in itself — animates unintended properties off-GPU) and there is no `active:` utility anywhere (grep: 0 matches). Hover color changes ride on `transition-all` with no duration token and presses give no physical feedback — on the highest-frequency element in the app.

```tsx
/* src/components/ui/variants.ts:7 — current (excerpt) */
"inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring …"
```

## Target

In the button `base` class string (the `cva()` call in `src/components/ui/variants.ts` feeding every variant), replace `transition-all` with:

```tsx
'transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out active:scale-[0.98]',
```

Values from the audit playbook: press feedback `scale(0.97)` (acceptable range 0.95–0.98), duration 100–160ms, hover/color easing `ease-out`. The scoped property list covers everything the variants actually animate (background/border on hover, ring shadow, transform).

## Repo conventions to follow

- shadcn variants compose base classes via `cn(buttonVariants(), className)` in `src/components/ui/button.tsx` — add to the shared base, not per-variant.
- Sizing scale in this repo is subtle (radius `--radius: 8px`), keep the scale below 0.99.

## Steps

1. `src/components/ui/button.tsx` — locate the shared base class string inside `buttonVariants` (contains `inline-flex items-center justify-center gap-2 …`). Append the target utilities to that string.

## Boundaries

- Do NOT add `active:` handling to icon buttons implemented ad-hoc (e.g. sidebar triggers) — primitives only.
- Do NOT use `transition-all` (repo lint has a no-transition-all rule; commit d70bdff).
- Do NOT change variants, sizes, or markup.

## Verification

- **Mechanical**: `bunx tsc --noEmit` passes; `bunx vitest run src/features src/components` passes (button class assertions may exist).
- **Feel check**: click primary buttons (New project, Create project, Start tracker):
  - press visibly compresses ~2% and releases cleanly,
  - hover color change is a fast fade, not a snap,
  - double-clicking rapidly never leaves the button scaled.
- **Done when**: buttons compress on press; no test regressions.
