# @taserjs/router-utils

## 0.1.9

### Patch Changes

- 70cf32a: fix: Layout tree relationship
  feat: Added skills, install via `npx skills add taserjs/taserjs`

## 0.1.8

### Patch Changes

- e4aa72d: fix: Layout Type Inference Cyclic Reference Issue

## 0.1.7

### Patch Changes

- c31d57a: feat: Strict handler middleware registration
  feat: Add `QUERY` http handler

## 0.1.6

### Patch Changes

- 8ff9b40: fix: State inference from stateless middlewares from layout

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

## 0.1.4

### Patch Changes

- 90091a4: feat: Performance Improvements in watcher and router
  feat: Consistent middleware fluent API
  feat: Short middleware syntax with `.use(callback)`
  remove: Unnecessary defineHandler API
  fix: `stream.file()` path traversal protection

## 0.1.3

### Patch Changes

- 73bd632: fix: Next.js dev phase detection and add auto-scaffolding for new
  routes

## 0.1.2

### Patch Changes

- bcea945: fix: Next.js Plugin

## 0.1.1

### Patch Changes

- e5609c2: Minor fixes and Feature Additions

## 0.1.0

### Minor Changes

- b5eab15: Fluent API, Nitro Deployments, Vite Base. All New TaserJS

## 0.0.5

### Patch Changes

- fa0f18c: feat: Perf Improvements and Web Standard Response

## 0.0.4

### Patch Changes

- a0c7c58: feat: Additional Replies and Scoped Middlewares

## 0.0.3

### Patch Changes

- c6790d4: Generator Fixes & Performance Improvements with Rou3 Matcher

## 0.0.2

### Patch Changes

- c8d2b57: Create taser fix and bundle size optimization

## 0.0.1

### Patch Changes

- ae450cf: Fix Internal var exposure and add validator picker while create
  taserjs project
