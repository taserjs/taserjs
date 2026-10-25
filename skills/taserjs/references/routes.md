# Route Conventions & File Naming

Read when creating, naming, or nesting route endpoints, defining dynamic parameters, optional parameters, wildcards, layouts, pathless groups, or breakout routes.

## Route File Naming & URL Mapping

Taser.js maps files in `${routesDir}` to REST endpoints by parsing path segments, parameter prefixes, and HTTP verb suffixes.

| File Path                      | HTTP Method | Endpoint URL          | Parameter Access                                 |
| :----------------------------- | :---------- | :-------------------- | :----------------------------------------------- |
| `index.get.ts`                 | `GET`       | `/`                   | —                                                |
| `[index].get.ts`               | `GET`       | `/index`              | —                                                |
| `users.get.ts`                 | `GET`       | `/users`              | —                                                |
| `users/$id.get.ts`             | `GET`       | `/users/:id`          | `req.params.id`                                  |
| `users.$id.posts.get.ts`       | `GET`       | `/users/:id/posts`    | `req.params.id`                                  |
| `posts.{-$category}.get.ts`    | `GET`       | `/posts/:category?`   | `req.params.category` (`undefined` when omitted) |
| `files.$.get.ts`               | `GET`       | `/files/*`            | `req.params._splat`                              |
| `sitemap[.]xml.get.ts`         | `GET`       | `/sitemap.xml`        | —                                                |
| `_auth.login.post.ts`          | `POST`      | `/login`              | Pathless group; inherits `_auth.ts` layout       |
| `posts_.$id.edit.get.ts`       | `GET`       | `/posts/:id/edit`     | Breakout route; skips `posts.ts` layout          |
| `tasks/$id_.complete.patch.ts` | `PATCH`     | `/tasks/:id/complete` | Breakout route; skips `tasks/$id.ts` layout      |

### Ignored Files

Files or directories prefixed with a hyphen are ignored by the route scanner:

- `-helpers.ts` (ignored utility file)
- `-utils/` (ignored folder)

### Route Collisions

Two files mapping to the exact same path and method (for example `users.get.ts` and `users.index.get.ts`) trigger a route generation collision error during `taser generate`.

## Route Builder Syntax

Import `t` from `@taserjs/router` to define route handlers:

```ts
import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";

export default t.get("/users/:id").handler(({ req }) => {
  return json({ id: req.params.id });
});
```

### Full Path in Subdirectories

When a route file lives inside a subdirectory, the builder path argument must match the full path:

- File `src/routes/lab/items/$id.put.ts` uses `t.put("/lab/items/:id")`.
- The CLI generator validates the file name against the builder path and prints the expected path if they diverge.

### Supported Builder Verbs

| Method    | Syntax                           | Description                         |
| :-------- | :------------------------------- | :---------------------------------- |
| `GET`     | `t.get(path)` or `t.query(path)` | Standard GET endpoint               |
| `POST`    | `t.post(path)`                   | POST endpoint                       |
| `PUT`     | `t.put(path)`                    | PUT endpoint                        |
| `PATCH`   | `t.patch(path)`                  | PATCH endpoint                      |
| `DELETE`  | `t.delete(path)`                 | DELETE endpoint                     |
| `OPTIONS` | `t.options(path)`                | OPTIONS endpoint                    |
| `ALL`     | `t.all(path)`                    | Matches all HTTP methods on path    |
| `ANY`     | `t.any(path, ["GET", "POST"])`   | Matches specified subset of methods |

## Layouts & Scoped Middleware

Layout files wrap routes within their hierarchy and must export `t.layout(...)`.

### Layout IDs Must End in `/*`

The route generator verifies that layout IDs end with `/*`:

```ts
// src/routes/posts.ts or src/routes/posts/$.ts
import { t } from "@taserjs/router";

export default t.layout("/posts/*").use(async ({ req }, next) => {
  return next();
});
```

- Root layout: `src/routes/$.ts` -> `t.layout("/*")`
- Directory layout: `src/routes/admin.ts` -> `t.layout("/admin/*")`
- Dynamic param layout: `src/routes/tasks/$id.ts` -> `t.layout("/tasks/:id/*")`
- Pathless layout: `src/routes/_auth.ts` -> `t.layout("/_auth/*")`

### Breakout Routes (`_`)

To exclude an endpoint from an enclosing layout without changing its public URL, suffix the segment preceding the breakout with an underscore:

- `posts_.$id.edit.get.ts` matches `/posts/:id/edit` but skips the `posts.ts` (`/posts/*`) layout.
- `tasks/$id_.complete.patch.ts` matches `/tasks/:id/complete` but skips the `tasks/$id.ts` (`/tasks/:id/*`) layout.

## Verify

1. Run `taser generate` to inspect `RouteByPathMethod` in `${serverDir}/.taserjs/routes.gen.ts`.
2. Ensure no route collision errors or layout ID mismatch errors are emitted.
3. Test endpoints with `curl -i http://localhost:3000/<route>`.
