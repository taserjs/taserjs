# Security Policy

## Supported Versions

Taser.js is pre-1.0. All `@taserjs/*` packages and `create-taserjs` are released together under one version, and security fixes land only in the latest release.

| Version  | Supported |
| :------- | :-------- |
| latest   | Yes       |
| < latest | No        |

## Reporting a Vulnerability

Please do not open a public issue, pull request, or Discord message for a suspected vulnerability.

Report it privately through GitHub:

1. Open [Report a vulnerability](https://github.com/taserjs/taserjs/security/advisories/new) in the repository's **Security** tab.
2. Describe the issue, the affected package and version, and steps or a minimal reproduction.
3. Include the impact you expect (for example request smuggling, validation bypass, or arbitrary file write during generation).

You can expect an acknowledgement within 5 business days. We will keep you updated on triage and the fix, and credit you in the advisory unless you prefer to stay anonymous.

## Scope

In scope:

- `@taserjs/router`, `@taserjs/runtime`, `@taserjs/utils`, `@taserjs/client`
- `@taserjs/cli`, `@taserjs/plugin`, `create-taserjs` (for example unsafe file writes, path traversal during route scanning, or code injection into generated files)

Out of scope:

- Vulnerabilities in third-party dependencies (Hono, srvx, Vite, Nitro, and so on). Report those upstream; tell us if Taser.js needs a version bump to pick up a fix.
- Issues in the `examples/` apps or the documentation site that do not affect published packages.
- Application-level security mistakes in projects built with Taser.js, such as missing authentication on a route.

## Disclosure

We ask that you give us reasonable time to release a fix before disclosing publicly. Once a fix is published, we release a GitHub security advisory describing the issue, the affected versions, and the upgrade path.
