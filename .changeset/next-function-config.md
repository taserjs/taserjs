---
"@taserjs/plugin": patch
---

fix: `createTaser` from `@taserjs/plugin/next` now supports function-style `next.config` (sync or async). Previously the wrapper spread the function and silently dropped every setting it returned.
