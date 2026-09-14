---
"@taserjs/cli": minor
"@taserjs/client": minor
"@taserjs/plugin": minor
"@taserjs/router": minor
"@taserjs/runtime": minor
"@taserjs/utils": minor
"create-taserjs": minor
---

0.2.0: Architectural Rewrite

- Refactored the entire routing system to be more modular and flexible.
- Renamed packages to be more consistent and descriptive.
- Segregated ctx and state into request, state, and context facets.
- Taser is now a Router-Only package and can have many runtimes.
- It is not trying to be a Backend Framework beyond the scope of the router.
