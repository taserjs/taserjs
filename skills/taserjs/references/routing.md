# Taser.js File-Based Routing

This guide details route file naming rules, parameter extraction, route groups, splats, and breakout conventions in Taser.js.

---

## 1. Routing Conventions & Cheat Sheet

Routes are defined as files inside `src/routes/` (or the configured `serverDir/routes`). Every route file MUST include an HTTP verb suffix (e.g. `.get.ts`, `.post.ts`, `.put.ts`, `.patch.ts`, `.delete.ts`, `.query.ts`). Non-verb files in the routes directory are treated as layouts.

| File Name                      | HTTP Method | Resolved URL          | Layouts Applied | Description                                     |
| :----------------------------- | :---------- | :-------------------- | :-------------- | :---------------------------------------------- |
| `index.get.ts`                 | `GET`       | `/`                   | `/*`            | Root index route                                |
| `[index].get.ts`               | `GET`       | `/index`              | `/index`        | Literal /index path                             |
| `users.get.ts`                 | `GET`       | `/users`              | `/*`            | Static segment                                  |
| `users.index.get.ts`           | `GET`       | `/users`              | `/*`, `/users`  | Explicit nested index                           |
| `users/$id.get.ts`             | `GET`       | `/users/:id`          | `/*`, `/users`  | Dynamic URL parameter                           |
| `users.$id.posts.get.ts`       | `GET`       | `/users/:id/posts`    | `/*`, `/users`  | Flat dot-notation nested route                  |
| `files.$.get.ts`               | `GET`       | `/files/*`            | `/*`, `/files`  | Wildcard splat (`ctx.params._splat`)            |
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
- In handler functions, path parameters are accessible via `ctx.params.id`. They default to `string` unless refined with `.params(schema)`.

### Wildcards / Splats (`$`)

- A standalone dollar sign indicates a catch-all splat parameter: `files.$.get.ts` -> `/files/*`.
- Splat parameters are captured into `ctx.params._splat`.

### Escaped Characters (`[.]`)

- Wrap special characters in brackets to treat them as literal filename characters: `sitemap[.]xml.get.ts` maps to `/sitemap.xml`.

### Pathless Groups (`_group`)

- Segments starting with an underscore `_` define logical layout boundaries without adding a segment to the resolved URL path:
  - File: `src/routes/_auth.login.post.ts`
  - Resolved URL: `POST /login`
  - Applied Layout: `src/routes/_auth.ts` or `src/routes/_auth/$.ts` (`/_auth/*`)

### Breakout Routes (`segment_`)

- Suffixing a segment name with an underscore `_` tells the router to bypass that specific segment's layout while retaining higher-level layouts:
  - `src/routes/posts_.$id.edit.get.ts` skips `src/routes/posts.ts` layout, but still inherits `src/routes/$.ts` (`/*`).

### Ignored Files & Directories (`-`)

- Any file or directory with a leading dash (`-`) is ignored by the route scanner. Use this to place co-located utilities, unit tests, or helper functions beside routes:
  - `src/routes/-helpers.ts`
  - `src/routes/users/-validators.ts`

---

## 3. Route Structuring Guidelines

- **Nested Directories vs Flat Dot Notation**:
  - Prefer nested directory structures (e.g. `src/routes/users/$id/posts.get.ts`) when logical grouping is needed or when building larger modules with dedicated layouts and helpers.
  - Only reach for dot notation (e.g. `users.$id.posts.get.ts`) when a sub-tree contains fewer than 3 files.
- **Route Definition Pattern**:
  ```ts
  // src/routes/users/$id.get.ts
  import { json, notFound } from "@taserjs/router/reply";
  import { t } from "@taserjs/router";
  import { z } from "zod";

  export default t
    .get("/users/:id")
    .params(z.object({ id: z.string().uuid() }))
    .query(z.object({ includePosts: z.coerce.boolean().default(false) }))
    .handler(async (ctx) => {
      const user = await ctx.db.getUser(ctx.params.id);
      if (!user) return notFound({ message: "User not found" });
      return json(user);
    });
  ```

## 4. Best Practices

- **Keep routes focused**: A route file should contain only the logic for its endpoint.
- **Extract shared logic**: Use layouts and middleware for authentication, validation, and other cross-route concerns — not inline boilerplate in every route file.
- **Route-specific preprocessing**: Chain middleware in the route file only when the logic applies to that route alone.
