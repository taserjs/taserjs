# @taserjs/utils

## 0.2.3

### Patch Changes

- 6333a73: feat: Support Breakout Segment Routing

## 0.2.2

### Patch Changes

- c5fe1b6: Fix Vite Watch & HMR Create / Delete Routes

## 0.2.1

### Patch Changes

- 4516b29: Plugin & Runtime Fixes and Improvements

## 0.2.0

### Minor Changes

- 06b544f: 0.2.0: Architectural Rewrite

  - Refactored the entire routing system to be more modular and flexible.
  - Renamed packages to be more consistent and descriptive.
  - Segregated ctx and state into request, state, and context facets.
  - Taser is now a Router-Only package and can have many runtimes.
  - It is not trying to be a Backend Framework beyond the scope of the router.
