# 005 — Theme-switch crossfade via View Transitions API

- **Status**: DONE
- **Commit**: bf88c36
- **Severity**: MEDIUM
- **Category**: Missed opportunities
- **Estimated scope**: 2 files (src/components/theme-toggle.tsx, src/styles.css)

## Problem

Switching light/dark (`src/components/theme-toggle.tsx:28-32`) flips `document.documentElement.classList` instantly — every color on screen teleports. This is the textbook View Transitions API use case (whole-page crossfade between two DOM states).

## Target

Wrap the theme application in `document.startViewTransition` when available and motion is allowed:

```tsx
/* src/components/theme-toggle.tsx — helper */
function applyThemeWithTransition(theme: Theme) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (typeof document.startViewTransition === 'function' && !reduceMotion) {
    document.startViewTransition(() => applyTheme(theme))
    return
  }
  applyTheme(theme)
}
```

`select()` calls `applyThemeWithTransition(next)`; the OS-triggered system listener stays instant (rare, and the user did not initiate a visible action).

Crossfade timing uses the repo token:

```css
/* src/styles.css — appended after the reduced-motion block */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 200ms;
  animation-timing-function: var(--ease-out);
}
```

Reduced motion must also neutralize view transitions (the `*, ::before, ::after` gate does not reach `::view-transition-*` pseudo-elements) — extend the existing block:

```css
@media (prefers-reduced-motion: reduce) {
  /* …existing rules… */
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation-duration: 0.01ms !important;
  }
}
```

## Repo conventions to follow

- Motion tokens live in `src/styles.css` `:root` (`--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` from plan 002).
- Feature-detect, never assume: guard with `typeof document.startViewTransition === 'function'`; fallback is today's instant swap.

## Steps

1. `src/components/theme-toggle.tsx` — add the helper above; change `select()` to call `applyThemeWithTransition(next)` instead of `applyTheme(next)`.
2. `src/styles.css` — append the `::view-transition-*` timing rule; extend the reduced-motion block with the `::view-transition-*` rules.

## Boundaries

- Do NOT animate the OS `prefers-color-scheme` change listener.
- Do NOT add per-element `view-transition-name`s in this plan (that is plan 006's scope).
- Do NOT add libraries.

## Verification

- **Mechanical**: `bunx tsc --noEmit` passes; built/dev CSS contains `view-transition`.
- **Feel check**: open the theme menu, pick Dark: the page crossfades ~200ms instead of snapping; toggling rapidly never leaves a half-dark state (each transition completes or is skipped).
- **Done when**: theme switch visibly crossfades; reduced-motion check present in CSS.
