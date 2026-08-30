# @taserjs/router-plugin

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
  - @taserjs/router-generator@0.1.5
  - @taserjs/router-utils@0.1.5

## 0.1.4

### Patch Changes

- 90091a4: feat: Performance Improvements in watcher and router
  feat: Consistent middleware fluent API
  feat: Short middleware syntax with `.use(callback)`
  remove: Unnecessary defineHandler API
  fix: `stream.file()` path traversal protection
- Updated dependencies [90091a4]
  - @taserjs/router-generator@0.1.4
  - @taserjs/router-utils@0.1.4

## 0.1.3

### Patch Changes

- 73bd632: fix: Next.js dev phase detection and add auto-scaffolding for new
  routes
- Updated dependencies [73bd632]
  - @taserjs/router-generator@0.1.3
  - @taserjs/router-utils@0.1.3

## 0.1.2

### Patch Changes

- bcea945: fix: Next.js Plugin
- Updated dependencies [bcea945]
  - @taserjs/router-generator@0.1.2
  - @taserjs/router-utils@0.1.2

## 0.1.1

### Patch Changes

- e5609c2: Minor fixes and Feature Additions
- Updated dependencies [e5609c2]
  - @taserjs/router-generator@0.1.1
  - @taserjs/router-utils@0.1.1

## 0.1.0

### Minor Changes

- b5eab15: Fluent API, Nitro Deployments, Vite Base. All New TaserJS

### Patch Changes

- Updated dependencies [b5eab15]
  - @taserjs/router-generator@0.1.0
  - @taserjs/router-utils@0.1.0
