---
"@taserjs/router": patch
"@taserjs/router-cli": patch
"@taserjs/router-client": patch
"@taserjs/router-core": patch
"@taserjs/router-generator": patch
"@taserjs/router-plugin": patch
"@taserjs/router-utils": patch
"create-taserjs": patch
---

feat: Unified Fluent Architecture

- Should reduce friction of adoption, ambient types for everything, less manual setup
- All taser routes and app now explicitly export default instead of named export
- Avoid mistakes of inferring context from Route named export
- Clear difference between layout and middleware
- Fluent middleware syntax with validation only pattern
- Client supports multiple service instances
- Better docs
