# @taserjs/router-core

## 0.1.9

### Patch Changes

- 70cf32a: fix: Layout tree relationship
  feat: Added skills, install via `npx skills add taserjs/taserjs`
- Updated dependencies [70cf32a]
  - @taserjs/router-utils@0.1.9

## 0.1.8

### Patch Changes

- e4aa72d: fix: Layout Type Inference Cyclic Reference Issue
- Updated dependencies [e4aa72d]
  - @taserjs/router-utils@0.1.8

## 0.1.7

### Patch Changes

- c31d57a: feat: Strict handler middleware registration
  feat: Add `QUERY` http handler
- Updated dependencies [c31d57a]
  - @taserjs/router-utils@0.1.7

## 0.1.6

### Patch Changes

- 8ff9b40: fix: State inference from stateless middlewares from layout
- Updated dependencies [8ff9b40]
  - @taserjs/router-utils@0.1.6

## 0.1.5

### Patch Changes

- 80b24e4: feat: Unified Fluent Architecture

  - Should reduce friction of adoption, ambient types for everything, less manual setup
  - All taser routes and app now explicitly export default instead of named export
  - Avoid mistakes of inferring context from Route named export
  - Clear difference between layout and middleware
  - Fluent middleware syntax with validation only pattern
  - Client supports multiple service instances
  - Better docs

- Updated dependencies [80b24e4]
  - @taserjs/router-utils@0.1.5

## 0.1.4

### Patch Changes

- 90091a4: feat: Performance Improvements in watcher and router
  feat: Consistent middleware fluent API
  feat: Short middleware syntax with `.use(callback)`
  remove: Unnecessary defineHandler API
  fix: `stream.file()` path traversal protection
- Updated dependencies [90091a4]
  - @taserjs/router-utils@0.1.4

## 0.1.3

### Patch Changes

- 73bd632: fix: Next.js dev phase detection and add auto-scaffolding for new
  routes
- Updated dependencies [73bd632]
  - @taserjs/router-utils@0.1.3

## 0.1.2

### Patch Changes

- bcea945: fix: Next.js Plugin
- Updated dependencies [bcea945]
  - @taserjs/router-utils@0.1.2

## 0.1.1

### Patch Changes

- e5609c2: Minor fixes and Feature Additions
- Updated dependencies [e5609c2]
  - @taserjs/router-utils@0.1.1

## 0.1.0

### Minor Changes

- b5eab15: Fluent API, Nitro Deployments, Vite Base. All New TaserJS

### Patch Changes

- Updated dependencies [b5eab15]
  - @taserjs/router-utils@0.1.0

## 0.0.5

### Patch Changes

- fa0f18c: feat: Perf Improvements and Web Standard Response
- Updated dependencies [fa0f18c]
  - @taserjs/router-utils@0.0.5

## 0.0.4

### Patch Changes

- a0c7c58: feat: Additional Replies and Scoped Middlewares
- Updated dependencies [a0c7c58]
  - @taserjs/router-utils@0.0.4

## 0.0.3

### Patch Changes

- c6790d4: Generator Fixes & Performance Improvements with Rou3 Matcher
- Updated dependencies [c6790d4]
  - @taserjs/router-utils@0.0.3

## 0.0.2

### Patch Changes

- c8d2b57: Create taser fix and bundle size optimization
- Updated dependencies [c8d2b57]
  - @taserjs/router-utils@0.0.2

## 0.0.1

### Patch Changes

- ae450cf: Fix Internal var exposure and add validator picker while create
  taserjs project
- Updated dependencies [ae450cf]
  - @taserjs/router-utils@0.0.1
