// @ts-nocheck
import { FastResponse } from "srvx";
globalThis.Response = FastResponse;
import { serve } from "srvx/node";
import { app } from "./routes.gen.js";

serve(app);
