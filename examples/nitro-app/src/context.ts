import { createContext } from "@taserjs/router";

export const context = createContext({
  request: () => ({
    requestId: crypto.randomUUID(),
  }),
});
