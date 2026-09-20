# 002 — Motion tokens, reduced-motion gate, sheet easing

- **Status**: DONE
- **Commit**: bf88c36
- **Severity**: MEDIUM
- **Category**: Cohesion & tokens / Easing & duration / Accessibility
- **Estimated scope**: 2 files (src/styles.css, src/components/ui/sheet.tsx)

## Problem

1. No motion tokens exist — `src/styles.css` defines color/radius tokens only; easings are unnamed and inconsistent across components.
2. No `prefers-reduced-motion` handling anywhere in the repo (grep: zero matches).
3. `src/components/ui/sheet.tsx:62` opens the drawer at 500ms with the default ease — sluggish for a crisp dashboard:

```tsx
/* src/components/ui/sheet.tsx:62 — current */
'fixed z-50 flex flex-col gap-4 bg-background shadow-lg transition ease-in-out data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:animate-in data-[state=open]:duration-500',
```

## Target

Motion tokens in `src/styles.css` `:root` (values from the audit playbook, not approximated):

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);     /* strong ease-out for UI */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1); /* on-screen movement */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);  /* iOS-like drawer curve */
```

Reduced-motion gate (keep opacity/color feedback, drop movement):

```css
@media (prefers-reduced-motion: reduce) {
  *,
  ::before,
  ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Sheet: open 300ms, close 200ms, drawer curve:

```tsx
/* target */
'fixed z-50 flex flex-col gap-4 bg-background shadow-lg transition ease-in-out data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:animate-in data-[state=open]:duration-300 data-[state=open]:ease-[var(--ease-drawer)]',
```

## Repo conventions to follow

- Tokens live in `src/styles.css` `:root` (exemplar: `--radius: 8px;` at `src/styles.css:4`).
- Sheet slide timing is expressed with `duration-*` utilities on the content base class (exemplar: current line 62) — `tw-animate-css` consumes `--tw-duration` for `animate-in`/`animate-out`.

## Steps

1. `src/styles.css` — inside `:root { … }`, after `--radius: 8px;`, add the three `--ease-*` tokens above.
2. `src/styles.css` — at the end of the file, append the reduced-motion media block above.
3. `src/components/ui/sheet.tsx:62` — replace `data-[state=closed]:duration-300 data-[state=open]:duration-500` with `data-[state=closed]:duration-200 data-[state=open]:duration-300 data-[state=open]:ease-[var(--ease-drawer)]`.

## Boundaries

- Do NOT touch dialog/dropdown/select/popover/tooltip — their tw-animate-css defaults are within budget.
- Do NOT add new dependencies.
- Do NOT change any markup or Radix props.

## Verification

- **Mechanical**: `bunx tsc --noEmit` passes; `bun run build` passes; built CSS contains `--ease-drawer` and the reduced-motion block.
- **Feel check**: run the UI, open/close the New project sheet:
  - open feels ~300ms and decelerates smoothly (no linear slide),
  - close is snappier than open,
  - spamming open/close never freezes mid-state (transitions retarget).
- **Done when**: tokens present in built CSS, sheet visibly quicker than before, reduced-motion block present.
