import { createTaserApp } from "@taserjs/router";
import { context } from "./context";
import { notFound } from "@taserjs/router/reply";

export const t = createTaserApp({
  response: {validate: true},
}).context(context).notFound(() => notFound({message: 'Not Found'}))