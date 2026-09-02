import { t } from "@taserjs/router";

export default t.layout("/admin").use((_ctx, next) => next({ adminOnly: "*" }));
