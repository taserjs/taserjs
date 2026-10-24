// @ts-nocheck
import { FastResponse, serve } from "@taserjs/runtime/serve";
import { app as taserApp } from "./routes.gen.js";

globalThis.Response = FastResponse;

export { taserApp as app };
serve(taserApp);
