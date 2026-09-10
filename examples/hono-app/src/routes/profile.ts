import { t } from "@taserjs/router";

export default t.layout("/profile/*").use(async (_ctx, next) => next({ userId: "123" }));
