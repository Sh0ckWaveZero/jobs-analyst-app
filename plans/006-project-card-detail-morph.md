# 006 — Project card → detail shared-element morph

- **Status**: DONE
- **Commit**: bf88c36
- **Severity**: MEDIUM
- **Category**: Missed opportunities
- **Estimated scope**: 2 files (src/features/projects/projects-page.tsx, src/features/projects/project-detail-page.tsx)

## Problem

Navigating project card → detail page (and back) swaps full pages instantly. The key badge (small square with "APP"/"WEB") exists on both sides but the browser never connects them. View Transitions API shared-element morphs explain the spatial relationship — the badge grows into the detail header.

## Target

1. `src/router.tsx` — enable view transitions for all client navigations at the router level:

```tsx
const router = createTanStackRouter({
  …
  defaultViewTransition: true,
})
```

> Verified against the installed router (1.168.x): the per-Link `viewTransition` prop is dropped by the new transaction-based navigation path (`router.startViewTransition` was never called with the prop set — empirically confirmed). The router-level `defaultViewTransition` is checked inside `load()` (`router.js:491`) and works; named elements morph automatically during the default transition.

2. Card key badge (`projects-page.tsx` ~line 76) and detail header badge (`project-detail-page.tsx` ~line 118) share a name:

```tsx
<div
  className="flex size-9 items-center justify-center rounded-lg bg-primary/10 font-mono text-xs font-bold text-primary"
  style={{ viewTransitionName: `project-key-${p.id}` }}
>
  {p.key}
</div>
```

Detail side: same `viewTransitionName: `project-key-${pid}`` on its `size-10` badge div.

## Repo conventions to follow

- Router-level options live in `src/router.tsx` `createTanStackRouter({ … })` (exemplar: `defaultPreload: 'intent'`).
- `defaultViewTransition?: boolean | ViewTransitionOptions` (confirmed in `@tanstack/router-core/dist/esm/router.js:491`).
- Names must be unique per snapshot: `project-key-{id}` appears once in the card list and once on the detail page.

## Steps

1. `src/router.tsx` — add `defaultViewTransition: true` to the options object.
2. `projects-page.tsx` — add the inline `viewTransitionName` style to the card key badge div.
3. `project-detail-page.tsx` — add matching `viewTransitionName` style to the header badge (use `project-key-${pid}`).

## Boundaries

- Do NOT put `view-transition-name` on the whole card (text would stretch awkwardly) — badge only.
- Do NOT animate other pages (users, reports) with custom names — they inherit the root crossfade, which is intended.
- Do NOT add libraries.

## Verification

- **Mechanical**: `bunx tsc --noEmit` passes; `bunx vitest run src/features` passes.
- **Feel check**: click a project card: the badge morphs/scales into the detail header while the rest crossfades; clicking "Projects" back morphs it back; every route change crossfades ~200ms.
- **Done when**: morph visible on card↔detail navigation; no duplicate-name console errors.
