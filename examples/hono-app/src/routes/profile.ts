import { t } from "@taserjs/router";

export default t.layout("/profile").use((_ctx, next) => next({ userId: "123" }));
