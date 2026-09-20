// @ts-nocheck
import { FastResponse, serve } from "@taserjs/runtime/serve";
globalThis.Response = FastResponse;
import { app } from "./routes.gen";

serve(app);
