import { describe, expect, it } from "vitest";

import { layoutScaffoldSource, routeScaffoldSource } from "../../src/index.js";

describe("route scaffold templates", () => {
  it("emits GET route stub with export default", () => {
    const source = routeScaffoldSource("/posts", "GET");

    expect(source).toContain("import { t } from '@taserjs/router'");
    expect(source).toContain("import { json } from '@taserjs/router/reply'");
    expect(source).toContain("export default t.get('/posts').handler(");
    expect(source).toContain("return json({ ok: true })");
  });

  it("emits POST route stub with export default", () => {
    const source = routeScaffoldSource("/todo", "POST");

    expect(source).toContain("import { t } from '@taserjs/router'");
    expect(source).toContain("import { json } from '@taserjs/router/reply'");
    expect(source).toContain("export default t.post('/todo').handler(");
  });

  it("emits QUERY route stub with export default", () => {
    const source = routeScaffoldSource("/search", "QUERY");

    expect(source).toContain("import { t } from '@taserjs/router'");
    expect(source).toContain("import { json } from '@taserjs/router/reply'");
    expect(source).toContain("export default t.query('/search').handler(");
  });

  it("emits t.layout layout stub with export default", () => {
    const source = layoutScaffoldSource("settings");

    expect(source).toContain("import { t } from '@taserjs/router'");
    expect(source).toContain("export default t.layout('settings').use((_ctx, next) => next())");
  });
});
