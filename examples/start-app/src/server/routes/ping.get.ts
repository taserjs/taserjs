import { json } from "@taserjs/router/reply";
import { t } from "#taserjs/router";

const GET = t.get("/ping");

export const Route = GET.handler(() => json({ pong: true, from: "taser" }));
