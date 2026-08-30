import { z } from "zod";

import { middleware, t } from "../../src/index.js";

export const IndexLayout = t.layout("index").use(
  middleware()
    .query(
      z.object({
        page: z.coerce.number().int().positive().default(1),
      }),
    )
    .handler((_ctx, next) => next({ user: "test" })),
);

export { t };
