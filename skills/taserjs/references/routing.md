# Taser.js File-Based Routing

This guide details route file naming rules, parameter extraction, route groups, splats, and breakout conventions in Taser.js.

---

## 1. Routing Conventions & Cheat Sheet

Routes live under `${serverDir}/routes` (default `src/routes/`). Every route file MUST include an HTTP verb suffix (e.g. `.get.ts`, `.post.ts`, `.put.ts`, `.patch.ts`, `.delete.ts`, `.query.ts`). Non-verb files are layouts.

During `dev` / `build`, `@taserjs/plugin` regenerates `${serverDir}/.taserjs/routes.gen.ts` (compiled `app`, ambient types, `AppManifest`). For standalone `tsc`, run `taser generate` / `npx @taserjs/cli generate`. Mount cookies with `cookie()` on a layout — see [layouts-and-middleware.md](layouts-and-middleware.md).

| File Name                      | HTTP Method | Resolved URL          | Layouts Applied | Description                                     |
| :----------------------------- | :---------- | :-------------------- | :-------------- | :---------------------------------------------- |
| `index.get.ts`                 | `GET`       | `/`                   | `/*`            | Root index route                                |
| `[index].get.ts`               | `GET`       | `/index`              | `/index`        | Literal /index path                             |
| `users.get.ts`                 | `GET`       | `/users`              | `/*`            | Static segment                                  |
| `users.index.get.ts`           | `GET`       | `/users`              | `/*`, `/users`  | Explicit nested index                           |
| `users/$id.get.ts`             | `GET`       | `/users/:id`          | `/*`, `/users`  | Dynamic URL parameter                           |
| `users.$id.posts.get.ts`       | `GET`       | `/users/:id/posts`    | `/*`, `/users`  | Flat dot-notation nested route                  |
| `files.$.get.ts`               | `GET`       | `/files/*`            | `/*`, `/files`  | Wildcard splat (`req.params._splat`)            |
| `sitemap[.]xml.get.ts`         | `GET`       | `/sitemap.xml`        | `/*`            | Bracket-escaped literal dot                     |
| `_auth.login.post.ts`          | `POST`      | `/login`              | `/*`, `/_auth`  | Pathless group (`_auth` omitted from URL)       |
| `posts_.$id.edit.get.ts`       | `GET`       | `/posts/:id/edit`     | `/*`            | **Breakout route**: skips `posts.ts` layout     |
| `tasks/$id_.complete.patch.ts` | `PATCH`     | `/tasks/:id/complete` | `/*`, `/tasks`  | **Breakout route**: skips `tasks/$id.ts` layout |
| `-helpers.ts`                  | N/A         | N/A                   | None            | Ignored file (leading dash `-`)                 |
| `-utils/helpers.ts`            | N/A         | N/A                   | None            | Ignored folder (leading dash `-`)               |

---

## 2. Path Syntax Rules

### Dynamic Parameters (`$param`)

- A dollar sign followed by a name indicates a path parameter: `$id` -> `:id`, `$slug` -> `:slug`.
- In handlers, path parameters are on `req.params` (e.g. `req.params.id`). They default to `string` unless refined with `.params(schema)`.

### Wildcards / Splats (`$`)

- A standalone dollar sign indicates a catch-all splat parameter: `files.$.get.ts` -> `/files/*`.
- Splat parameters are captured into `req.params._splat`.

### Escaped Characters (`[.]`)

- `sitemap[.]xml.get.ts` maps to `/sitemap.xml`.

### Pathless Groups (`_group`)

- `_auth.login.post.ts` -> `POST /login`, layout `/_auth/*`.

### Breakout Routes (`segment_`)

- `posts_.$id.edit.get.ts` skips `posts.ts` layout, still inherits `/*`.

### Ignored Files & Directories (`-`)

- Leading dash files/folders are ignored by the scanner (co-located helpers/tests).

---

## 3. Route Structuring Guidelines

```ts
// src/routes/users/$id.get.ts
import { json, notFound } from "@taserjs/router/reply";
import { t } from "@taserjs/router";
import { z } from "zod";

export default t
  .get("/users/:id")
  .params(z.object({ id: z.string().uuid() }))
  .query(z.object({ includePosts: z.coerce.boolean().default(false) }))
  .handler(async ({ req, ctx }) => {
    const user = await ctx.db.getUser(req.params.id);
    if (!user) return notFound({ message: "User not found" });
    return json(user);
  });
```

## 4. Best Practices

- Prefer nested directories for larger modules; use flat dot notation only for tiny subtrees.
- Keep routes focused; put shared auth/cookies/logging in layouts (`cookie()` mount pattern in [layouts-and-middleware.md](layouts-and-middleware.md)).
- After adding routes, regenerate `routes.gen.ts` before relying on client or ambient types.
