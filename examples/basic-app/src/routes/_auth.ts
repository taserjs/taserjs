import { t } from "@taserjs/router";

export default t.layout("_auth").use((_ctx, next) => next({ token: "123" }));
