# 004 — Chart data-change easing and sidebar handle transition scope

- **Status**: DONE
- **Commit**: bf88c36
- **Severity**: LOW
- **Category**: Missed opportunities / Performance
- **Estimated scope**: 2 files (src/features/dashboard/work-hour-chart.tsx, src/components/ui/sidebar.tsx)

## Problem

1. `src/features/dashboard/work-hour-chart.tsx:37` — `<Bar>` uses recharts defaults. Default animation runs ~1500ms, far above the ≤300ms UI budget, every time the range buttons (5D/2W/1M/6M/1Y) swap data:

```tsx
/* src/features/dashboard/work-hour-chart.tsx:37 — current */
<Bar dataKey="hours" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
```

2. `src/components/ui/sidebar.tsx:295` — the resize handle uses `transition-all ease-linear`; `transition-all` is a performance finding (animates unintended properties off-GPU) and `ease-linear` is only for constant motion:

```tsx
/* src/components/ui/sidebar.tsx:295 — current */
'absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border sm:flex',
```

## Target

1. Chart: 300ms ease-out growth on mount and data swap:

```tsx
<Bar
  dataKey="hours"
  fill="hsl(var(--primary))"
  radius={[3, 3, 0, 0]}
  animationDuration={300}
  animationEasing="ease-out"
/>
```

2. Sidebar handle: scope the transition to the property actually changing (its translate position) using the file's existing duration convention (200ms):

```tsx
'absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-transform duration-200 group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border sm:flex',
```

## Repo conventions to follow

- The sidebar file already uses `transition-transform` (2×) and `duration-200` (3×) elsewhere — this change matches that convention.

## Steps

1. `src/features/dashboard/work-hour-chart.tsx` — add `animationDuration={300}` and `animationEasing="ease-out"` props to `<Bar>`.
2. `src/components/ui/sidebar.tsx:295` — replace `transition-all ease-linear` with `transition-transform duration-200`.

## Boundaries

- Do NOT change chart data logic, axis config, or the lazy-load comment.
- Do NOT touch other sidebar transitions (collapse rail animations are already `transition-transform duration-200`).

## Verification

- **Mechanical**: `bunx tsc --noEmit` passes; `bun run build` passes.
- **Feel check**: on the dashboard, click 5D → 1M → 6M: bars grow/settle within ~0.3s, never a slow 1.5s crawl; dragging the sidebar resize handle shows no laggy transition on the handle itself.
- **Done when**: chart settles quickly after range changes; no `transition-all` remains in sidebar.tsx.
