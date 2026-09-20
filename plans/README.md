# Animation Plans

Findings from the motion audit (commit `bf88c36`). Values follow the improve-animations playbook (Emil Kowalski's animation philosophy) — custom curves live as tokens in `src/styles.css`.

| # | Plan | Severity | Status |
| --- | --- | --- | --- |
| 001 | [Restore shadcn enter/exit motion (tw-animate-css)](001-restore-shadcn-enter-exit-motion.md) | HIGH | DONE |
| 002 | [Motion tokens, reduced-motion gate, sheet easing](002-motion-tokens-reduced-motion-sheet-easing.md) | MEDIUM | DONE |
| 003 | [Button press feedback](003-button-press-feedback.md) | MEDIUM | DONE |
| 004 | [Chart data-change easing and sidebar handle transition scope](004-chart-and-sidebar-transition-scope.md) | LOW | DONE |
| 005 | [Theme-switch crossfade via View Transitions API](005-theme-switch-view-transition.md) | MEDIUM | DONE |
| 006 | [Project card → detail shared-element morph](006-project-card-detail-morph.md) | MEDIUM | DONE |

## Execution order

1 → 2 → 3 → 4 → 5 → 6. Plan 002 assumes the utilities from plan 001 exist (its sheet easing tokens ride on `animate-in`/`animate-out`). Plans 005–006 layer the View Transitions API on top of the plan-002 tokens; 006 relies on the router-level `defaultViewTransition` set in plan 005's turn.

## Deliberately skipped

- Route-level fade for every page — replaced by the adopted `defaultViewTransition: true` root crossfade (200ms) from plans 005–006; per-page custom `view-transition-name`s are added only where a spatial relationship exists (project card ↔ detail).
- Command menu (⌘K) animation tuning — command palettes should stay snappy; the restored default fade is enough.
