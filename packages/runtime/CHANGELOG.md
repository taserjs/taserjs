# @taserjs/runtime

## 0.2.3

### Patch Changes

- 6333a73: feat: Support Breakout Segment Routing
- Updated dependencies [6333a73]
  - @taserjs/router@0.2.3
  - @taserjs/utils@0.2.3

## 0.2.2

### Patch Changes

- c5fe1b6: Fix Vite Watch & HMR Create / Delete Routes
- Updated dependencies [c5fe1b6]
  - @taserjs/router@0.2.2
  - @taserjs/utils@0.2.2

## 0.2.1

### Patch Changes

- 4516b29: Plugin & Runtime Fixes and Improvements
- Updated dependencies [4516b29]
  - @taserjs/router@0.2.1
  - @taserjs/utils@0.2.1

## 0.2.0

### Minor Changes

- 06b544f: 0.2.0: Architectural Rewrite

  - Refactored the entire routing system to be more modular and flexible.
  - Renamed packages to be more consistent and descriptive.
  - Segregated ctx and state into request, state, and context facets.
  - Taser is now a Router-Only package and can have many runtimes.
  - It is not trying to be a Backend Framework beyond the scope of the router.

### Patch Changes

- Updated dependencies [06b544f]
  - @taserjs/router@0.2.0
  - @taserjs/utils@0.2.0
