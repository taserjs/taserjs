import { createContext } from "@taserjs/router";

export const context = createContext({
  boot: () => ({
    logger: console,
  }),
  request: () => ({
    requestId: crypto.randomUUID(),
  })
})