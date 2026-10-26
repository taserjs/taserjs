---
"@taserjs/plugin": patch
---

fix(vite): recognise frameworks whose plugins are returned as a promise (SvelteKit's `sveltekit()`), so Taser.js no longer switches to server mode and replaces the framework's server build, and watch routes that live outside the Vite root (Nuxt runs Vite from `app/`).
